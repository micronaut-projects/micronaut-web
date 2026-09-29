export type CodePreferenceQuery = {
  language?: string;
  buildTool?: string;
};

/**
 * `?lang=` and `?build=` pick the snippet tabs and guide variant for a shared
 * link, e.g. `?lang=python&build=pyronaut`. They override the saved cookie
 * preferences for that page only and are never persisted, so any value a tab
 * or variant uses works, including ones the site-wide preference lacks.
 */
export function readCodePreferenceQuery(): CodePreferenceQuery {
  const params = new URLSearchParams(window.location.search);
  const value = (name: string) =>
    params.get(name)?.trim().toLowerCase() || undefined;
  return { language: value("lang"), buildTool: value("build") };
}
