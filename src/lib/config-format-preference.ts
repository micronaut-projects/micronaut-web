/** Configuration snippet tabs, named as the docs snippet templates name them. */
const CONFIG_FORMATS = [
  "properties",
  "yaml",
  "toml",
  "groovy-config",
  "hocon",
  "json-config",
];

const CONFIG_FORMAT_COOKIE_NAME = "micronaut-config-format";

export function isConfigFormat(value: unknown): value is string {
  return CONFIG_FORMATS.includes(value as string);
}

export function readConfigFormatCookiePreference(): string | undefined {
  const prefix = `${CONFIG_FORMAT_COOKIE_NAME}=`;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return isConfigFormat(value) ? value : undefined;
}

/** Shared with the other subdomains the same way as the build-tool cookie. */
export function saveConfigFormatPreference(configFormat: string): void {
  const labels = window.location.hostname.split(".");
  const domain =
    labels.length > 1 && !/^\d+$/.test(labels[labels.length - 1])
      ? `; domain=.${labels.slice(-2).join(".")}`
      : "";
  try {
    document.cookie = `${CONFIG_FORMAT_COOKIE_NAME}=${configFormat}; path=/; max-age=31536000; SameSite=Lax${domain}`;
  } catch {
    // Cookie failure is non-fatal
  }
}
