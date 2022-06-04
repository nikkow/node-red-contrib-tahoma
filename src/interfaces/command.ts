export interface ICommand {
  name: string;
  parameters?: number[];
}

export interface ICommandParameter {
  name: string;
  value: any;
}
