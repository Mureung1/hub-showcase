import type { ProviderGatewayEnv } from "../src/provider-gateway/worker";

declare global {
  namespace Cloudflare {
    interface Env extends ProviderGatewayEnv {}
  }
}

export {};
