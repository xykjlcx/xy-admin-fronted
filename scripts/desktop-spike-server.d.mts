import type { Server } from 'node:https';

export interface SpikeRequest {
  method: string;
  path: string;
  origin: string;
  headers: Record<string, string>;
  body: string;
}

export interface SpikeResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export function createSpikeResponse(request: SpikeRequest): SpikeResponse;
export function startSpikeServer(options: {
  port: number;
  keyPath: string;
  certPath: string;
  evidencePath: string;
}): Server;
