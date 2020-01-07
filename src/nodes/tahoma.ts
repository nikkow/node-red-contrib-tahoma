import { NodeProperties, Red } from 'node-red';
import * as fs from 'fs';
import { ICommand } from '../interfaces/command';
import { SomfyApi } from '../core/somfy-api';
import { ICommandExecutionResponse } from '../interfaces/command-execution-response';


export = (RED: Red) => {
    const timerRetries = {};
    const waitUntilExpectedState = (account, device, expectedState, jobId): Promise<any> => {
        return new Promise((resolve) => {
            var configNode = RED.nodes.getNode(account) as any;
            const somfyApiClient = new SomfyApi(RED, configNode.context, account);

            setTimeout(() => {
                somfyApiClient.getDevice(device)
                    .then((deviceState: any) => { // TODO: Type that
                        const currentPosition = parseInt(deviceState.states.find(state => state.name === "position").value);

                        if (currentPosition === expectedState.position) {
                            return resolve({ finished: true });
                        }

                        return resolve({ finished: false, account, device, expectedState });
                    });
            }, 10000);
        }).then((response: { finished: boolean, tahomabox?: string, device?: string, expectedState?: object, jobId?: string }) => {
            if (timerRetries.hasOwnProperty(response.jobId)) {
                if (timerRetries[response.jobId] === 3 && !response.finished) {
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
                    parameters = [{ name: "position", value: parseInt(msg.payload.position) }];
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

            var command: ICommand = {
                name: msg.payload.lowspeed ? "setClosureAndLinearSpeed" : commandName,
                parameters: parameters || []
            };

            if (msg.payload.lowspeed) {
                command.parameters = [expectedState.position, "lowspeed"];
                statusProgressText = statusProgressText.substring(0, (statusProgressText.length - 3)) + " (Low Speed)...";
            }

            this.status({ fill: 'yellow', shape: 'dot', text: statusProgressText });

            const somfyApiClient = new SomfyApi(RED, this.context, this.tahomabox);

            somfyApiClient.sendCommandToDevice(this.device, command)
                .then((commandExecutionFeedback: ICommandExecutionResponse) => {
                    if (!expectedState) {
                        this.status({ fill: 'grey', shape: 'dot', text: 'Unknown' });
                        this.send(msg);
                        return;
                    }

                    const jobId = commandExecutionFeedback.job_id;

                    waitUntilExpectedState(this.tahomabox, this.device, expectedState, jobId).then((isFinished) => {
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
                });
        });
    });

    RED.httpAdmin.get('/somfy/callback', (request, response) => {
        const CALLBACK_BODY = fs.readFileSync(__dirname + '/somfy-callback.html');
        response.header('Content-Type', 'text/html');
        response.write(CALLBACK_BODY.toString());
        response.send();
    });

    RED.httpAdmin.get('/somfy/:account/sites', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account) as any;
        const somfyApiClient = new SomfyApi(RED, configNode.context, req.params.account);

        somfyApiClient.getSites()
            .then((sites: any) => res.json(sites));
    });

    RED.httpAdmin.get('/somfy/:account/site/:siteid/devices', function (req, res) {
        const configNode = RED.nodes.getNode(req.params.account) as any;
        const somfyApiClient = new SomfyApi(RED, configNode.context, req.params.account);

        somfyApiClient.getDevicesForSite(req.params.siteid)
            .then((devices: any) => res.json(devices));
    });
};
