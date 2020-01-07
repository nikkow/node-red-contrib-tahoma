export interface IDevice {
    id: string;
    type: string;
    parent_id: string;
    categories: string[];
    states: IDeviceState[];
    capabilities: IDeviceCapability[];
    site_id: string;
    name: string;
    available: boolean;
    version?: string;
}

export interface IDeviceState {
    name: string;
    value: any;
    type: string;
}

export interface IDeviceCapability {
    name: string;
    parameters: IDeviceCapabilityParameter[];
}

export interface IDeviceCapabilityParameter {
    name: string;
    type: string;
}
