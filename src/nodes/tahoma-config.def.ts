import * as nodered from 'node-red';

export interface TahomaConfigNodeDef extends nodered.NodeDef {
  connectionname: string;
  host: string;
  token: string;
  url?: string;
}
