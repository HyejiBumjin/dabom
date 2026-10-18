export function safeReturnPath(value: string | null | undefined, fallback = "/") {
  if (!value?.startsWith("/") || /[\u0000-\u0020\u007f]/u.test(value)) return fallback;
  try {
    const parsed = new URL(value, "https://dabom.invalid");
    // Dot-segment normalization can turn '/x/..//evil' into '//evil'. The
    // returned value is parsed a second time by the callback, so reject that too.
    if (parsed.origin !== "https://dabom.invalid" || parsed.pathname.startsWith("//")) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch { return fallback; }
}
