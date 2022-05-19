import * as bonjour from 'bonjour';

export class DiscoveryService {
  private _bonjour;
  private type = 'kizboxdev';

  getDevices(pin: string): Promise<any> {
    return new Promise((resolve) => {
      this._bonjour = bonjour();
      this._bonjour.findOne(
        {
          type: this.type,
        },
        ({ host, port, name, txt }) => {
          if (txt.gateway_pin === pin) {
            return resolve({ host, port, name });
          } else {
            return resolve(null);
          }
        },
      );
    });
  }
}
