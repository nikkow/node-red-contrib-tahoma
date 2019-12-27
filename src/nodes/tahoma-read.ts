import { NodeProperties, Red } from 'node-red';
import * as request from 'request';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-read', function(this, props) {
        const config = props as any;
        RED.nodes.createNode(this, config);

        this.device = config.device;
		this.tahomabox = config.tahomabox;

        this.on('input', (msg) => {
            var configNode = RED.nodes.getNode(this.tahomabox) as any;
            request({
                url: 'https://api.somfy.com/api/v1/device/' + this.device,
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + configNode.accesstoken
                }
            }, (err, response, data) => {
                // TODO: Handle errors properly and token refresh
                msg.payload = JSON.parse(data);
                this.send(msg);
            });
		});
    });
};
