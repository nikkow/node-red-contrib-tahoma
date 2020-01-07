import { Red } from 'node-red';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { INetworkError } from '../interfaces/network-error';
import { ICommand } from '../interfaces/command';

export class SomfyApi {
    private static SOMFY_BASE_URL: string = 'https://api.somfy.com/api/v1';
    private static SOMFY_AUTH_URL: string = 'https://accounts.somfy.com/oauth/oauth/v2';
    private static HTTP_OK: number = 200;
    private static HTTP_UNAUTHORIZED: number = 401;
    private context;

    constructor(private readonly RED: Red, context: any, private readonly account: string) {
        this.context = context;

        const configNode = this.RED.nodes.getNode(account) as any; // TODO: Type this

        axios.defaults.headers.common["Authorization"] = `Bearer ${this.getAccessToken()}`;

        axios.interceptors.response.use(
            (response: AxiosResponse) => {
                return response;
            },
            (error: INetworkError) => {
                if (error.response.status !== SomfyApi.HTTP_UNAUTHORIZED) {
                    return Promise.reject(error);
                }

                return axios
                    .get(SomfyApi.SOMFY_AUTH_URL + '/token?client_id='+ configNode.apikey +'&client_secret='+ configNode.apisecret +'&grant_type=refresh_token&refresh_token=' + this.getRefreshToken())
                    .then(response => {
                        this.context().global.set('somfy_api_access_token', response.data.access_token);
                        this.context().global.set('somfy_api_refresh_token', response.data.refresh_token);

                        axios.defaults.headers.common["Authorization"] = `Bearer ${response.data.access_token}`;

                        error.hasRefreshedToken = true;
                        return Promise.reject(error);
                    });
            }
        );
    }

    private _request(options: AxiosRequestConfig): Promise<any> {
        return axios(options)
            .then((response: AxiosResponse) => {
                if (response.status !== SomfyApi.HTTP_OK) {
                    return 'http_error';
                }

                return response.data;
            })
            .catch((error: INetworkError) => {              
                return error.hasRefreshedToken ? this._request(options) : Promise.reject(error)
            });
    }

    private getAccessToken(): string {
        return this.context().global.get('somfy_api_access_token');
    }

    private getRefreshToken(): string {
        return this.context().global.get('somfy_api_refresh_token');
    }

    public getDevice(device: string): Promise<any> { // TODO: Type device
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/device/${device}`,
            method: 'GET'
        })
    }

    public getSites(): Promise<any> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/site`,
            method: 'GET'
        });
    }

    public getDevicesForSite(site: string): Promise<any> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/site/${site}/device`,
            method: 'GET'
        });
    }

    public sendCommandToDevice(device: string, command: ICommand): Promise<any> {
        return this._request({
            url: `${SomfyApi.SOMFY_BASE_URL}/device/${device}/exec`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: command
        })
    }
}
