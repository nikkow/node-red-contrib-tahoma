import { IDevice } from './device';

export interface ICommandExecutionResponse {
    job_id: string;
}

export interface ICommandExecutionFinalState {
    finished: boolean;
    account?: string;
    device?: string;
    expectedState?: object;
    jobId?: string;
    deviceState: IDevice;
}
