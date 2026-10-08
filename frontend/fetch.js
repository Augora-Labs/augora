export async function fetchJson(url, options = {}) {
  const timeout = typeof options === "number" ? options : options.timeout ?? 9000;
  const allow404 = typeof options === "object" && options !== null ? Boolean(options.allow404) : false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (allow404 && response.status === 404) return null;
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
