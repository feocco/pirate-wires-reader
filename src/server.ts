import { createReadStream } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { basename, join, resolve } from "node:path";
import { fetchPirateFeed, detectNewArticles } from "./feed.js";
import { extractStoryFromUrl } from "./browser.js";
import type { PirateRadioConfig } from "./config.js";
import { HomeAssistantActionListener } from "./haActions.js";
import { readLibraryManifest } from "./library.js";
import { buildArticleNotification, type PirateRadioDecision } from "./notifications.js";
import { HomelabFunctionsNotifier, type Notifier } from "./notifier.js";
import { renderReaderHtml } from "./reader.js";
import { readState, seenArticleIds, writeState, type PirateRadioState } from "./state.js";
import { createTtsProvider } from "./tts/index.js";
import { handleArticleDecision, providerSynthesizer } from "./workflow.js";

export interface PirateRadioServiceOptions {
  config: PirateRadioConfig;
  notifier?: Notifier;
}

export class PirateRadioService {
  private state?: PirateRadioState;
  private pollTimer?: NodeJS.Timeout;
  private readonly notifier: Notifier;
  private readonly actionListener: HomeAssistantActionListener;

  constructor(private readonly options: PirateRadioServiceOptions) {
    this.notifier =
      options.notifier ??
      new HomelabFunctionsNotifier({
        serviceUrl: options.config.homelabFunctionsUrl,
        token: options.config.homelabFunctionsToken,
      });
    this.actionListener = new HomeAssistantActionListener({
      haUrl: options.config.haUrl,
      token: options.config.haLongLivedToken,
      onAction: (action) => this.decide(action.slug, action.decision),
    });
  }

  async start(): Promise<void> {
    await mkdir(this.options.config.libraryDir, { recursive: true });
    this.state = await readState(this.options.config.statePath);
    const server = createServer((request, response) => {
      void this.handleRequest(request, response);
    });
    server.listen(this.options.config.port, this.options.config.host, () => {
      console.log(
        `[pirate-radio] listening on ${this.options.config.host}:${this.options.config.port}`,
      );
    });

    void this.actionListener.start();
    await this.pollOnce();
    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, this.options.config.pollIntervalMs);
  }

  async pollOnce(): Promise<void> {
    const state = await this.getState();
    const articles = await fetchPirateFeed(this.options.config.feedUrl);
    const unseen = detectNewArticles(articles, seenArticleIds(state));
    const toNotify = unseen.slice(0, this.options.config.maxNotificationsPerPoll);

    const firstRun = !state.initialized;
    const articlesToMarkSeen = firstRun ? unseen : toNotify;
    for (const article of articlesToMarkSeen) {
      state.seen[article.id] = article;
    }
    state.initialized = true;

    for (const article of toNotify) {
      const slug = article.slug ?? basename(new URL(article.url).pathname);
      state.pending[slug] = article;
      await this.notifier.send(buildArticleNotification(article, this.options.config.publicBaseUrl));
      console.log(`[pirate-radio] queued notification for ${article.title}`);
    }

    await writeState(this.options.config.statePath, state);
  }

  async decide(slug: string, decision: PirateRadioDecision): Promise<void> {
    const state = await this.getState();
    const provider = createTtsProvider("openai");
    const result = await handleArticleDecision({
      decision,
      slug,
      state,
      libraryDir: this.options.config.libraryDir,
      readArticle: (url) => extractStoryFromUrl(url),
      synthesize: providerSynthesizer(provider),
    });
    await writeState(this.options.config.statePath, state);
    console.log(`[pirate-radio] decision ${decision} for ${slug}: ${result.status}`);
  }

  private async getState(): Promise<PirateRadioState> {
    this.state ??= await readState(this.options.config.statePath);
    return this.state;
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (request.method === "GET" && url.pathname === "/health") {
      json(response, 200, { ok: true });
      return;
    }
    if (request.method === "GET" && url.pathname === "/") {
      html(response, renderReaderHtml());
      return;
    }
    if (request.method === "GET" && url.pathname === "/library.json") {
      json(response, 200, await readLibraryManifest(this.options.config.libraryDir));
      return;
    }
    if (
      (request.method === "GET" || request.method === "HEAD") &&
      url.pathname.startsWith("/audio/")
    ) {
      await streamAudio(
        response,
        this.options.config.libraryDir,
        decodeURIComponent(url.pathname),
        request.method === "HEAD",
      );
      return;
    }
    if (request.method === "POST" && url.pathname.startsWith("/simulate/")) {
      const [, , decision, slug] = url.pathname.split("/");
      if ((decision === "accept" || decision === "skip") && slug) {
        await this.decide(slug, decision);
        json(response, 200, { ok: true, decision, slug });
        return;
      }
    }
    json(response, 404, { error: "not_found" });
  }
}

async function streamAudio(
  response: ServerResponse,
  libraryDir: string,
  pathname: string,
  headOnly: boolean,
): Promise<void> {
  const filename = basename(pathname);
  const audioPath = resolve(join(libraryDir, "audio", filename));
  const audioRoot = resolve(join(libraryDir, "audio"));
  if (!audioPath.startsWith(audioRoot)) {
    json(response, 400, { error: "bad_audio_path" });
    return;
  }
  try {
    await access(audioPath);
  } catch {
    json(response, 404, { error: "audio_not_found" });
    return;
  }
  response.writeHead(200, { "content-type": "audio/mpeg" });
  if (headOnly) {
    response.end();
    return;
  }
  createReadStream(audioPath).pipe(response);
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(`${JSON.stringify(body)}\n`);
}

function html(response: ServerResponse, body: string): void {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(body);
}
