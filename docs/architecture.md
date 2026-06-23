# Architecture

Pirate Radio is a local-first reader pipeline for Pirate Wires articles.

## Flow

1. Poll `https://piratewires.substack.com/feed.xml`.
2. Compare feed entries against durable state.
3. Send a Home Assistant mobile notification through homelab-functions with
   stable Yes/No action IDs.
4. Listen for Home Assistant `mobile_app_notification_action` events over
   WebSocket.
5. On approval, extract the story with Playwright, including title, tagline,
   body blocks, section headings, and the hero image URL.
6. Cache article art locally, synthesize MP3 audio through the selected TTS
   provider, and optionally write word-timing alignment JSON.
7. Write story JSON, text, MP3, cached image, and a library manifest.
8. Serve a Tailnet-only reader UI with a library view, article detail pages,
   cached images, inline MP3 streaming, and saved playback position.

The first service run treats the current feed as a baseline and queues at most
one notification, which avoids a startup flood. Later polls only mark articles
seen when they are queued or decided.

## Components

- `src/feed.ts`: RSS fetch and parsing.
- `src/server.ts`: service loop, HTTP reader routes, and action simulation.
- `src/notifications.ts`: stable mobile action IDs.
- `src/haActions.ts`: Home Assistant WebSocket listener.
- `src/workflow.ts`: article decision handling.
- `src/assets.ts`: article image caching and asset content types.
- `src/alignment.ts`: optional OpenAI Whisper word-timing artifact writer.
- `src/tts/`: provider interface and OpenAI implementation.
- `src/library.ts`: durable manifest writer.
- `src/reader.ts`: library and article-page renderer with local
  playback-position storage.

## Alignment Prototype

OpenAI speech generation does not currently return word timing metadata with
the MP3. The optional prototype uses the generated MP3 as input to OpenAI
speech-to-text with `whisper-1`, `response_format=verbose_json`, and
word-level timestamps. The reader consumes alignment JSON only when present and
falls back to ordinary article text otherwise.
