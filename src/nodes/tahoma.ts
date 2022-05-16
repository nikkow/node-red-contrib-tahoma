import * as nodered from 'node-red';
import { TahomaNodeDef } from './tahoma.def';
import { ICommand } from '../interfaces/command';
import { SomfyApi } from '../core/somfy-api';
import { ICommandExecutionResponse } from '../interfaces/command-execution-response';

interface ITahomaControlMessage extends nodered.NodeMessageInFlow {
  payload: ITahomaControlPayload;
}

interface ITahomaControlPayload {
  action: string;
  orientation: string;
  position: string;
  lowspeed: boolean;
}

interface ITahomaControlInstructions {
  command: 'open' | 'close' | 'position' | 'rotation' | 'stop';
  parameters?: Array<{ name: string; value: number | string }>;
  expectedState?: { open?: boolean; position?: number; orientation?: number };
  labels: {
    done: string;
    progress: string;
  };
}

const STATE_VALIDATOR_POLLING_DELAY = 2500; // Check every 2.5 seconds, until expected state is reached.
const validateStatus = (
  configNode: nodered.Node,
  execId: string,
): Promise<boolean> =>
  new Promise((resolve) =>
    setTimeout(async () => {
      const somfyClient = new SomfyApi(configNode);
      const status = await somfyClient.getStatusForExecutionId(execId);
      resolve(status === null);
    }, STATE_VALIDATOR_POLLING_DELAY),
  );

const continueWhenCompleted = (
  configNode: nodered.Node,
  execId: string,
): Promise<void> => {
  return validateStatus(configNode, execId).then((isFinished) => {
    if (!isFinished) {
      return continueWhenCompleted(configNode, execId);
    }
  });
};

export = (RED: nodered.NodeAPI) => {
  RED.nodes.registerType(
    'tahoma',
    function (this: nodered.Node, props: TahomaNodeDef) {
      RED.nodes.createNode(this, props);

      this['device'] = props.device;
      this['tahomabox'] = props.tahomabox;
      this['name'] = props.name;

      this.on('input', (msg: ITahomaControlMessage) => {
        const instructions = generateInstructionsFromPayload(msg.payload);

        if (instructions === null) {
          return;
        }

        const command: ICommand = {
          name: instructions.command,
          parameters: instructions.parameters || [],
        };

        if (msg.payload.lowspeed && instructions.command !== 'stop') {
          const targetPosition = instructions.expectedState.position || 0;
          command.name = 'position_low_speed';
          command.parameters = [{ name: 'position', value: targetPosition }];
        }

        this.status({
          fill: 'yellow',
          shape: 'dot',
          text: instructions.labels.progress,
        });

        const configNode = RED.nodes.getNode(this['tahomabox']);
        const somfyApiClient = new SomfyApi(configNode);

        somfyApiClient
          .execute(this['device'], command)
          .then((commandExecutionResponse: ICommandExecutionResponse) => {
            if (!instructions.expectedState) {
              this.status({ fill: 'grey', shape: 'dot', text: 'Unknown' });
              this.send(msg);
              return;
            }
            const execId = commandExecutionResponse.execId;
            continueWhenCompleted(configNode, execId).then(() => {
              this.status({
                fill: 'green',
                shape: 'dot',
                text: instructions.labels.done,
              });
              this.send(msg);
            });
          });
      });
    },
  );
};

function generateInstructionsFromPayload(
  payload: ITahomaControlPayload,
): ITahomaControlInstructions | null {
  switch (payload.action) {
    case 'open':
      return {
        command: 'open',
        expectedState: { open: true, position: 0 },
        labels: {
          done: 'Open',
          progress: 'Opening...',
        },
      };

    case 'close':
      return {
        command: 'close',
        expectedState: { open: false, position: 100 },
        labels: {
          done: 'Closed',
          progress: 'Closing...',
        },
      };

    case 'customPosition':
      return {
        command: 'position',
        expectedState: {
          open: true,
          position: parseInt(payload.position, 10),
        },
        labels: {
          done: `Set to ${payload.position}`,
          progress: `Setting to ${payload.position}`,
        },
        parameters: [
          { name: 'position', value: parseInt(payload.position, 10) },
        ],
      };

    case 'customRotation':
      return {
        command: 'rotation',
        expectedState: { orientation: parseInt(payload.orientation, 10) },
        labels: {
          done: `Rotated to ${payload.orientation}`,
          progress: `Rotating to ${payload.orientation}...`,
        },
        parameters: [
          { name: 'orientation', value: parseInt(payload.orientation, 10) },
        ],
      };

    case 'stop':
      return {
        command: 'stop',
        labels: {
          done: `Stopped`,
          progress: `Stopping...`,
        },
      };

    default:
      return null;
  }
}
