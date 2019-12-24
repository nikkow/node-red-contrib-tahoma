import { NodeProperties, Red } from 'node-red';
import * as fs from 'fs';

export = (RED: Red) => {
    RED.nodes.registerType('tahoma', function(this, props) {
        const config = props;
        RED.httpAdmin.get('/somfy/callback', (request, response) => { 
            const CALLBACK_BODY = fs.readFileSync(__dirname + '/somfy-callback.html');
            response.header('Content-Type', 'text/html');
            response.write(CALLBACK_BODY.toString());
            response.send();
        });
        RED.nodes.createNode(this, config);
    });
};
