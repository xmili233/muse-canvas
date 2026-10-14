import { PROVIDERS, PROTOCOLS } from "../shared/providers.mjs";

export type ProviderId = keyof typeof PROVIDERS;
export type ProtocolId = keyof typeof PROTOCOLS;
export type ModelConnection = {
  provider: ProviderId;
  protocol: ProtocolId;
  baseUrl: string;
  model: string;
};
export type AgentConnection =
  | ({ token: string; mode: "live" } & ModelConnection)
  | { token: string; mode: "demo" };
export type ConnectionChoice =
  | ({ mode: "live"; apiKey: string } & ModelConnection)
  | { mode: "demo" };
export type ConnectionError = { message: string; code?: string };
