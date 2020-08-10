import { Red } from 'node-red';
import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance, AxiosError } from 'axios';
import { INetworkError } from '../interfaces/network-error';
import { ICommand } from '../interfaces/command';
import { IDevice } from '../interfaces/device';
import { ICommandExecutionResponse } from '../interfaces/command-execution-response';
import { HttpResponse } from '../enums/http-response.enum';

export class SomfyApi {
    private static SOMFY_BASE_URL: string = 'https://api.somfy.com/api/v1';
    private static SOMFY_AUTH_URL: string = 'https://accounts.somfy.com/oauth/oauth/v2';
    private configNode;
    private axiosInstance: AxiosInstance;

    constructor(private readonly RED: Red, configNode, private readonly account: string) {
        this.axiosInstance = axios.create();
        this.configNode = configNode;

        this.axiosInstance.interceptors.request.use(
            (request: AxiosRequestConfig) => {
                request.headers['Authorization'] = `Bearer ${this.getAccessToken()}`;
                return request;
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            (error: INetworkError) => {
                if (error.response.status !== HttpResponse.UNAUTHORIZED) {
                    return Promise.reject(error);
                }

                const refreshTokenUrl = `${SomfyApi.SOMFY_AUTH_URL}/token?client_id=${this.configNode['apikey']}&client_secret=${this.configNode['apisecret']}&grant_type=refresh_token&refresh_token=${this.getRefreshToken()}`;

                return axios({
                        url: refreshTokenUrl,
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    })
                    .then(response => {
                        this.configNode['accesstoken'] = response.data.access_token;
                        this.configNode['refreshtoken'] = response.data.refresh_token;

                        this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;

                        error.hasRefreshedToken = true;
                        return Promise.reject(error);
                    })
                    .catch((refreshTokenRequestError: AxiosError) => {
                        if (refreshTokenRequestError.response.status === HttpResponse.BAD_REQUEST) {
                            const refreshTokenRequestErrorData = refreshTokenRequestError.response.data;
                            if (refreshTokenRequestErrorData.hasOwnProperty('message') && refreshTokenRequestErrorData.message === 'error.invalid.grant') {
                                this.configNode['accesstoken'] = null;
                                this.configNode['refreshtoken'] = null;
                                error.isRefreshTokenExpired = true;
                            }
                        }

                        return Promise.reject(error);
                    });
            }
        );
    }

    private _request(options: AxiosRequestConfig): Promise<any> {
        return this.axiosInstance(options)
            .then((response: AxiosResponse) => {
                if (response.status !== HttpResponse.OK) {
                    return 'http_error';
                }

                return response.data;
            })
            .catch((error: INetworkError) => {
                return error.hasRefreshedToken ? this._request(options) : Promise.reject(error);
            });
    }

    private getAccessToken(): string {
        return this.configNode['accesstoken'];
    }

    private getRefreshToken(): string {
        return this.configNode['refreshtoken'];
    }

    public getDevice(device: string): Promise<IDevice> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/device/${device}`,
            method: 'GET'
        });
    }

    public getSites(): Promise<any> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/site`,
            method: 'GET'
        });
    }

    public getDevicesForSite(site: string): Promise<IDevice[]> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/site/${site}/device`,
            method: 'GET'
        });
    }

    public sendCommandToDevice(device: string, command: ICommand): Promise<ICommandExecutionResponse> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/device/${device}/exec`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: command
        });
    }
}
