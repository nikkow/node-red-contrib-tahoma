import { Red } from 'node-red';
import { ICommand } from '../interfaces/command';
import { SomfyApi } from '../core/somfy-api';
import { ICommandExecutionResponse, ICommandExecutionFinalState } from '../interfaces/command-execution-response';
import { IDevice, IDeviceState } from '../interfaces/device';
import { IMessage } from '../interfaces/message';
import { INetworkError } from '../interfaces/network-error';


export = (RED: Red) => {
    const EXPECTED_POSITION_BUFFER = 0.05; // 5%
    const WAIT_FOR_EXPECTED_STATE_DELAY = 5000; // Check every 5 seconds, until expected state is reached.
    const timerRetries = {};
    const waitUntilExpectedState = (account, device, expectedState, jobId): Promise<any> => {
        return new Promise((resolve) => {
            if (!account) {
                return;
            }

            const configNode = RED.nodes.getNode(account);
            const somfyApiClient = new SomfyApi(configNode);

            setTimeout(() => {
                somfyApiClient.getDevice(device)
                    .then((deviceState: IDevice) => {
                        const currentPosition = parseInt(
                            deviceState.states.find((state: IDeviceState) => state.name === 'position').value
                            , 10);

                        let lowThreshold = expectedState.position * (1 - EXPECTED_POSITION_BUFFER);
                        let highThreshold = expectedState.position * (1 + EXPECTED_POSITION_BUFFER);

                        if (expectedState.position === 0 || expectedState.position === 100) {
                            lowThreshold = expectedState.position;
                            highThreshold = expectedState.position;
                        }

                        if (currentPosition >= lowThreshold && currentPosition <= highThreshold) {
                            return resolve({ finished: true, deviceState });
                        }

                        return resolve({ finished: false, account, device, expectedState });
                    });
            }, WAIT_FOR_EXPECTED_STATE_DELAY);
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
        }).catch((error) => {
            this.error(`Cannot refresh Somfy device state. Received the following error: ${error}`);
        });
    };

    RED.nodes.registerType('tahoma', function (this, props) {
        RED.nodes.createNode(this, props);

        this.device = props['device'];
        this.site = props['site'];
        this.tahomabox = props['tahomabox'];

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
                    statusProgressText = 'Rotating to ' + msg.payload.orientation + '°...';
                    statusDoneText = 'Rotated to ' + msg.payload.orientation + '°';
                    expectedState = { orientation: msg.payload.orientation };
                    break;
                case 'stop':
                    commandName = 'stop';
                    statusProgressText = 'Stopping...';
                    statusDoneText = 'Stopped';
                    // expectedState = {open: false, position: 100}; // Not sure what to expect here
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

            const configNode = RED.nodes.getNode(this.tahomabox);
            const somfyApiClient = new SomfyApi(configNode);

            somfyApiClient.sendCommandToDevice(this.device, command)
                .then((commandExecutionFeedback: ICommandExecutionResponse) => {
                    if (!expectedState) {
                        this.status({ fill: 'grey', shape: 'dot', text: 'Unknown' });
                        this.send(msg);
                        return;
                    }

                    const jobId = commandExecutionFeedback.job_id;

                    waitUntilExpectedState(this.tahomabox, this.device, expectedState, jobId)
                        .then((finalState) => {
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
                        })
                        .catch((error) => {
                            this.error(`Cannot refresh Somfy device state. Received the following error: ${error}`);
                        });
                })
                .catch((error: INetworkError) => {
                    this.error(`Token has expired. The renewas didn't happen as expected. Do not hesitate to create an issue on Github.`);
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
