import { parsePirateRadioAction, type ParsedPirateRadioAction } from "./notifications.js";

export interface HomeAssistantActionListenerOptions {
  haUrl?: string;
  token?: string;
  onAction: (action: ParsedPirateRadioAction) => Promise<void>;
}

export class HomeAssistantActionListener {
  private stopped = false;

  constructor(private readonly options: HomeAssistantActionListenerOptions) {}

  async start(): Promise<void> {
    if (!this.options.haUrl || !this.options.token) {
      console.log("[pirate-radio] Home Assistant action listener disabled: missing HA_URL or token");
      return;
    }

    while (!this.stopped) {
      try {
        await this.connectOnce();
      } catch (error) {
        if (!this.stopped) {
          console.error("[pirate-radio] Home Assistant listener error", error);
          await delay(5000);
        }
      }
    }
  }

  stop(): void {
    this.stopped = true;
  }

  private async connectOnce(): Promise<void> {
    const wsUrl = toWebSocketUrl(this.options.haUrl!);
    const socket = new WebSocket(wsUrl);
    let nextId = 1;

    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("Home Assistant WebSocket error")), {
        once: true,
      });
    });

    socket.addEventListener("message", async (event) => {
      const message = JSON.parse(String(event.data)) as Record<string, unknown>;
      if (message.type === "auth_required") {
        socket.send(JSON.stringify({ type: "auth", access_token: this.options.token }));
      } else if (message.type === "auth_ok") {
        socket.send(
          JSON.stringify({
            id: nextId++,
            type: "subscribe_events",
            event_type: "mobile_app_notification_action",
          }),
        );
        console.log("[pirate-radio] subscribed to Home Assistant mobile actions");
      } else if (message.type === "event") {
        const eventPayload = message.event as { data?: { action?: string } } | undefined;
        const actionName = eventPayload?.data?.action;
        if (actionName) {
          const parsed = parsePirateRadioAction(actionName);
          if (parsed) {
            await this.options.onAction(parsed);
          }
        }
      }
    });

    await new Promise<void>((resolve) => {
      socket.addEventListener("close", () => resolve(), { once: true });
    });
  }
}

function toWebSocketUrl(haUrl: string): string {
  const url = new URL(haUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/websocket";
  url.search = "";
  return url.toString();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
