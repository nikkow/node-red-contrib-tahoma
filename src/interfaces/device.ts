export interface IDevice {
  deviceURL: string;
  available: boolean;
  synced: boolean;
  label: string;
  enabled: boolean;
  controllableName: string;
}

// Note: other fields are available, but not used in this plugin.
// If you are contributing to this module and need an additional field,
// feel free to add it :).
