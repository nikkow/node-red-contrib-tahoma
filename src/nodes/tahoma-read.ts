import { SomfyApi } from '../core/somfy-api';
import { NodeProperties, Red, Node } from 'node-red';
import { INodeConfiguration } from '../interfaces/node-config';
import { IMessage } from '../interfaces/message';
import { INetworkError } from '../interfaces/network-error';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-read', function (this, props) {
        // TODO: The two typings below are quite ugly, but this is the only way I managed to properly cast them.
        const config: INodeConfiguration = props as unknown as INodeConfiguration;
        RED.nodes.createNode(this, (config as unknown as NodeProperties));

        this.device = config.device;
        this.site = config.site;
        this.tahomabox = config.tahomabox;

        this.on('input', (msg: IMessage) => {
            const configNode = RED.nodes.getNode(this.tahomabox) as Node;
            const somfyApiClient = new SomfyApi(configNode);

            somfyApiClient.getDevice(this.device)
                .then((deviceData) => {
                    msg.payload = deviceData;
                    this.send(msg);
                })
                .catch((error: INetworkError) => {
                    if (error.isRefreshTokenExpired) {
                        this.error('Session has expired and refresh token is no longer active. You need to login again through the config node to perform this action.');
                        this.status({
                            fill: 'red',
                            shape: 'dot',
                            text: 'Session expired. See debug tab for more info'
                        });
                    }

                    msg.payload = null;
                    this.send(msg);
                });
        });
    });
};
