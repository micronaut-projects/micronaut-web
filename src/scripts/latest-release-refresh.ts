import {
  newestVersion,
  releaseNotesUrl,
  releasesUrl,
} from "@/lib/latest-micronaut-release";

/**
 * Refreshes the release version in the browser so a new Micronaut release shows
 * on the site without waiting for a redeploy. The markup already carries the
 * version resolved at build time, so a failed request — GitHub allows 60
 * unauthenticated requests per hour per visitor IP — leaves a correct, if
 * older, page rather than an empty one.
 */
const versionTargets = document.querySelectorAll<HTMLElement>(
  "[data-micronaut-release-version]",
);
const notesTargets = document.querySelectorAll<HTMLAnchorElement>(
  "a[data-micronaut-release-notes]",
);

if (versionTargets.length || notesTargets.length) {
  fetch(releasesUrl, { signal: AbortSignal.timeout(5_000) })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Release request failed with ${response.status}`);
      }
      return response.json();
    })
    .then((payload: unknown) => {
      const version = newestVersion(payload);
      if (!version) {
        return;
      }
      for (const target of versionTargets) {
        const format = target.dataset.micronautReleaseVersion || "{version}";
        target.textContent = format.replace("{version}", version);
      }
      for (const target of notesTargets) {
        target.href = releaseNotesUrl(version);
      }
    })
    .catch(() => {
      // The build-time version stays on the page.
    });
}
