import { Red } from 'node-red';
import { ICommand } from '../interfaces/command';
import { SomfyApi } from '../core/somfy-api';
import { ICommandExecutionResponse } from '../interfaces/command-execution-response';
import { IDevice, IDeviceState } from '../interfaces/device';
import { IMessage } from '../interfaces/message';


export = (RED: Red) => {
    const timerRetries = {};
    const waitUntilExpectedState = (account, device, expectedState, jobId): Promise<any> => {
        return new Promise((resolve) => {
            const configNode = RED.nodes.getNode(account) as any;
            const somfyApiClient = new SomfyApi(RED, configNode.context, account);

            setTimeout(() => {
                somfyApiClient.getDevice(device)
                    .then((deviceState: IDevice) => {
                        const currentPosition = parseInt(
                            deviceState.states.find((state: IDeviceState) => state.name === 'position').value
                        , 10);

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

            return response.finished ?
                true : waitUntilExpectedState(response.tahomabox, response.device, response.expectedState, response.jobId);
        });
    };

    RED.nodes.registerType('tahoma', function (this, props) {
        const config = props as any; // TODO: Handle this differently
        RED.nodes.createNode(this, config);

        this.device = config.device;
        this.site = config.site;
        this.tahomabox = config.tahomabox;

        this.on('input', (msg: IMessage) => {
            if (typeof msg.payload !== 'object') {
                return;
            }

            let commandName = '';
            let parameters = [];
            let statusProgressText = '';
            let statusDoneText = '';
            let expectedState = null;

            switch (msg.payload.action) {
                case 'open':
                    commandName = 'open';
                    statusProgressText = 'Opening...';
                    statusDoneText = 'Open';
                    expectedState = { open: true, position: 0 };
                    break;
                case 'close':
                    commandName = 'close';
                    statusProgressText = 'Closing...';
                    statusDoneText = 'Closed';
                    expectedState = { open: false, position: 100 };
                    break;
                case 'customPosition':
                    commandName = 'position';
                    parameters = [{ name: 'position', value: parseInt(msg.payload.position, 10) }];
                    statusProgressText = 'Going to ' + msg.payload.position + '%...';
                    statusDoneText = 'Set to ' + msg.payload.position + '%';
                    expectedState = { open: true, position: msg.payload.position };
                    break;
                case 'stop':
                    commandName = 'stop';
                    statusProgressText = 'Stopping...';
                    statusDoneText = 'Stopped';
                    // expectedState = {open: false, position: 100}; // Not sure what to exspect here
                    break;
            }

            const command: ICommand = {
                name: commandName,
                parameters: parameters || []
            };

            if (msg.payload.lowspeed && command.name !== 'stop') {
                command.name = 'position_low_speed';
                command.parameters = [{ name: 'position', value: parseInt(expectedState.position, 10) }];
                statusProgressText = statusProgressText.substring(0, (statusProgressText.length - 3)) + ' (Low Speed)...';
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
                    });
                });
        });
    });
};
