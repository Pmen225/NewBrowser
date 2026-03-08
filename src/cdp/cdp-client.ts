import { CdpRegistryError } from "./types";
import type { ICdpTransport } from "./types";

export interface CdpConnection {
  send<T>(method: string, params?: object, sessionId?: string): Promise<T>;
  on(event: string, handler: (payload: unknown) => void): void;
  off(event: string, handler: (payload: unknown) => void): void;
}

export class CdpClientTransport implements ICdpTransport {
  constructor(private readonly connection: CdpConnection) {}

  async send<T>(method: string, params?: object, sessionId?: string): Promise<T> {
    try {
      return await this.connection.send<T>(method, params, sessionId);
    } catch (error) {
      throw new CdpRegistryError("TRANSPORT_ERROR", "CDP transport send failed", true, {
        method,
        sessionId,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  on(event: string, handler: (payload: unknown) => void): void {
    this.connection.on(event, handler);
  }

  off(event: string, handler: (payload: unknown) => void): void {
    this.connection.off(event, handler);
  }
}
