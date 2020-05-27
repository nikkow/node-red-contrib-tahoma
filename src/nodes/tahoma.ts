import { Red } from 'node-red';
import { ICommand } from '../interfaces/command';
import { SomfyApi } from '../core/somfy-api';
import { ICommandExecutionResponse, ICommandExecutionFinalState } from '../interfaces/command-execution-response';
import { IDevice, IDeviceState } from '../interfaces/device';
import { IMessage } from '../interfaces/message';
import { INetworkError } from '../interfaces/network-error';


export = (RED: Red) => {
    const timerRetries = {};
    const waitUntilExpectedState = (account, device, expectedState, jobId): Promise<any> => {
        return new Promise((resolve) => {
            if (!account) {
                return;
            }

            const configNode = RED.nodes.getNode(account) as any;
            const somfyApiClient = new SomfyApi(RED, configNode.context, account);

            setTimeout(() => {
                somfyApiClient.getDevice(device)
                    .then((deviceState: IDevice) => {
                        const currentPosition = parseInt(
                            deviceState.states.find((state: IDeviceState) => state.name === 'position').value
                        , 10);

                        if (currentPosition === expectedState.position) {
                            return resolve({ finished: true, deviceState });
                        }

                        return resolve({ finished: false, account, device, expectedState });
                    });
            }, 5000);
        }).then((response: ICommandExecutionFinalState) => {
            if (timerRetries.hasOwnProperty(response.jobId)) {
                if (timerRetries[response.jobId] === 10 && !response.finished) {
                    return false;
                }

                timerRetries[response.jobId] = timerRetries[response.jobId] + 1;
            } else {
                timerRetries[response.jobId] = 1;
            }

            if (response.finished) {
                return {
                    finished: true,
                    state: response.deviceState
                };
            }

            waitUntilExpectedState(response.tahomabox, response.device, response.expectedState, response.jobId);
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
                case 'customRotation':
                    commandName = 'rotation';
                    parameters = [{ name: 'orientation', value: parseInt(msg.payload.orientation, 10) }];
                    statusProgressText = 'Rotating to ' + msg.payload.orientation + 'degrees...';
                    statusDoneText = 'Rotated to ' + msg.payload.orientation + '%';
                    expectedState = { orientation: msg.payload.orientation };
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

                    waitUntilExpectedState(this.tahomabox, this.device, expectedState, jobId).then((finalState) => {
                        this.status({
                            fill: finalState.finished ? 'green' : 'red',
                            shape: 'dot',
                            text: statusDoneText
                        });

                        if (!('payload' in msg)) {
                            msg.payload = {};
                        }

                        // - DEPRECATED: The output is there for backwards compatibility.
                        // - it will be removed and msg.payload.states must be used instead.
                        msg.payload.output = expectedState || { open: true };
                        msg.payload.states = finalState.state.states;

                        this.send(msg);
                    });
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
