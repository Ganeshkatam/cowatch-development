import { getVMManagerConfig } from "./utils.ts";

/**
 * Returns true if the server is configured with at least one valid
 * VBrowser infrastructure provider. 
 * 
 * This represents the "enabled" capability of the platform, not current capacity.
 */
export function isVBrowserEnabled(): boolean {
  try {
    const configs = getVMManagerConfig();
    return configs.length > 0;
  } catch (e) {
    return false;
  }
}
