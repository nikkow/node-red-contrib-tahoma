import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { ICommand } from '../interfaces/command';
import { IDevice } from '../interfaces/device';
import { ICommandExecutionResponse } from '../interfaces/command-execution-response';
import { HttpResponse } from '../enums/http-response.enum';
import { Node } from 'node-red';
import * as https from 'https';

const TAHOMA_PORT = 8443;
const SOMFY_OVERKIZ_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDPDCCAiSgAwIBAgIJAOvswclbF4QnMA0GCSqGSIb3DQEBCwUAMEsxEDAOBgNV
BAoTB092ZXJraXoxEDAOBgNVBAsTB1Jvb3QgQ0ExGDAWBgNVBAMTD092ZXJraXog
Um9vdCBDQTELMAkGA1UEBhMCRlIwHhcNMTYwNDI3MTI1ODE1WhcNMzYwNDI3MTI1
ODE1WjBLMRAwDgYDVQQKEwdPdmVya2l6MRAwDgYDVQQLEwdSb290IENBMRgwFgYD
VQQDEw9PdmVya2l6IFJvb3QgQ0ExCzAJBgNVBAYTAkZSMIIBIjANBgkqhkiG9w0B
AQEFAAOCAQ8AMIIBCgKCAQEAsszRfbcNCEoD9ZfzTbXfuMK8CrXGqBR/ZOCk4guN
aRKqZ/rLQm3V6Q+dlJ/8qle5J3KN5bZmqT4qXKHwJsaOiLfPyAptSM6vuIlls2N+
UsKkv3m5+gTyLaSGMS4wh2GoOCa21V9t5wYUQnoFaQByVNyl+kkrWLpKw5gQasU0
xkVsjAVKgkkb3puBl7sZgiSoz97I9U9JUkg3spH0I84CZRI+JejioDHvkZEyf83j
+QFxSTV/hZkUwUY/X0zt2dTZuliCTePeCdANryo6+9TbBp98j/SB1s59FcO8NSSK
sV07rTFlM9/soko2/J0aTtXHE86wFq7vfFVZzZxsQpIBbwIDAQABoyMwITAPBgNV
HRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQsFAAOCAQEA
GU7xUWlZZEVnEK0k3Z1FoRl9xA7cLOiDVCQ5qQDFfQgGpMtXv1PKsQNZ6T6tZN3d
bdzsqcQXtLhXknz6aGBZNR4g6liQhVuCaiyURaI+LM2KuSZnbixs3+1SPBvxHrJh
/gOsxctxq+0DALnOK9qbGl6N5DtjM/EC5Qve71c+UVTEcJjJ3L2S1Ne+PxDOJuUC
JsOLUk96G+uLn6CQB5Wu8fYrkWAjF3yrxkCoZCqOvVrnbL77vXmz2mlqNHSJt3Ur
ndWJLVvrRFKdSG6WiNCh/Q+ARQAorN60JD9x8+IyXRGvlZl7KVeRduE2rjZuom7h
QLMnmaF+oFW5mnhh9gu6Gg==
-----END CERTIFICATE-----`;

function isIpv4Address(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function createSomfyHttpsAgent(skipHostnameCheck = false): https.Agent {
  const options: https.AgentOptions = {
    ca: SOMFY_OVERKIZ_ROOT_CA,
  };

  if (skipHostnameCheck) {
    options.checkServerIdentity = () => undefined;
  }

  return new https.Agent(options);
}

function normalizeHost(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '');
}

export class SomfyApi {
  private configNode: Node;
  private axiosInstance: AxiosInstance;

  constructor(configNode: Node) {
    this.configNode = configNode;
    const gatewayHost = this.getGatewayHost();
    const shouldSkipHostnameCheck = isIpv4Address(gatewayHost);
    this.axiosInstance = axios.create({
      httpsAgent: createSomfyHttpsAgent(shouldSkipHostnameCheck),
    });

    this.axiosInstance.interceptors.request.use(
      (request: InternalAxiosRequestConfig) => {
        request.headers = AxiosHeaders.from(request.headers);
        request.headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
        return request;
      },
    );

    if (shouldSkipHostnameCheck) {
      this.configNode.warn(
        `TLS hostname verification is bypassed for IP host "${gatewayHost}". CA validation is still enforced.`,
      );
    }
  }

  static async validateConnection(
    host: string,
    token: string,
  ): Promise<{
    valid: boolean;
    gatewayId?: string;
    httpStatus?: number;
    errorMessage?: string;
    errorCode?: string;
  }> {
    const normalizedHost = normalizeHost(host || '');
    const normalizedToken = (token || '').trim();
    if (!normalizedHost || !normalizedToken) {
      return {
        valid: false,
        httpStatus: HttpResponse.BAD_REQUEST,
        errorMessage: 'Gateway IP/host and token are required.',
      };
    }

    const requestValidation = async (skipHostnameCheck: boolean) =>
      axios({
        url: `https://${normalizedHost}:${TAHOMA_PORT}/enduser-mobile-web/1/enduserAPI/setup/gateways`,
        method: 'GET',
        timeout: 5000,
        httpsAgent: createSomfyHttpsAgent(skipHostnameCheck),
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
        },
      }).then((response: AxiosResponse) => {
        if (response.status !== HttpResponse.OK) {
          return {
            valid: false,
            httpStatus: response.status,
            errorMessage: `Unexpected HTTP status ${response.status}.`,
          };
        }

        const gateways = Array.isArray(response.data) ? response.data : [];
        const firstGateway = gateways[0];
        return {
          valid: true,
          gatewayId: firstGateway ? firstGateway.gatewayId : undefined,
        };
      });

    try {
      return await requestValidation(false);
    } catch (error) {
      const axiosError = error as AxiosError;
      const isHostNameMismatch =
        axiosError.code === 'ERR_TLS_CERT_ALTNAME_INVALID';

      if (isHostNameMismatch && isIpv4Address(normalizedHost)) {
        try {
          const fallbackValidation = await requestValidation(true);
          if (fallbackValidation.valid) {
            return fallbackValidation;
          }
        } catch (fallbackError) {
          const fallbackAxiosError = fallbackError as AxiosError;
          return {
            valid: false,
            httpStatus:
              fallbackAxiosError.response &&
              typeof fallbackAxiosError.response.status === 'number'
                ? fallbackAxiosError.response.status
                : HttpResponse.SERVER_ERROR,
            errorCode: fallbackAxiosError.code,
            errorMessage:
              fallbackAxiosError.message ||
              'Validation failed while retrying with relaxed hostname check.',
          };
        }
      }

      return {
        valid: false,
        httpStatus:
          axiosError.response && typeof axiosError.response.status === 'number'
            ? axiosError.response.status
            : isHostNameMismatch
              ? HttpResponse.BAD_REQUEST
              : HttpResponse.SERVER_ERROR,
        errorCode: axiosError.code,
        errorMessage:
          isHostNameMismatch && !isIpv4Address(normalizedHost)
            ? 'TLS hostname mismatch. Use the gateway IP or matching hostname from discovery.'
            : axiosError.message || 'Validation failed.',
      };
    }
  }

  private _request(options: AxiosRequestConfig): Promise<any> {
    return this.axiosInstance(options)
      .then((response: AxiosResponse) => {
        if (response.status !== HttpResponse.OK) {
          return 'http_error';
        }

        return response.data;
      })
      .catch((error: AxiosError) => {
        const status =
          error.response && typeof error.response.status === 'number'
            ? ` HTTP ${error.response.status}`
            : '';
        const code = error.code ? ` (${error.code})` : '';
        this.configNode.error(
          `[SomfyApi] Request failed${status}${code} for ${options.url || 'unknown URL'}: ${error.message}`,
        );
        throw error;
      });
  }

  private getAccessToken(): string {
    return this.configNode['token'];
  }

  private getGatewayUrl(): string {
    const host = this.getGatewayHost();
    return `https://${host}:${TAHOMA_PORT}/enduser-mobile-web/1/enduserAPI`;
  }

  private getGatewayHost(): string {
    const host = this.configNode['host'];
    if (typeof host === 'string' && host.trim().length > 0) {
      return normalizeHost(host);
    }

    const legacyUrl = this.configNode['url'];
    if (typeof legacyUrl === 'string' && legacyUrl.trim().length > 0) {
      return normalizeHost(legacyUrl);
    }

    return '';
  }

  public getDevice(device: string): Promise<IDevice> {
    const sanitizedDeviceUrl = encodeURIComponent(device);
    return this._request({
      url: `${this.getGatewayUrl()}/setup/devices/${sanitizedDeviceUrl}`,
      method: 'GET',
    });
  }

  public getDevices(): Promise<IDevice[]> {
    return this._request({
      url: `${this.getGatewayUrl()}/setup/devices`,
      method: 'GET',
    });
  }

  public execute(
    device: string,
    command: ICommand,
  ): Promise<ICommandExecutionResponse> {
    return this._request({
      url: `${this.getGatewayUrl()}/exec/apply`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        label: 'Node-RED Tahoma Command',
        actions: [
          {
            commands: [command],
            deviceURL: device,
          },
        ],
      },
    });
  }

  public getStatusForExecutionId(execId: string) {
    return this._request({
      url: `${this.getGatewayUrl()}/exec/current/${execId}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
