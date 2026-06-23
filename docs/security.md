# Security

## Secrets

Do not commit real values for:

- `OPENAI_API_KEY`
- `HA_URL`
- `HA_LONG_LIVED_TOKEN`
- `HOMELAB_FUNCTIONS_TOKEN`
- Pirate Wires browser profile/session data

`.env`, `.env.*`, `.playwright-profile/`, `output/`, `dist/`, and
`node_modules/` are ignored.

Cached article images and alignment JSON are generated runtime artifacts and
belong under the ignored library/output directory, not in git.
When `PWR_PROFILE_DIR` points into `/data`, that profile directory contains
logged-in browser session material and must stay in the ignored runtime volume.

## Network Exposure

The service is intended to bind to `127.0.0.1` on the homelab host and be
exposed only through Tailscale Serve. The reader has no authentication layer of
its own, so avoid binding it directly to a LAN or public interface unless a
separate access-control layer is added.

Article pages expose generated article text, cached article art, MP3 files, and
optional alignment JSON to anyone who can reach the Tailnet service.

## Home Assistant Actions

The service only reacts to action IDs with the `PIRATE_RADIO_ACCEPT::` or
`PIRATE_RADIO_SKIP::` prefixes. Notification delivery can go through
homelab-functions, but the long-running action listener belongs to this service.
