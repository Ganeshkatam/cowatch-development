import { loadEnvFile } from "node:process";
import fs from "node:fs";

if (fs.existsSync(".env")) {
  try {
    loadEnvFile();
  } catch (e) {
    // ignore
  }
}

const defaults = {
  REDIS_URL: "",
  DATABASE_URL: "",
  DATABASE_SSL_CA: "",
  DATABASE_SSL_STRICT: "false",
  YOUTUBE_API_KEY: "",
  NODE_ENV: "",
  VBROWSER_SESSION_SECONDS: 10800,
  VBROWSER_SESSION_SECONDS_LARGE: 86400,
  VM_POOL_RAMP_DOWN_HOURS: "",
  VM_POOL_RAMP_UP_HOURS: "",
  VBROWSER_TAG: "",
  DO_TOKEN: "",
  DO_GATEWAY: "",
  DO_IMAGE: "",
  DO_SSH_KEYS: "",
  HETZNER_TOKEN: "",
  HETZNER_GATEWAY: "",
  HETZNER_SSH_KEYS: "",
  HETZNER_IMAGE: "",
  VM_MANAGER_CONFIG: "",
  SCW_SECRET_KEY: "",
  SCW_ORGANIZATION_ID: "",
  SCW_GATEWAY: "",
  SCW_IMAGE: "",
  DOCKER_VM_HOST: "localhost",
  DOCKER_VM_HOST_SSH_USER: "root",
  DOCKER_VM_HOST_SSH_KEY_BASE64: "",
  SSL_KEY_FILE: "",
  SSL_CRT_FILE: "",
  PORT: 8080,
  HOST: "0.0.0.0",
  STATS_KEY: "",
  INVITE_CREDENTIAL_SECRET: "",
  BETA_USER_EMAILS: "",
  CUSTOM_SETTINGS_HOSTNAME: "",
  STREAM_PATH: "",
  CONVERT_PATH: "",
  ROOM_CAPACITY: 10,
  ROOM_CAPACITY_SUB: 10,
  VM_MIN_UPTIME_MINUTES: 15,
  SHARD: undefined,
  FREE_ROOM_LIMIT: 2,
  SUBSCRIBER_ROOM_LIMIT: 10,
  VMWORKER_PORT: 3100,
  VM_ASSIGNMENT_TIMEOUT: 75,
  MEDIASOUP_SERVER: "",
  TWITCH_PROXY_PATH: "",
  VBROWSER_ADMIN_KEY: "",
  OPENSUBTITLES_KEY: "",
  SUPABASE_URL: "",
  SUPABASE_SECRET_KEY: "",
  PASSCODE_FINGERPRINT_KEY: "",
  ADMIN_API_KEY: "",
};

export default {
  ...defaults,
  ...process.env,
};
