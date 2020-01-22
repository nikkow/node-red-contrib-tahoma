import { SomfyApi } from '../core/somfy-api';
import { NodeProperties, Red } from 'node-red';
import { INodeConfiguration } from '../interfaces/node-config';
import { IMessage } from '../interfaces/message';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-read', function (this, props) {
        // TODO: The two typings below are quite ugly, but this is the only way I managed to properly cast them.
        const config: INodeConfiguration = props as unknown as INodeConfiguration;
        RED.nodes.createNode(this, (config as unknown as NodeProperties));

        this.device = config.device;
        this.site = config.site;
        this.tahomabox = config.tahomabox;

        this.on('input', (msg: IMessage) => {
            const somfyApiClient = new SomfyApi(RED, this.context, this.tahomabox);
            somfyApiClient.getDevice(this.device)
                .then((deviceData) => {
                    msg.payload = deviceData;
                    this.send(msg);
                })
                .catch(() => {
                    msg.payload = null;
                    this.send(msg);
                });
        });
    });
};
