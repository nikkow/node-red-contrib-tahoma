import { IDevice } from './device';

export interface ICommandExecutionResponse {
    job_id: string;
}

export interface ICommandExecutionFinalState {
    finished: boolean;
    tahomabox?: string;
    device?: string;
    expectedState?: object;
    jobId?: string;
    deviceState: IDevice;
}
