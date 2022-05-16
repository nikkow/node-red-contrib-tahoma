export interface ICommand {
  name: string;
  parameters?: ICommandParameter[];
}

export interface ICommandParameter {
  name: string;
  value: any;
}
