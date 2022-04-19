import * as nodered from 'node-red';
import { SomfyApi } from '../core/somfy-api';
import { TahomaNodeDef } from './tahoma.def';

export = (RED: nodered.NodeAPI) => {
  RED.nodes.registerType(
    'tahoma-read',
    function (this: nodered.Node, props: TahomaNodeDef) {
      RED.nodes.createNode(this, props);
      const config = RED.nodes.getNode(props['tahomabox']);

      this['device'] = props.device;
      this['tahomabox'] = props.tahomabox;
      this['name'] = props.name;

      this.on('input', (msg: nodered.NodeMessage) => {
        const somfyClient = new SomfyApi(config);
        somfyClient.getDevice(this['device']).then((deviceData) => {
          msg.payload = deviceData;
          this.send(msg);
        });
      });
    },
  );
};
