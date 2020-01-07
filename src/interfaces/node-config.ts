import { NodeProperties } from 'node-red';

export interface INodeConfiguration extends NodeProperties {
    device: string;
    tahomabox: string;
    site: string;
}
