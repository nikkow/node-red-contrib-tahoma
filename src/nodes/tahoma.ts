import { NodeProperties, Red } from 'node-red';
import * as fs from 'fs';
import * as request from 'request';


export = (RED: Red) => {
    const timerRetries = {};
    const waitUntilExpectedState = (tahomabox, device, expectedState, jobId): Promise<any> => {
        return new Promise((resolve) => {
            var configNode = RED.nodes.getNode(tahomabox) as any;
            setTimeout(() => {
                console.log('Calling API...');
                request({
                    url: 'https://api.somfy.com/api/v1/device/' + device,
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + configNode.accesstoken
                    }
                }, (err, response, data) => {
                    if (response.statusCode === 200) {
                        try {
                            const deviceState = JSON.parse(data);
                            const currentPosition = parseInt(deviceState.states.find(state => state.name === "position").value);

                            console.log('Current position => ', currentPosition)
                            console.log('Expected position => ', expectedState.position)
                            console.log('Is Finished? => ', (currentPosition === expectedState.position));

                            if (currentPosition === expectedState.position) {
                                console.log('Return resolve(true);')
                                return resolve({finished: true});
                            } else {
                                return resolve({finished: false, tahomabox, device, expectedState});
                            }
                        } catch {
                            return resolve({finished: false, tahomabox, device, expectedState});
                        }
                    }

                    return resolve({finished: false, tahomabox, device, expectedState});
                });
            }, 10000);
        }).then((response: {finished: boolean, tahomabox?: string, device?: string, expectedState?: object, jobId?: string}) => {
            if(timerRetries.hasOwnProperty(response.jobId)) {
                if(timerRetries[response.jobId] === 3 && !response.finished) {
                    return false;
                }

                timerRetries[response.jobId] = timerRetries[response.jobId] + 1;
            } else {
                timerRetries[response.jobId] = 1;
            }

            return response.finished ? true : waitUntilExpectedState(response.tahomabox, response.device, response.expectedState, response.jobId)
        });
    }

    RED.nodes.registerType('tahoma', function (this, props) {
        const config = props as any; // TODO: Handle this differently
        RED.nodes.createNode(this, config);

        this.device = config.device;
        this.site = config.site;
        this.tahomabox = config.tahomabox;

        this.on('input', (msg) => {
            if (typeof msg.payload !== "object") {
                return;
            }

            var action: any = {}; // TODO: Type this.
            action.deviceURL = this.device;

            var commandName = "";
            var parameters = [];
            var statusProgressText = "";
            var statusDoneText = "";
            var expectedState = null;

            switch (msg.payload.action) {
                case "open":
                    commandName = "open";
                    statusProgressText = "Opening...";
                    statusDoneText = "Open";
                    expectedState = { open: true, position: 0 };
                    break;
                case "close":
                    commandName = "close";
                    statusProgressText = "Closing...";
                    statusDoneText = "Closed";
                    expectedState = { open: false, position: 100 };
                    break;
                case "customPosition":
                    commandName = "position";
                    parameters = [{name: "position", value: parseInt(msg.payload.position)}];
                    statusProgressText = "Going to " + msg.payload.position + "%...";
                    statusDoneText = "Set to " + msg.payload.position + "%";
                    expectedState = { open: true, position: msg.payload.position };
                    break;
                case "stop":
                    commandName = "stop";
                    statusProgressText = "Stopping...";
                    statusDoneText = "Stopped";
                    //expectedState = {open: false, position: 100}; // Not sure what to exspect here
                    break;
            }

            var command: any = {}; // TODO: Type this

            command.name = msg.payload.lowspeed ? "setClosureAndLinearSpeed" : commandName;
            if (parameters.length > 0) {
                command.parameters = parameters;
            } else {
                command.parameters = [];
            }

            if (msg.payload.lowspeed) {
                command.parameters = [expectedState.position, "lowspeed"];
                statusProgressText = statusProgressText.substring(0, (statusProgressText.length - 3)) + " (Low Speed)...";
            }

            var configNode = RED.nodes.getNode(this.tahomabox) as any; // TODO: Type this

            this.status({ fill: 'yellow', shape: 'dot', text: statusProgressText });

            console.log('Command => ', JSON.stringify(command));

            request({
                url: 'https://api.somfy.com/api/v1/device/' + this.device + '/exec',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + configNode.accesstoken,
                    'Content-Type': 'application/json'
                },
                json: command
            }, (err, response, data) => {
                if(!err && response.statusCode === 200) {
                    if (expectedState === null) {
                        this.status({ fill: 'grey', shape: 'dot', text: 'Unknown' });
                        this.send(msg);
                        return;
                    }

                    console.log('Data => ', data);
                    const jobId = data.job_id; // TODO: Fix that
    
                    waitUntilExpectedState(this.tahomabox, this.device, expectedState, jobId).then((isFinished) => {
                        console.log('Finished - Callback');
                        this.status({
                            fill: isFinished ? 'green' : 'red',
                            shape: 'dot',
                            text: statusDoneText
                        });
    
                        if (!('payload' in msg)) {
                            msg.payload = {};
                        }
    
                        // TODO: Find a better way to handle "my" position.
                        msg.payload.output = expectedState ? expectedState : { open: true };
    
                        this.send(msg);
                    })
                } else {
                    console.log('Err => ', err);
                    console.log('Data => ', data);
                    this.status({ fill: 'red', shape: 'dot', text: 'An error occurred' });
                    this.send(null);
                    return;
                }
            });
        });
    });

    RED.httpAdmin.get('/somfy/callback', (request, response) => {
        const CALLBACK_BODY = fs.readFileSync(__dirname + '/somfy-callback.html');
        response.header('Content-Type', 'text/html');
        response.write(CALLBACK_BODY.toString());
        response.send();
    });

    RED.httpAdmin.get('/somfy/:boxid/sites', function (req, res) {
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

    RED.httpAdmin.get('/somfy/:boxid/site/:siteid/devices', function (req, res) {
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
};
