import * as nodered from 'node-red';
import { SomfyApi } from '../core/somfy-api';
import { HttpResponse } from '../enums/http-response.enum';
import { TahomaConfigNodeDef } from './tahoma-config.def';
import { IDevice } from '../interfaces/device';
import { DiscoveryService } from '../core/discovery';

const TAHOMA_PORT = 8443;

function normalizeHost(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export = (RED: nodered.NodeAPI): void => {
  RED.nodes.registerType(
    'tahoma-config',
    function (
      this: nodered.Node<TahomaConfigNodeDef>,
      props: TahomaConfigNodeDef,
    ) {
      RED.nodes.createNode(this, props);
      const host = normalizeHost(props.host || props.url || '');
      this['host'] = host;
      this['name'] = props.connectionname || '';
      this['token'] = props.token;
      this['url'] = host ? `https://${host}:${TAHOMA_PORT}` : '';
    },
  );

  RED.httpAdmin.post('/somfy/discover', async (request, response) => {
    try {
      const { timeoutMs } = request.body || {};
      const timeout = Number(timeoutMs);
      const discoveryTimeoutMs =
        Number.isFinite(timeout) && timeout > 0
          ? Math.min(Math.floor(timeout), 10000)
          : 3000;

      const _discovery = new DiscoveryService();
      const gateways = await _discovery.discoverGateways(discoveryTimeoutMs);
      response.json({ gateways });
    } catch (error) {
      RED.log.error(
        `[node-red-contrib-tahoma] Discovery failed: ${(error as Error).message}`,
      );
      response.status(HttpResponse.SERVER_ERROR);
      response.send();
    }
  });

  RED.httpAdmin.post('/somfy/validate', async (request, response) => {
    try {
      const { host, token } = request.body || {};
      const normalizedHost =
        typeof host === 'string' ? normalizeHost(host) : '';
      const normalizedToken = typeof token === 'string' ? token.trim() : '';

      if (!normalizedHost || !normalizedToken) {
        response.status(HttpResponse.BAD_REQUEST);
        response.send();
        return;
      }

      const validation = await SomfyApi.validateConnection(
        normalizedHost,
        normalizedToken,
      );
      if (!validation.valid) {
        RED.log.warn(
          `[node-red-contrib-tahoma] Validation failed for "${normalizedHost}". status=${validation.httpStatus || 'n/a'} code=${validation.errorCode || 'n/a'} message=${validation.errorMessage || 'n/a'}`,
        );
        response
          .status(validation.httpStatus || HttpResponse.UNAUTHORIZED)
          .json({
            error:
              validation.errorMessage ||
              'Validation failed. Verify the IP address, token, and that Developer Mode is enabled.',
            code: validation.errorCode,
          });
        return;
      }

      response.json(validation);
    } catch {
      RED.log.error(
        `[node-red-contrib-tahoma] Unexpected error during validation.`,
      );
      response.status(HttpResponse.SERVER_ERROR);
      response.send();
    }
  });

  RED.httpAdmin.get('/somfy/:account/devices', function (req, res) {
    const configNode = RED.nodes.getNode(req.params.account);
    const somfyApiClient = new SomfyApi(configNode);

    somfyApiClient
      .getDevices()
      .then((devices: IDevice[]) => {
        res.json(
          devices
            .filter((device) => {
              return (
                device.controllableName !== 'io:StackComponent' &&
                device.enabled &&
                device.available &&
                device.synced
              );
            })
            .map((device) => {
              return {
                id: device.deviceURL,
                name: device.label,
              };
            }),
        );
      })
      .catch(() => {
        res.status(HttpResponse.SERVER_ERROR);
        res.send();
      });
  });
};
