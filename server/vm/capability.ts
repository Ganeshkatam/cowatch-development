import { getVMManagerConfig } from "./utils.ts";
import config from "../config.ts";

/**
 * Returns true if the server is configured with at least one valid
 * VBrowser infrastructure provider. 
 * 
 * This represents the "enabled" capability of the platform, not current capacity.
 */
export function isVBrowserEnabled(): boolean {
  try {
    const configs = getVMManagerConfig();
    return configs.some((poolConfig) => {
      if (poolConfig.provider === "Scaleway") {
        return Boolean(
          config.SCW_SECRET_KEY &&
          config.SCW_ORGANIZATION_ID &&
          config.SCW_IMAGE &&
          config.SCW_GATEWAY
        );
      }
      if (poolConfig.provider === "Hetzner") {
        return Boolean(
          config.HETZNER_TOKEN &&
          config.HETZNER_IMAGE &&
          config.HETZNER_GATEWAY
        );
      }
      if (poolConfig.provider === "DO") {
        return Boolean(
          config.DO_TOKEN &&
          config.DO_IMAGE &&
          config.DO_GATEWAY
        );
      }
      if (poolConfig.provider === "Docker") {
        return true;
      }
      return false;
    });
  } catch (e) {
    return false;
  }
}
