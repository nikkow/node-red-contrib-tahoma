import * as nodered from 'node-red';

export interface TahomaConfigNodeDef extends nodered.NodeDef {
  name: string;
  pin: string;
  token: string;
  url: string;
}
