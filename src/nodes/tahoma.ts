import { NodeProperties, Red } from 'node-red';
import * as fs from 'fs';
import * as request from 'request';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma', function(this, props) {
        const config = props;
        RED.httpAdmin.get('/somfy/callback', (request, response) => { 
            const CALLBACK_BODY = fs.readFileSync(__dirname + '/somfy-callback.html');
            response.header('Content-Type', 'text/html');
            response.write(CALLBACK_BODY.toString());
            response.send();
        });

        RED.httpAdmin.get('/somfy/:boxid/sites', function(req, res){
            var configNode = RED.nodes.getNode(req.params.boxid) as any;
            request({
                url: 'https://api.somfy.com/api/v1/site',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + configNode.accesstoken
                }
            }, (err, response, data) => {
                console.log(data);
                res.json(JSON.parse(data)); // FIXME: Any other option than JSON.parse here? Handle error.
            });
        });

        RED.httpAdmin.get('/somfy/:boxid/site/:siteid/devices', function(req, res){
            var configNode = RED.nodes.getNode(req.params.boxid) as any;
            request({
                url: 'https://api.somfy.com/api/v1/site/' + req.params.siteid + '/device',
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + configNode.accesstoken
                }
            }, (err, response, data) => {
                res.json(JSON.parse(data)); // FIXME: Any other option than JSON.parse here? Also, remove the HUB form the device.
            });
        });
        
        RED.nodes.createNode(this, config);
    });
};
