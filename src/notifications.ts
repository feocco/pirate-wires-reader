import type { PirateArticle } from "./feed.js";
import { slugFromUrl } from "./slug.js";

export type PirateRadioDecision = "accept" | "skip";

export interface NotificationButton {
  title: string;
  action: string;
  uri?: string;
}

export interface ArticleNotification {
  title: string;
  message: string;
  tag: string;
  group: string;
  url?: string;
  buttons: NotificationButton[];
}

export interface ParsedPirateRadioAction {
  decision: PirateRadioDecision;
  slug: string;
}

const ACCEPT_PREFIX = "PIRATE_RADIO_ACCEPT::";
const SKIP_PREFIX = "PIRATE_RADIO_SKIP::";

export function buildArticleNotification(
  article: PirateArticle,
  readerBaseUrl?: string,
): ArticleNotification {
  const slug = article.slug ?? slugFromUrl(article.url);
  return {
    title: "Pirate Radio",
    message: `${article.title}${article.author ? ` by ${article.author}` : ""}`,
    tag: `pirate-radio-${slug}`,
    group: "pirate-radio",
    url: readerBaseUrl,
    buttons: [
      {
        title: "Yes",
        action: `${ACCEPT_PREFIX}${slug}`,
      },
      {
        title: "No",
        action: `${SKIP_PREFIX}${slug}`,
      },
    ],
  };
}

export function parsePirateRadioAction(action: string): ParsedPirateRadioAction | null {
  if (action.startsWith(ACCEPT_PREFIX)) {
    return { decision: "accept", slug: action.slice(ACCEPT_PREFIX.length) };
  }
  if (action.startsWith(SKIP_PREFIX)) {
    return { decision: "skip", slug: action.slice(SKIP_PREFIX.length) };
  }
  return null;
}
