import { Red } from 'node-red';
import * as fs from 'fs';
import { SomfyApi } from '../core/somfy-api';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-config', function(this, props: any ) {
        RED.nodes.createNode(this, props);
        this.apikey = props.apikey;
        this.apisecret = props.apisecret;
        this.accesstoken = props.accesstoken;
        this.refreshtoken = props.refreshtoken;
    });

    RED.httpAdmin.get('/somfy/callback', (request, response) => {
        const callbackBody = fs.readFileSync(__dirname + '/somfy-callback.html');
        response.header('Content-Type', 'text/html');
        response.write(callbackBody.toString());
        response.send();
    });

    RED.httpAdmin.get('/somfy/:account/sites', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account);
        const somfyApiClient = new SomfyApi(configNode);

        somfyApiClient.getSites()
            .then((sites: any) => res.json(sites))
            .catch(() => {
                res.status(500);
                res.send();
            });
    });

    RED.httpAdmin.get('/somfy/:account/site/:siteid/devices', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account);
        const somfyApiClient = new SomfyApi(configNode);

        somfyApiClient.getDevicesForSite(req.params.siteid)
            .then((devices: any) => res.json(devices))
            .catch(() => {
                res.status(500);
                res.send();
            });
    });
};
