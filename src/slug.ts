export function slugFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastPart = pathname.split("/").filter(Boolean).at(-1);
    if (lastPart) {
      return sanitizeSlug(lastPart);
    }
  } catch {
    // Fall through to generic slugging.
  }
  return sanitizeSlug(url);
}

export function sanitizeSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "story"
  );
}
