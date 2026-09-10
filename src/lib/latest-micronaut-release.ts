export type MicronautRelease = { version: string; releaseNotesUrl: string };

/**
 * The micronaut-platform release list. The platform is what "Micronaut x.y.z"
 * names, and it ships before micronaut-starter or launch.micronaut.io pick it
 * up. The list rather than `releases/latest`, which is the most recently
 * published release — a maintenance patch such as 4.10.x whenever one ships
 * after the current line.
 */
export const releasesUrl =
  "https://api.github.com/repos/micronaut-projects/micronaut-platform/releases";

/** The highest stable version in a GitHub release list, by version number. */
export function newestVersion(payload: unknown): string | undefined {
  if (!Array.isArray(payload)) {
    return undefined;
  }
  let newest: number[] | undefined;
  for (const release of payload) {
    const parts =
      !release?.draft &&
      !release?.prerelease &&
      typeof release?.tag_name === "string"
        ? /^v?(\d+)\.(\d+)\.(\d+)$/.exec(release.tag_name)?.slice(1).map(Number)
        : undefined;
    if (
      parts &&
      (!newest ||
        (parts[0] - newest[0] || parts[1] - newest[1] || parts[2] - newest[2]) >
          0)
    ) {
      newest = parts;
    }
  }
  return newest?.join(".");
}

export function releaseNotesUrl(version: string) {
  return `https://github.com/micronaut-projects/micronaut-platform/releases/tag/v${version}`;
}

let releasePromise: Promise<MicronautRelease | undefined> | undefined;

/**
 * Resolved once per build so the markup ships with a version even when the
 * browser refresh in `latest-release-refresh.ts` cannot run.
 */
export function latestMicronautRelease(): Promise<
  MicronautRelease | undefined
> {
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
      return response.json();
    })
    .then((payload: unknown) => {
      const version = newestVersion(payload);
      if (!version) {
        throw new Error("GitHub listed no stable Micronaut release");
      }
      return { version, releaseNotesUrl: releaseNotesUrl(version) };
    })
    .catch((error: unknown) => {
      console.warn("Could not resolve the latest Micronaut release", error);
      return undefined;
    }));
}
