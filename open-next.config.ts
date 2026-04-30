import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";

const config = defineCloudflareConfig() as OpenNextConfig;

config.buildCommand = "npm run next:build";

export default config;
