import { NodeProperties } from 'node-red';

export interface ISomfyCredentialsProperties extends NodeProperties {
    apikey: string;
    apisecret: string;
    accesstoken: string;
    refreshtoken: string;
}
