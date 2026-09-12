export type BuildTool = "gradle" | "maven";

export const BUILD_TOOLS: readonly BuildTool[] = ["gradle", "maven"];

export const BUILD_TOOL_LABELS: Record<BuildTool, string> = {
  gradle: "Gradle",
  maven: "Maven",
};

export const DEFAULT_BUILD_TOOL: BuildTool = "gradle";
export const BUILD_TOOL_COOKIE_NAME = "micronaut-build-tool";
export const BUILD_TOOL_EVENT = "micronaut-web-build-tool-change";

export function isBuildTool(value: unknown): value is BuildTool {
  return value === "gradle" || value === "maven";
}

/**
 * localStorage is per origin, so a choice made on docs.micronaut.io never
 * reaches micronaut.io or guides.micronaut.io. A cookie on the registrable
 * parent domain is shared by all three.
 */
export function buildToolCookie(
  buildTool: BuildTool,
  hostname: string,
): string {
  const labels = hostname.split(".");
  const domain =
    labels.length > 1 && !/^\d+$/.test(labels[labels.length - 1])
      ? `; domain=.${labels.slice(-2).join(".")}`
      : "";
  return `${BUILD_TOOL_COOKIE_NAME}=${buildTool}; path=/; max-age=31536000; SameSite=Lax${domain}`;
}

export function readBuildToolPreference(): BuildTool {
  return readBuildToolCookiePreference() ?? DEFAULT_BUILD_TOOL;
}

export function readBuildToolCookiePreference(): BuildTool | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${BUILD_TOOL_COOKIE_NAME}=`)) {
      const value = trimmed.slice(BUILD_TOOL_COOKIE_NAME.length + 1);
      if (isBuildTool(value)) {
        return value;
      }
    }
  }
  return undefined;
}

export function saveBuildToolPreference(buildTool: BuildTool): void {
  try {
    document.cookie = buildToolCookie(buildTool, window.location.hostname);
  } catch {
    // Cookie failure is non-fatal
  }
  window.dispatchEvent(
    new CustomEvent<{ buildTool: BuildTool }>(BUILD_TOOL_EVENT, {
      detail: { buildTool },
    }),
  );
}
