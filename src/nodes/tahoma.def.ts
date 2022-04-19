import * as nodered from 'node-red';

export interface TahomaNodeDef extends nodered.NodeDef {
  name: string;
  tahomabox: string;
  device: string;
}
