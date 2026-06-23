# Pirate Wires Reader

Local CLI for extracting logged-in Pirate Wires stories and generating OpenAI
text-to-speech audio.

## Setup

```bash
npm install
npx playwright install chromium
```

The OpenAI audio command uses `OPENAI_API_KEY` from the environment. The CLI
does not print or store the key.

## Login

```bash
npm run cli -- login
```

This opens a dedicated Playwright browser profile in `.playwright-profile/`.
Log in to Pirate Wires with your email passcode, then press Enter in the
terminal. The profile directory is ignored by git and reused by later commands.

## Extract Text

```bash
npm run cli -- extract "https://www.piratewires.com/p/story-slug"
```

Outputs:

- `output/text/<slug>.txt`
- `output/json/<slug>.json`

The extractor is intentionally narrow: it writes the story title and story body
only.

## Generate Audio

From an existing JSON file:

```bash
npm run cli -- speak output/json/story-slug.json --provider openai
```

Extract and generate audio in one command:

```bash
npm run cli -- read "https://www.piratewires.com/p/story-slug" --provider openai
```

Outputs:

- `output/audio/<slug>.mp3`

OpenAI defaults:

- Model: `gpt-4o-mini-tts`
- Voice: `alloy`
- Format: `mp3`

The CLI estimates OpenAI TTS cost at `$15 / 1M characters` and refuses to
generate audio above `$1` unless `--allow-over-budget` is passed.

## Providers

TTS providers implement `TtsProvider.synthesize({ title, text, outputPath })`.
Only `openai` is implemented now; the provider boundary is in place so
ElevenLabs can be added later without changing the extraction commands.

## Checks

```bash
npm test
npm run build
```

## Service Mode

```bash
npm run build
npm start
```

`serve` polls the Substack RSS feed, sends Home Assistant mobile actions via
homelab-functions, listens for the mobile action event over Home Assistant
WebSocket, and writes the reader library manifest under
`PIRATE_RADIO_LIBRARY_DIR`. Set `PWR_HEADLESS=true` for Docker or any headless
host.
