import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";

import type { DocsProject } from "../../docs/project-manifest.ts";
import {
  crossLinkSplitPages,
  splitDocsProjects,
  type DocsProjectSplit,
} from "../../docs/project-splits.ts";
import { readGuideToc } from "../../docs/toc.ts";
import {
  docsProject,
  temporaryDirectory,
  writeTextFile,
} from "../support/temp-project.ts";

const split: DocsProjectSplit = {
  sourceSlug: "core",
  derived: { slug: "http", displayName: "Micronaut HTTP", projectKey: "http" },
  sections: ["httpServer", "httpClient"],
};

function coreProject(): DocsProject {
  return docsProject({
    slug: "core",
    displayName: "Micronaut Core",
    repositoryName: "micronaut-core",
  });
}

describe("splitDocsProjects", () => {
  test("renders one guide as the source project and the project split out of it", () => {
    const projects = splitDocsProjects([coreProject()], [split]);

    assert.deepEqual(
      projects.map((project) => [project.slug, project.guideSections]),
      [
        ["core", { mode: "exclude", sections: ["httpServer", "httpClient"] }],
        ["http", { mode: "include", sections: ["httpServer", "httpClient"] }],
      ],
    );
    const [core, http] = projects;
    assert.equal(http.derivedFrom, "core");
    assert.equal(http.displayName, "Micronaut HTTP");
    // Everything the docs are built from stays the source project's.
    assert.equal(http.repositoryUrl, core.repositoryUrl);
    assert.equal(http.submodulePath, core.submodulePath);
    assert.equal(http.platformVersionKey, core.platformVersionKey);
    assert.equal(http.branch, core.branch);
  });

  test("hands the promoted sections to the derived project only", () => {
    const [core, http] = splitDocsProjects(
      [coreProject()],
      [{ ...split, promoteChildren: ["httpServer"] }],
    );

    assert.equal(core.guideSections?.promoteChildren, undefined);
    assert.deepEqual(http.guideSections?.promoteChildren, ["httpServer"]);
  });

  test("leaves projects without a split alone", () => {
    const data = docsProject({
      slug: "data",
      displayName: "Micronaut Data",
      repositoryName: "micronaut-data",
    });

    assert.deepEqual(splitDocsProjects([data], [split]), [data]);
  });

  test("re-derives a project list that already carries the derived project", () => {
    const once = splitDocsProjects([coreProject()], [split]);

    assert.deepEqual(splitDocsProjects(once, [split]), once);
  });
});

describe("readGuideToc section selection", () => {
  async function guideDirectory(
    t: Parameters<typeof temporaryDirectory>[0],
  ): Promise<string> {
    const directory = await temporaryDirectory(t, "micronaut-web-split-");
    await writeTextFile(
      path.join(directory, "toc.yml"),
      [
        "title: Micronaut Core",
        "introduction: Introduction",
        "httpServer: The HTTP Server",
        "httpClient: The HTTP Client",
        "appendix: Appendix",
      ].join("\n"),
    );
    for (const file of [
      "introduction.adoc",
      "httpServer.adoc",
      "httpClient.adoc",
      "appendix.adoc",
    ]) {
      await writeTextFile(path.join(directory, file), "");
    }
    return directory;
  }

  test("numbers each project's share of the guide from one", async (t) => {
    const directory = await guideDirectory(t);

    const core = await readGuideToc(directory, {
      mode: "exclude",
      sections: ["httpServer", "httpClient"],
    });
    const http = await readGuideToc(directory, {
      mode: "include",
      sections: ["httpServer", "httpClient"],
    });

    assert.deepEqual(
      core.children.map((node) => [node.number, node.id]),
      [
        ["1", "introduction"],
        ["2", "appendix"],
      ],
    );
    assert.deepEqual(
      http.children.map((node) => [node.number, node.id]),
      [
        ["1", "httpServer"],
        ["2", "httpClient"],
      ],
    );
  });

  test("lifts the subsections of promoted sections to the top level", async (t) => {
    const directory = await temporaryDirectory(t, "micronaut-web-split-");
    await writeTextFile(
      path.join(directory, "toc.yml"),
      [
        "title: Micronaut Core",
        "introduction: Introduction",
        "httpServer:",
        "  title: The HTTP Server",
        "  routing: HTTP Routing",
        "  filters:",
        "    title: HTTP Filters",
        "    filterPatterns: Filter Patterns",
        "httpClient: The HTTP Client",
        "certificates: Certificate providers",
      ].join("\n"),
    );
    for (const file of [
      "introduction.adoc",
      "httpServer.adoc",
      "httpServer/routing.adoc",
      "httpServer/filters.adoc",
      "httpServer/filters/filterPatterns.adoc",
      "httpClient.adoc",
      "certificates.adoc",
    ]) {
      await writeTextFile(path.join(directory, file), "");
    }

    const http = await readGuideToc(directory, {
      mode: "include",
      sections: ["httpServer", "httpClient", "certificates"],
      promoteChildren: ["httpServer", "httpClient"],
    });

    const flat = (nodes: typeof http.children): string[][] =>
      nodes.flatMap((node) => [
        [node.number, String(node.level), node.id, node.file],
        ...flat(node.children),
      ]);
    assert.deepEqual(flat(http.children), [
      ["1", "0", "httpServer", "httpServer.adoc"],
      ["2", "0", "routing", path.join("httpServer", "routing.adoc")],
      ["3", "0", "filters", path.join("httpServer", "filters.adoc")],
      [
        "3.1",
        "1",
        "filterPatterns",
        path.join("httpServer", "filters", "filterPatterns.adoc"),
      ],
      ["4", "0", "httpClient", "httpClient.adoc"],
      ["5", "0", "certificates", "certificates.adoc"],
    ]);
  });

  test("skips a section the guide no longer has", async (t) => {
    const directory = await guideDirectory(t);

    const http = await readGuideToc(directory, {
      mode: "include",
      sections: ["httpServer", "certificates"],
    });

    assert.deepEqual(
      http.children.map((node) => node.id),
      ["httpServer"],
    );
  });

  test("fails when the guide has none of the selected sections", async (t) => {
    const directory = await guideDirectory(t);

    await assert.rejects(
      readGuideToc(directory, { mode: "include", sections: ["websocket"] }),
      /No TOC section of .* matches include websocket/,
    );
  });
});

describe("crossLinkSplitPages", () => {
  test("sends a link into the sibling page that defines it", () => {
    const linked = crossLinkSplitPages({
      core: '<h1 id="core-introduction">Introduction</h1><a href="#core-nettyHttpClient">Netty</a><a href="#core-introduction">Top</a>',
      http: '<h1 id="http-nettyHttpClient">Netty</h1><a href="#http-introduction">Introduction</a>',
    });

    assert.match(linked.core, /href="\.\.\/http\/#http-nettyHttpClient"/);
    assert.match(linked.core, /href="#core-introduction"/);
    assert.match(linked.http, /href="\.\.\/core\/#core-introduction"/);
  });

  test("leaves a link no sibling page defines alone", () => {
    const linked = crossLinkSplitPages({
      core: '<a href="#core-missing">Missing</a>',
      http: '<h1 id="http-routing">Routing</h1>',
    });

    assert.equal(linked.core, '<a href="#core-missing">Missing</a>');
  });
});
