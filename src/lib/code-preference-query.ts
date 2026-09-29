export type CodePreferenceQuery = {
  language?: string;
  buildTool?: string;
  configFormat?: string;
};

/**
 * `?lang=`, `?build=` and `?config-format=` pick the snippet tabs and guide
 * variant for a shared link, e.g. `?lang=python&build=pyronaut` or
 * `?config-format=toml`. They override the saved cookie preferences for that
 * page only and are never persisted, so any value a tab or variant uses works,
 * including ones the site-wide preference lacks.
 */
export function readCodePreferenceQuery(): CodePreferenceQuery {
  const params = new URLSearchParams(window.location.search);
  const value = (name: string) =>
    params.get(name)?.trim().toLowerCase() || undefined;
  const configFormat = value("config-format");
  return {
    language: value("lang"),
    buildTool: value("build"),
    // Groovy and JSON configuration tabs are named apart from the code tabs,
    // so `config-format=groovy` never switches code examples to Groovy.
    configFormat:
      configFormat === "groovy" || configFormat === "json"
        ? `${configFormat}-config`
        : configFormat,
  };
}
