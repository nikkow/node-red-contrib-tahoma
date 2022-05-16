import * as nodered from 'node-red';
import { SomfyApi } from '../core/somfy-api';
import { HttpResponse } from '../enums/http-response.enum';
import { TahomaConfigNodeDef } from './tahoma-config.def';
import { IDevice } from '../interfaces/device';

export = (RED: nodered.NodeAPI): void => {
  RED.nodes.registerType(
    'tahoma-config',
    function (
      this: nodered.Node<TahomaConfigNodeDef>,
      props: TahomaConfigNodeDef,
    ) {
      RED.nodes.createNode(this, props);
      this['pin'] = props.pin;
      this['name'] = props.name;
      this['token'] = props.token;
    },
  );

  RED.httpAdmin.post('/somfy/get-token', async (request, response) => {
    const { userId, userPassword, tahomaPin } = request.body;
    const token = await SomfyApi.getLocalToken(userId, userPassword, tahomaPin);

    if (token === null) {
      response.status(HttpResponse.BAD_REQUEST);
      response.send();
      return;
    }

    response.json({ token });
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
