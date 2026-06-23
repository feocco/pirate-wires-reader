export interface PirateRadioConfig {
  port: number;
  host: string;
  publicBaseUrl: string;
  libraryDir: string;
  statePath: string;
  pollIntervalMs: number;
  maxNotificationsPerPoll: number;
  feedUrl: string;
  homelabFunctionsUrl?: string;
  homelabFunctionsToken?: string;
  haUrl?: string;
  haLongLivedToken?: string;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): PirateRadioConfig {
  const libraryDir = env.PIRATE_RADIO_LIBRARY_DIR ?? "output/library";
  return {
    port: Number(env.SERVICE_PORT ?? env.PORT ?? 8123),
    host: env.HOST_BIND_ADDR ?? "127.0.0.1",
    publicBaseUrl: env.PIRATE_RADIO_PUBLIC_URL ?? `http://127.0.0.1:${env.SERVICE_PORT ?? 8123}`,
    libraryDir,
    statePath: env.PIRATE_RADIO_STATE_PATH ?? `${libraryDir}/state.json`,
    pollIntervalMs: Number(env.PIRATE_RADIO_POLL_INTERVAL_MS ?? 15 * 60 * 1000),
    maxNotificationsPerPoll: Number(env.PIRATE_RADIO_MAX_NOTIFICATIONS_PER_POLL ?? 1),
    feedUrl: env.PIRATE_RADIO_FEED_URL ?? "https://piratewires.substack.com/feed.xml",
    homelabFunctionsUrl: env.HOMELAB_FUNCTIONS_URL,
    homelabFunctionsToken: env.HOMELAB_FUNCTIONS_TOKEN,
    haUrl: env.HA_URL,
    haLongLivedToken: env.HA_LONG_LIVED_TOKEN,
  };
}
