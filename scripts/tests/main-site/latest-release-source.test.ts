import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  releaseSourceFor,
  starterReleaseUrls,
  versionFromReleasePayload,
} from "../../../src/lib/latest-starter-release.ts";

describe("releaseSourceFor", () => {
  test("reads the production site from launch.micronaut.io", () => {
    for (const hostname of ["micronaut.io", "www.micronaut.io"]) {
      assert.deepEqual(releaseSourceFor(hostname), {
        kind: "launch",
        url: "https://launch.micronaut.io/versions",
      });
    }
  });

  test("falls back to GitHub where launch sends no CORS header", () => {
    for (const hostname of [
      "micronaut-projects.github.io",
      "localhost",
      "127.0.0.1",
    ]) {
      assert.equal(releaseSourceFor(hostname).kind, "github");
    }
  });
});

describe("versionFromReleasePayload", () => {
  test("reads the platform version out of the launch payload", () => {
    assert.equal(
      versionFromReleasePayload("launch", {
        versions: {
          "micronaut.version": "5.1.2",
          "micronaut.aot.version": "3.1.0",
        },
      }),
      "5.1.2",
    );
  });

  test("picks the highest GitHub release, not the last one published", () => {
    // Listed newest-published first, as GitHub returns them.
    assert.equal(
      versionFromReleasePayload("github", [
        { tag_name: "v4.10.18", draft: false, prerelease: false },
        { tag_name: "v5.2.0-RC1", draft: false, prerelease: true },
        { tag_name: "v5.2.0", draft: true, prerelease: false },
        { tag_name: "v5.1.10", draft: false, prerelease: false },
        { tag_name: "v5.1.9", draft: false, prerelease: false },
      ]),
      "5.1.10",
    );
  });

  test("rejects anything that would build a link to a missing tag", () => {
    for (const payload of [
      {},
      [],
      [{ tag_name: 5 }],
      [{ tag_name: "latest" }],
      { versions: {} },
    ]) {
      assert.equal(versionFromReleasePayload("github", payload), undefined);
      assert.equal(versionFromReleasePayload("launch", payload), undefined);
    }
  });
});

test("starterReleaseUrls builds the published release and CLI archive links", () => {
  assert.deepEqual(starterReleaseUrls("5.1.2"), {
    releaseNotesUrl:
      "https://github.com/micronaut-projects/micronaut-starter/releases/tag/v5.1.2",
    binaryUrl:
      "https://github.com/micronaut-projects/micronaut-starter/releases/download/v5.1.2/micronaut-cli-5.1.2.zip",
  });
});
