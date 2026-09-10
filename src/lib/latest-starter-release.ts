export type StarterRelease = {
  version: string;
  releaseNotesUrl: string;
  binaryUrl: string;
};

/**
 * The release list rather than `releases/latest`: GitHub's "latest" is the most
 * recently published release, which is a maintenance patch such as 4.10.x
 * whenever one ships after the current line. `newestRelease` picks from it.
 */
const releasesUrl =
  "https://api.github.com/repos/micronaut-projects/micronaut-starter/releases";

const launchVersionsUrl = "https://launch.micronaut.io/versions";

/** The only origins launch.micronaut.io answers cross-origin reads for. */
const launchCorsHosts = new Set(["micronaut.io", "www.micronaut.io"]);

export type ReleaseSource = { kind: "launch" | "github"; url: string };

/**
 * Picks where the browser reads the current release from. The production site
 * asks launch.micronaut.io, which is Micronaut's own service and imposes no
 * request budget on visitors. Every other host — previews, localhost — is not
 * on the launch CORS allowlist and falls back to the GitHub API, whose
 * unauthenticated 60-per-hour-per-IP limit only has to cover preview traffic.
 */
export function releaseSourceFor(hostname: string): ReleaseSource {
  return launchCorsHosts.has(hostname)
    ? { kind: "launch", url: launchVersionsUrl }
    : { kind: "github", url: releasesUrl };
}

type GitHubRelease = {
  tag_name?: unknown;
  draft?: unknown;
  prerelease?: unknown;
};

/** The highest stable version in a GitHub release list, by version number. */
export function newestRelease<T extends GitHubRelease>(
  releases: T[],
): T | undefined {
  const parts = (release: T) =>
    typeof release.tag_name === "string"
      ? /^v?(\d+)\.(\d+)\.(\d+)$/.exec(release.tag_name)?.slice(1).map(Number)
      : undefined;
  return releases
    .filter(
      (release) => !release.draft && !release.prerelease && parts(release),
    )
    .sort((a, b) => {
      const [x, y] = [parts(a)!, parts(b)!];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    })[0];
}

/** Reads the version out of whichever payload `releaseSourceFor` selected. */
export function versionFromReleasePayload(
  kind: ReleaseSource["kind"],
  payload: unknown,
): string | undefined {
  const raw =
    kind === "launch"
      ? (payload as { versions?: Record<string, unknown> })?.versions?.[
          "micronaut.version"
        ]
      : Array.isArray(payload)
        ? newestRelease(payload)?.tag_name
        : undefined;
  if (typeof raw !== "string") {
    return undefined;
  }
  const version = raw.replace(/^v/, "");
  // Anything that is not a release number would build links to a missing tag.
  return /^\d+\.\d+\.\d+/.test(version) ? version : undefined;
}

/** The release links a version resolves to, shared by build and browser. */
export function starterReleaseUrls(version: string) {
  const releases =
    "https://github.com/micronaut-projects/micronaut-starter/releases";
  return {
    releaseNotesUrl: `${releases}/tag/v${version}`,
    binaryUrl: `${releases}/download/v${version}/micronaut-cli-${version}.zip`,
  };
}

let releasePromise: Promise<StarterRelease | undefined> | undefined;

/**
 * Resolved once per build so the markup ships with a correct version even when
 * the browser refresh in `latest-release-refresh.astro` cannot run — no
 * scripting, a blocked request, or a preview host that launch.micronaut.io
 * does not answer.
 */
export function latestStarterRelease(): Promise<StarterRelease | undefined> {
  return (releasePromise ??= fetch(releasesUrl, {
    headers: { Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(10_000),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `GitHub releases request failed with ${response.status}`,
        );
      }
      return response.json() as Promise<
        Array<{
          tag_name: string;
          draft: boolean;
          prerelease: boolean;
          html_url: string;
          assets: Array<{ name: string; browser_download_url: string }>;
        }>
      >;
    })
    .then((releases) => {
      const release = newestRelease(releases);
      const version = release?.tag_name.replace(/^v/, "");
      const binary = release?.assets.find(
        (asset) => asset.name === `micronaut-cli-${version}.zip`,
      );
      if (!release || !version || !binary) {
        throw new Error(
          "GitHub newest release is missing the Micronaut CLI ZIP asset",
        );
      }
      return {
        version,
        releaseNotesUrl: release.html_url,
        binaryUrl: binary.browser_download_url,
      };
    })
    .catch((error: unknown) => {
      console.warn("Could not resolve the Micronaut download release", error);
      return undefined;
    }));
}

/**
 * Fills the download page's release placeholders. When the release cannot be
 * resolved the markup keeps its `releases/latest` links, which already land on
 * the right page.
 */
export async function withLatestStarterRelease(html: string): Promise<string> {
  const release = await latestStarterRelease();
  if (!release) {
    return html;
  }
  return withHref(
    withHref(
      html.replace(
        /(<span\b[^>]*\bdata-micronaut-download-version\b[^>]*>)[^<]*(<\/span>)/,
        `$1v${escapeHtml(release.version)}$2`,
      ),
      "data-micronaut-release-notes",
      release.releaseNotesUrl,
    ),
    "data-micronaut-download-binary",
    release.binaryUrl,
  );
}

function withHref(html: string, marker: string, href: string) {
  return html.replace(new RegExp(`<a\\b[^>]*\\b${marker}\\b[^>]*>`), (tag) =>
    tag.replace(/href="[^"]*"/, `href="${escapeHtml(href)}"`),
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
