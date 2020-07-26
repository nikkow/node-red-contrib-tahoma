import { Red } from 'node-red';
import * as fs from 'fs';
import { SomfyApi } from '../core/somfy-api';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma-config', function(this, props: any ) {
        // const config = props as ISomfyCredentialsProperties;
        RED.nodes.createNode(this, props);
        this.apikey = props.apikey;
        this.apisecret = props.apisecret;
        this.accesstoken = props.accesstoken;
        this.refreshtoken = props.refreshtoken;
    });

    RED.httpAdmin.get('/somfy/callback', (request, response) => {
        const CALLBACK_BODY = fs.readFileSync(__dirname + '/somfy-callback.html');
        response.header('Content-Type', 'text/html');
        response.write(CALLBACK_BODY.toString());
        response.send();
    });

    RED.httpAdmin.get('/somfy/:account/sites', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account) as any;
        const somfyApiClient = new SomfyApi(RED, configNode, req.params.account);

        somfyApiClient.getSites()
            .then((sites: any) => res.json(sites))
            .catch(() => {
                res.status(500);
                res.send();
            });
    });

    RED.httpAdmin.get('/somfy/:account/site/:siteid/devices', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account) as any;
        const somfyApiClient = new SomfyApi(RED, configNode, req.params.account);

        somfyApiClient.getDevicesForSite(req.params.siteid)
            .then((devices: any) => res.json(devices))
            .catch(() => {
                res.status(500);
                res.send();
            });
    });
};
