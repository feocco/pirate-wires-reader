import type { LibraryItem } from "./library.js";
import type { Story, StoryContentBlock } from "./types.js";

const sharedCss = `
  :root {
    color-scheme: light;
    --ink: #050505;
    --paper: #e5e5e5;
    --muted: #555;
    --line: #111;
    --accent: #58ad5c;
    font-family: Arial, Helvetica, sans-serif;
  }
  * { box-sizing: border-box; }
  body { margin: 0; color: var(--ink); background: var(--paper); line-height: 1.35; }
  a { color: inherit; }
  .topbar { display: grid; grid-template-columns: 1fr 1fr 1fr; border-bottom: 1px solid var(--line); background: #000; color: #fff; }
  .topbar div { padding: 12px 18px; border-right: 1px solid #666; font-weight: 800; }
  .topbar div:nth-child(2) { background: var(--accent); color: #000; }
  .brandbar { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 18px 28px; background: var(--accent); border-bottom: 1px solid var(--line); font-weight: 900; }
  .brand { display: flex; align-items: center; gap: 16px; font-size: 24px; }
  .mark { font-size: 42px; letter-spacing: -2px; line-height: .8; }
  .wrap { width: min(1180px, calc(100vw - 32px)); margin: 0 auto; }
  .hero { padding: 54px 0 30px; border-bottom: 1px solid #999; }
  .kicker { font-weight: 900; text-transform: uppercase; font-size: 13px; letter-spacing: .08em; color: var(--muted); margin-bottom: 10px; }
  h1, h2, h3 { margin: 0; letter-spacing: 0; line-height: .95; }
  h1 { font-size: clamp(44px, 8vw, 92px); font-weight: 950; max-width: 980px; }
  .deck { max-width: 820px; margin-top: 18px; font-size: clamp(20px, 3vw, 30px); color: #222; }
  .library { display: grid; gap: 0; margin: 28px auto 60px; border-top: 2px solid var(--line); }
  .item { display: grid; grid-template-columns: minmax(220px, 36%) 1fr; gap: 22px; padding: 22px 0; border-bottom: 2px solid var(--line); }
  .thumb { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #c9c9c9; border: 1px solid var(--line); display: block; }
  .thumb.placeholder { display: grid; place-items: center; font-weight: 900; font-size: 40px; }
  .item h2 { font-size: clamp(31px, 4.8vw, 58px); font-weight: 950; }
  .meta { color: var(--muted); font-size: 14px; font-weight: 700; margin: 8px 0 12px; }
  .tagline { font-size: 18px; max-width: 820px; margin: 0 0 16px; }
  audio { width: 100%; display: block; margin-top: 14px; }
  .actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
  .readlink { display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 9px 13px; font-weight: 900; border: 1px solid #000; }
  .article-shell { width: min(1040px, calc(100vw - 32px)); margin: 0 auto; padding-bottom: 70px; }
  .article-hero { padding: 62px 0 26px; text-align: center; }
  .article-hero h1 { margin: 0 auto; }
  .article-hero .deck { margin-left: auto; margin-right: auto; }
  .article-meta { display: flex; justify-content: space-between; gap: 16px; padding: 20px 0; border-top: 1px solid #777; font-weight: 900; }
  .hero-image { width: 100%; max-height: 680px; object-fit: cover; border: 1px solid var(--line); display: block; }
  .player-panel { position: sticky; top: 0; z-index: 2; background: var(--paper); padding: 14px 0; border-bottom: 2px solid var(--line); }
  .body { max-width: 900px; margin: 42px auto 0; font-family: Georgia, "Times New Roman", serif; }
  .body p, .body blockquote, .body li { font-size: clamp(22px, 3vw, 36px); line-height: 1.33; margin: 0 0 30px; }
  .body h2 { font-family: Arial, Helvetica, sans-serif; font-size: clamp(40px, 6vw, 74px); margin: 58px 0 24px; font-weight: 950; }
  .body blockquote { border-left: 8px solid var(--accent); padding-left: 18px; }
  .body ul { margin: 0 0 30px; padding-left: 34px; }
  .word.current { background: var(--accent); box-shadow: 0 0 0 2px var(--accent); }
  .empty { padding: 40px 0; font-size: 22px; font-weight: 800; }
  @media (max-width: 760px) {
    .topbar { grid-template-columns: 1fr; }
    .topbar div { border-right: 0; border-bottom: 1px solid #666; }
    .brandbar { padding: 14px 16px; }
    .item { grid-template-columns: 1fr; }
    .article-meta { display: block; }
    .article-meta div + div { margin-top: 8px; }
  }
`;

export function renderReaderHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pirate Radio</title>
  <style>${sharedCss}</style>
