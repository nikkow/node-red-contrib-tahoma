import { AxiosError } from 'axios';

export interface INetworkError extends AxiosError {
    hasRefreshedToken?: boolean;
    isRefreshTokenExpired?: boolean;
}
