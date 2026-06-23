export function renderReaderHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Pirate Radio</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; padding: 24px; max-width: 840px; line-height: 1.45; }
    header { margin-bottom: 24px; }
    h1 { margin: 0 0 6px; font-size: 28px; }
    .item { border-top: 1px solid color-mix(in srgb, currentColor 18%, transparent); padding: 18px 0; }
    .meta { opacity: .72; font-size: 14px; margin: 4px 0 12px; }
    audio { width: 100%; }
  </style>
</head>
<body>
  <header>
    <h1>Pirate Radio</h1>
    <div class="meta">Pirate Wires audio library</div>
  </header>
  <main id="library">Loading...</main>
  <script>
    const root = document.getElementById("library");
    const keyFor = (slug) => "pirate-radio-position:" + slug;

    async function loadLibrary() {
      const response = await fetch("/library.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load library");
      const manifest = await response.json();
      root.textContent = "";
      if (!manifest.items || manifest.items.length === 0) {
        root.textContent = "No audio yet.";
        return;
      }
      for (const item of manifest.items) {
        const section = document.createElement("section");
        section.className = "item";
        const heading = document.createElement("h2");
        heading.textContent = item.title;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = [item.publishedAt, item.wordCount ? item.wordCount + " words" : ""].filter(Boolean).join(" · ");
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
        section.append(heading, meta, audio);
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
