import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  newestVersion,
  releaseNotesUrl,
} from "../../../src/lib/latest-micronaut-release.ts";

describe("newestVersion", () => {
  test("picks the highest release, not the last one published", () => {
    // Listed newest-published first, as GitHub returns them.
    assert.equal(
      newestVersion([
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
      [{ tag_name: "v5.2.0-M1" }],
    ]) {
      assert.equal(newestVersion(payload), undefined);
    }
  });
});

test("releaseNotesUrl links the platform release", () => {
  assert.equal(
    releaseNotesUrl("5.1.4"),
    "https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.1.4",
  );
});
