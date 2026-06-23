# Architecture

Pirate Radio is a local-first reader pipeline for Pirate Wires articles.

## Flow

1. Poll `https://piratewires.substack.com/feed.xml`.
2. Compare feed entries against durable state.
3. Send a Home Assistant mobile notification through homelab-functions with
   stable Yes/No action IDs.
4. Listen for Home Assistant `mobile_app_notification_action` events over
   WebSocket.
5. On approval, extract title and story body with Playwright and synthesize MP3
   audio through the selected TTS provider.
6. Write story JSON, text, MP3, and a library manifest.
7. Serve a Tailnet-only reader UI that lists manifest entries and streams MP3s
   on demand.

The first service run treats the current feed as a baseline and queues at most
one notification, which avoids a startup flood. Later polls only mark articles
seen when they are queued or decided.

## Components

- `src/feed.ts`: RSS fetch and parsing.
- `src/server.ts`: service loop, HTTP reader routes, and action simulation.
- `src/notifications.ts`: stable mobile action IDs.
- `src/haActions.ts`: Home Assistant WebSocket listener.
- `src/workflow.ts`: article decision handling.
- `src/tts/`: provider interface and OpenAI implementation.
- `src/library.ts`: durable manifest writer.
- `src/reader.ts`: inline browser player with local playback-position storage.