</head>
<body>
  ${renderChrome()}
  <section class="hero wrap">
    <div class="kicker">Audio dispatches</div>
    <h1>Pirate Radio</h1>
    <p class="deck">A private Pirate Wires audio shelf with saved playback, cached art, and the full article one tap away.</p>
  </section>
  <main id="library" class="library wrap">Loading...</main>
  <script>
    const root = document.getElementById("library");
    const keyFor = (slug) => "pirate-radio-position:" + slug;

    function text(value) {
      return value == null ? "" : String(value);
    }

    async function loadLibrary() {
      const response = await fetch("/library.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load library");
      const manifest = await response.json();
      root.textContent = "";
      if (!manifest.items || manifest.items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No audio yet.";
        root.append(empty);
        return;
      }
      for (const item of manifest.items) {
        const section = document.createElement("section");
        section.className = "item";

        let image;
        if (item.imageUrl) {
          image = document.createElement("img");
          image.className = "thumb";
          image.src = item.imageUrl;
          image.alt = "";
          image.loading = "lazy";
        } else {
          image = document.createElement("div");
          image.className = "thumb placeholder";
          image.textContent = "PW";
        }

        const content = document.createElement("div");
        const heading = document.createElement("h2");
        heading.textContent = item.title;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = [item.publishedAt, item.wordCount ? item.wordCount + " words" : ""].filter(Boolean).join(" - ");
        const tagline = document.createElement("p");
        tagline.className = "tagline";
        tagline.textContent = text(item.tagline);
        const actions = document.createElement("div");
        actions.className = "actions";
        const readLink = document.createElement("a");
        readLink.className = "readlink";
        readLink.href = "/article/" + encodeURIComponent(item.slug);
        readLink.textContent = "Read";
        const audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "metadata";
        audio.src = item.audioUrl;
        audio.addEventListener("loadedmetadata", () => {
          const saved = Number(localStorage.getItem(keyFor(item.slug)) || 0);
          if (Number.isFinite(saved) && saved > 0 && saved < audio.duration) audio.currentTime = saved;
        });
        audio.addEventListener("timeupdate", () => {
          localStorage.setItem(keyFor(item.slug), String(audio.currentTime));
        });
        actions.append(readLink);
        content.append(heading, meta);
        if (item.tagline) content.append(tagline);
        content.append(actions, audio);
        section.append(image, content);
        root.append(section);
      }
    }

    loadLibrary().catch((error) => {
      root.textContent = error.message;
    });
  </script>
</body>
</html>`;
}

export function renderArticleHtml(story: Story, item: LibraryItem): string {
  const blocks = story.contentBlocks?.length
    ? story.contentBlocks
    : story.text.split(/\n{2,}/).filter(Boolean).map((text) => ({ type: "paragraph", text }) as StoryContentBlock);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(story.title)} - Pirate Radio</title>
  <style>${sharedCss}</style>
</head>
<body>
  ${renderChrome()}
  <article class="article-shell">
    <header class="article-hero">
      <div class="kicker">Pirate Wires</div>
      <h1>${escapeHtml(story.title)}</h1>
      ${story.tagline ? `<p class="deck">${escapeHtml(story.tagline)}</p>` : ""}
    </header>
    <div class="article-meta">
      <div>${escapeHtml(item.publishedAt || "Generated article")}</div>
      <div>${item.wordCount} words</div>
    </div>
    ${story.heroImageUrl || item.imageUrl ? `<img class="hero-image" src="${escapeAttribute(story.heroImageUrl ?? item.imageUrl ?? "")}" alt="">` : ""}
    <section class="player-panel">
      <a class="readlink" href="/">Library</a>
      <audio id="article-audio" controls preload="metadata" src="${escapeAttribute(item.audioUrl)}"></audio>
    </section>
    <section class="body" id="story-body">
      ${blocks.map(renderBlock).join("\n")}
    </section>
  </article>
  <script>
    const slug = ${JSON.stringify(item.slug)};
    const keyFor = (slug) => "pirate-radio-position:" + slug;
    const audio = document.getElementById("article-audio");
    audio.addEventListener("loadedmetadata", () => {
      const saved = Number(localStorage.getItem(keyFor(slug)) || 0);
      if (Number.isFinite(saved) && saved > 0 && saved < audio.duration) audio.currentTime = saved;
    });
    audio.addEventListener("timeupdate", () => {
      localStorage.setItem(keyFor(slug), String(audio.currentTime));
    });
    ${item.hasAlignment && item.alignmentUrl ? renderAlignmentScript(item.alignmentUrl) : ""}
  </script>
</body>
</html>`;
}

function renderChrome(): string {
  return `<nav class="topbar"><div>Pirate Wires</div><div>Technology</div><div>Culture</div></nav>
  <div class="brandbar"><div class="brand"><span class="mark">PW</span><span>Pirate Radio</span></div><div>AI-generated audio</div></div>`;
}

function renderBlock(block: StoryContentBlock): string {
  if (block.type === "heading") {
    return `<h2>${escapeHtml(block.text)}</h2>`;
  }
  if (block.type === "quote") {
    return `<blockquote>${renderWords(block.text)}</blockquote>`;
  }
  if (block.type === "list") {
    return `<ul><li>${renderWords(block.text)}</li></ul>`;
  }
  return `<p>${renderWords(block.text)}</p>`;
}

function renderWords(text: string): string {
  return text
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) {
        return part;
      }
      return `<span class="word" data-word-index="">${escapeHtml(part)}</span>`;
    })
    .join("");
}

function renderAlignmentScript(alignmentUrl: string): string {
  return `
    let alignmentWords = [];
    fetch(${JSON.stringify(alignmentUrl)}, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : undefined)
      .then((alignment) => {
        alignmentWords = Array.isArray(alignment?.words) ? alignment.words : [];
        const spans = Array.from(document.querySelectorAll(".word"));
        spans.forEach((span, index) => span.dataset.wordIndex = String(index));
      })
      .catch(() => {});
    audio.addEventListener("timeupdate", () => {
      if (!alignmentWords.length) return;
      const active = alignmentWords.findIndex((word) => audio.currentTime >= word.start && audio.currentTime <= word.end);
      document.querySelector(".word.current")?.classList.remove("current");
      if (active >= 0) {
        document.querySelector('[data-word-index="' + active + '"]')?.classList.add("current");
      }
    });`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
