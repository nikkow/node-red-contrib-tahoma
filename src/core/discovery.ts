import * as bonjour from 'bonjour';

export class DiscoveryService {
  private _bonjour;
  private type = 'kizboxdev';
  private timeoutMs = 5000;

  discoverGateways(timeoutMs = this.timeoutMs, pin?: string): Promise<any[]> {
    return new Promise((resolve) => {
      this._bonjour = bonjour();
      let timer;
      let browser;
      let settled = false;
      const discoveredByHost = new Map<string, any>();
      const normalizedPin = typeof pin === 'string' ? pin.trim() : '';
      const shouldFilterByPin = normalizedPin.length > 0;

      const cleanup = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (timer) {
          clearTimeout(timer);
        }
        if (browser) {
          browser.stop();
        }
        this._bonjour.destroy();
      };

      const pickHost = (service): string | null => {
        if (!service) {
          return null;
        }

        if (
          typeof service.host === 'string' &&
          service.host.trim().length > 0
        ) {
          return service.host.trim().replace(/\.$/, '');
        }

        if (Array.isArray(service.addresses)) {
          const ipv4 = service.addresses.find((address) =>
            typeof address === 'string'
              ? /^\d{1,3}(\.\d{1,3}){3}$/.test(address)
              : false,
          );
          if (ipv4) {
            return ipv4;
          }
        }

        return null;
      };

      browser = this._bonjour.find(
        {
          type: this.type,
        },
        (service) => {
          if (settled) {
            return;
          }

          const txt = service && service.txt ? service.txt : undefined;
          if (shouldFilterByPin && txt && txt.gateway_pin !== normalizedPin) {
            return;
          }

          const host = pickHost(service);
          if (!host) {
            return;
          }

          const existing = discoveredByHost.get(host);
          const candidate = {
            host,
            name:
              service &&
              typeof service.name === 'string' &&
              service.name.length > 0
                ? service.name
                : host,
            gatewayPin: txt && txt.gateway_pin ? txt.gateway_pin : undefined,
          };

          if (existing) {
            discoveredByHost.set(host, {
              host,
              name: existing.name || candidate.name,
              gatewayPin: existing.gatewayPin || candidate.gatewayPin,
            });
          } else {
            discoveredByHost.set(host, candidate);
          }
        },
      );

      timer = setTimeout(() => {
        cleanup();
        resolve(
          Array.from(discoveredByHost.values()).sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
      }, timeoutMs);
    });
  }
}
