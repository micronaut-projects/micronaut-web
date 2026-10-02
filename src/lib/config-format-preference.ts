import { readCodePreferenceQuery } from "@/lib/code-preference-query";

/** Configuration snippet tabs, named as the docs snippet templates name them. */
export const CONFIG_FORMATS = [
  { value: "properties", label: "Properties" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  { value: "groovy-config", label: "Groovy" },
  { value: "hocon", label: "HOCON" },
  { value: "json-config", label: "JSON" },
] as const;

export const DEFAULT_CONFIG_FORMAT = "properties";
export const CONFIG_FORMAT_COOKIE_NAME = "micronaut-config-format";
export const CONFIG_FORMAT_EVENT = "micronaut-web-config-format-change";

export function isConfigFormat(value: unknown): value is string {
  return CONFIG_FORMATS.some((format) => format.value === value);
}

export function readConfigFormatCookiePreference(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const prefix = `${CONFIG_FORMAT_COOKIE_NAME}=`;
  const value = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
  return isConfigFormat(value) ? value : undefined;
}

/** `?config-format=` for this page, else the saved choice. */
export function readConfigFormatPreference(): string {
  const query = readCodePreferenceQuery().configFormat;
  return (
    (isConfigFormat(query) ? query : undefined) ??
    readConfigFormatCookiePreference() ??
    DEFAULT_CONFIG_FORMAT
  );
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
  window.dispatchEvent(
    new CustomEvent<{ configFormat: string }>(CONFIG_FORMAT_EVENT, {
      detail: { configFormat },
    }),
  );
}
