import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { assertNoRuntimeGeneratedRendering } from "../support/html.ts";
import { projectDirectory } from "../support/paths.ts";

const execFile = promisify(execFileCallback);

// These tests pin how the docs surface is wired together: package scripts,
// workflows, the catalog fixture, routes and the scripts that hydrate the
// rendered fragments. They read source files rather than rendering anything.

test("module documentation references do not link to legacy guides", async () => {
  const catalog = await fs.readFile(
    path.join(projectDirectory, "src", "lib", "content-catalog.ts"),
    "utf8",
  );

  const references = catalog.match(
    /function docsProjectReferences[\s\S]*?\n}\n/,
  )?.[0];

  assert.ok(references);
  assert.doesNotMatch(references, /label: "Guide"/);
  assert.match(references, /label: "Repository"/);
});

test("generated docs are prepared before Astro dev and build", async (): Promise<void> => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  );
  const playwrightFixtureScript = await fs.readFile(
    path.join(
      projectDirectory,
      "tests",
      "playwright",
      "generated-content-fixtures.ts",
    ),
    "utf8",
  );
  const browserTestRunner = await fs.readFile(
    path.join(projectDirectory, "scripts", "run-browser-tests.ts"),
    "utf8",
  );

  assert.equal(
    packageJson.scripts["prepare:generated-docs"],
    "npm run render:docs",
  );
  assert.equal(
    packageJson.scripts["prepare:generated-content"],
    "node scripts/prepare-generated-content.ts",
  );
  assert.equal(
    packageJson.scripts["test:docs"],
    "node --test scripts/tests/docs/*.test.ts && node scripts/run-browser-tests.ts docs",
  );
  assert.equal(
    packageJson.scripts["test:docs:browser"],
    "node scripts/ensure-playwright-chromium.ts && node tests/playwright/generated-content-fixtures.ts docs && playwright test --config playwright.config.ts tests/playwright/docs.spec.ts",
  );
  assert.match(browserTestRunner, /npm_execpath/);
  assert.equal(
    await fileExists(
      path.join(
        projectDirectory,
        "scripts",
        "prepare-playwright-generated-content.ts",
      ),
    ),
    false,
  );
  assert.equal(
    await fileExists(
      path.join(
        projectDirectory,
        "tests",
        "playwright",
        "generated-content-fixtures.ts",
      ),
    ),
    true,
  );
  assert.equal(
    await fileExists(
      path.join(
        projectDirectory,
        "fixtures",
        "generated-content",
        "docs",
        "docs-projects.fixture.json",
      ),
    ),
    true,
  );
  assert.equal(
    await fileExists(
      path.join(
        projectDirectory,
        "fixtures",
        "generated-content",
        "guides",
        "version.txt",
      ),
    ),
    true,
  );
  assert.match(playwrightFixtureScript, /fixtures[\s\S]*generated-content/);
  assert.doesNotMatch(
    playwrightFixtureScript,
    /MICRONAUT_DOCS_PROJECTS_DIR|MICRONAUT_GUIDES_DIR|writeFallback|fallback/i,
  );
  assertScriptOrder(
    packageJson.scripts.dev,
    "npm run prepare:generated-content",
    "astro dev",
  );
  assertScriptOrder(
    packageJson.scripts["build:artifact"],
    "npm run prepare:generated-content",
    "astro build",
  );
  assertScriptOrder(
    packageJson.scripts["build:artifact"],
    "astro build",
    "node scripts/build-site-header-shell.ts",
  );
  // The shell is a browser payload, so it must exist before it is asserted on.
  assertScriptOrder(
    packageJson.scripts["build:artifact"],
    "node scripts/build-site-header-shell.ts",
    "node scripts/assert-browser-runtime-assets.ts",
  );
  assertScriptOrder(
    packageJson.scripts["build:artifact"],
    "node scripts/assert-browser-runtime-assets.ts",
    "node scripts/prepare-template-artifacts.ts",
  );

  // `build` and `build:site` are the human entry points and keep running the
  // full check first; surface builds go straight to `build:artifact`.
  for (const script of ["build", "build:site"]) {
    assertScriptOrder(
      packageJson.scripts[script],
      "npm run check",
      "npm run build:artifact",
    );
  }
  assert.doesNotMatch(
    packageJson.scripts["build:artifact"],
    /npm run check/,
    "build:artifact must not re-run the check suite",
  );
});

test("generated docs fragments and assets are ignored and not tracked source", async (): Promise<void> => {
  const ignoredPaths = [
    "src/content/generated-docs/generated-docs-test.html",
    "src/content/generated-docs/project-catalog.json",
    "src/content/generated-docs/assets/generated-docs-test/docs/img/example.png",
  ];
  const { stdout: ignoredOutput } = await execFile(
    "git",
    ["check-ignore", ...ignoredPaths],
    {
      cwd: projectDirectory,
    },
  );
  assert.deepEqual(lines(ignoredOutput), ignoredPaths);

  const { stdout: trackedOutput } = await execFile(
    "git",
    ["ls-files", "--", "src/content/generated-docs"],
    {
      cwd: projectDirectory,
    },
  );
  const trackedGeneratedOutput = lines(trackedOutput).filter(
    (file: any): any =>
      file.endsWith(".html") ||
      file.startsWith("src/content/generated-docs/assets/"),
  );
  assert.deepEqual(trackedGeneratedOutput, []);
});

test("Tailwind does not scan generated docs and guides fragments", async (): Promise<void> => {
  const globalsCss = await fs.readFile(
    path.join(projectDirectory, "src", "styles", "globals.css"),
    "utf8",
  );
  const generatedDocsExclusion =
    '@source not "../content/generated-docs/**/*";';
  const generatedGuidesExclusion =
    '@source not "../content/generated-guides/**/*";';

  assertScriptOrder(
    globalsCss,
    '@import "tailwindcss/index.css";',
    generatedDocsExclusion,
  );
  assertScriptOrder(
    globalsCss,
    generatedDocsExclusion,
    generatedGuidesExclusion,
  );
});

test("generated docs images default to a white surface", async (): Promise<void> => {
  const generatedDocsCss = await fs.readFile(
    path.join(projectDirectory, "src", "styles", "generated-docs-content.css"),
    "utf8",
  );

  assert.match(
    generatedDocsCss,
    /& img \{\s*@apply h-auto max-w-full bg-white;/,
  );
});

test("generated docs tooling uses Micronaut Platform catalog instead of the old aggregate docs project", async (): Promise<void> => {
  const checkedFiles = [
    ".github/workflows/deploy-docs.yml",
    ".github/workflows/deploy-web.yml",
    "README.md",
    "src/content/generated-docs/README.md",
    "src/data/docs-projects.fixture.json",
    "scripts/render-docs.ts",
    "scripts/sync-docs-fixture.ts",
  ];
  const fileContents = await Promise.all(
    checkedFiles.map(async (file: any): Promise<any> => [
      file,
      await fs.readFile(path.join(projectDirectory, file), "utf8"),
    ]),
  );
  const workflow = fileContents.find(
    ([file]: any): any => file === ".github/workflows/deploy-docs.yml",
  )[1];
  const webWorkflow = fileContents.find(
    ([file]: any): any => file === ".github/workflows/deploy-web.yml",
  )[1];
  const syncScript = fileContents.find(
    ([file]: any): any => file === "scripts/sync-docs-fixture.ts",
  )[1];

  assert.match(
    workflow,
    /PLATFORM_REPOSITORY:\s*micronaut-projects\/micronaut-platform/,
  );
  assert.match(workflow, /DOCS_RENDER_ALL:\s*"true"/);
  assert.match(workflow, /DOCS_SYNC_SOURCES:\s*"true"/);
  assert.doesNotMatch(workflow, /micronaut-guides/);
  assert.doesNotMatch(workflow, /MICRONAUT_GUIDES_DIR/);
  assert.doesNotMatch(workflow, /GUIDES_RENDER_ALL/);
  assert.doesNotMatch(workflow, /GUIDES_RENDER_STRICT/);
  assert.doesNotMatch(webWorkflow, /micronaut-platform/);
  assert.doesNotMatch(webWorkflow, /DOCS_RENDER_ALL/);
  assert.doesNotMatch(webWorkflow, /DOCS_SYNC_SOURCES/);
  assert.match(syncScript, /readPlatformCatalogProjects/);

  const oldAggregateDocsProject = new RegExp("micronaut-platform-" + "docs");
  const oldPublishedDocsAggregate = new RegExp(
    String.raw`dstepanov\.github\.io\/micronaut-platform-` + "docs",
  );
  for (const [file, content] of fileContents) {
    assert.doesNotMatch(
      content,
      oldAggregateDocsProject,
      `${file} should not reference the old aggregate docs project`,
    );
    assert.doesNotMatch(
      content,
      oldPublishedDocsAggregate,
      `${file} should not reference the old published docs aggregate`,
    );
  }
});

test("docs project catalog uses unique project and category icons", async (): Promise<void> => {
  const catalog = JSON.parse(
    await fs.readFile(
      path.join(projectDirectory, "src", "data", "docs-projects.fixture.json"),
      "utf8",
    ),
  );
  const iconEntries = [
    ...catalog.categories.map((category: any): any => ({
      icon: category.icon,
      owner: `category:${category.slug}`,
    })),
    ...catalog.projects.map((project: any): any => ({
      icon: project.icon,
      owner: `project:${project.slug}`,
    })),
  ];
  const lucideIcons = await catalogLucideIconComponents();
  const ownersByIcon = new Map<string, string[]>();
  const unsupportedIcons: string[] = [];
  for (const entry of iconEntries) {
    const icon = await resolvedCatalogIconIdentity(entry.icon, lucideIcons);
    if (!icon) {
      unsupportedIcons.push(entry.icon);
      continue;
    }
    ownersByIcon.set(icon, [...(ownersByIcon.get(icon) || []), entry.owner]);
  }
  const duplicateIcons = [...ownersByIcon.entries()]
    .filter(([, owners]): any => owners.length > 1)
    .map(([icon, owners]): any => `${icon}: ${owners.join(", ")}`)
    .sort();

  assert.deepEqual([...new Set(unsupportedIcons)].sort(), []);
  assert.deepEqual(duplicateIcons, []);
});

test("docs project catalog leads the landing page with the most popular projects", async (): Promise<void> => {
  const catalog = JSON.parse(
    await fs.readFile(
      path.join(projectDirectory, "src", "data", "docs-projects.fixture.json"),
      "utf8",
    ),
  );
  assert.deepEqual(
    catalog.categories.find(
      (category: any): boolean => category.slug === "most-popular",
    )?.projectSlugs,
    ["core", "http", "data", "security", "openapi"],
  );
  assert.deepEqual(
    catalog.categories.find(
      (category: any): boolean => category.slug === "core",
    )?.projectSlugs,
    ["core", "http", "security"],
  );
  assert.deepEqual(
    catalog.categories
      .find((category: any): boolean => category.slug === "data-access")
      ?.projectSlugs?.slice(0, 1),
    ["data"],
  );
  assert.deepEqual(
    catalog.categories.find(
      (category: any): boolean => category.slug === "security",
    ),
    undefined,
  );
  assert.equal(
    catalog.categories
      .find((category: any): boolean => category.slug === "api")
      ?.projectSlugs?.includes("openapi"),
    true,
  );
});

test("docs routes render generated fragments and serve generated assets", async (): Promise<void> => {
  const docsPageSource = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "docs", "[slug].astro"),
    "utf8",
  );
  const generatedDocsHashAlignerSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "scripts",
      "generated-docs-hash-aligner.ts",
    ),
    "utf8",
  );
  const assetsRouteSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "pages",
      "docs",
      "assets",
      "[...path].ts",
    ),
    "utf8",
  );
  const searchIndexRouteSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "pages",
      "docs",
      "[searchIndex].json.ts",
    ),
    "utf8",
  );
  const docsIndexSource = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "docs", "index.astro"),
    "utf8",
  );
  const generatedDocsStaticEnhancerSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "generated-docs-static-enhancer.astro",
    ),
    "utf8",
  );
  const docsShellSource = await fs.readFile(
    path.join(projectDirectory, "src", "components", "web", "docs-shell.astro"),
    "utf8",
  );
  const docsSidebarContentSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "docs-sidebar-content.astro",
    ),
    "utf8",
  );
  const docsVersionSelectorSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "docs-version-selector.astro",
    ),
    "utf8",
  );
  const docsScrollSpyComponentSource = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "docs-scroll-spy.astro",
    ),
    "utf8",
  );
  const docsScrollSpySource = await fs.readFile(
    path.join(projectDirectory, "src", "scripts", "docs-scroll-spy.ts"),
    "utf8",
  );
  const sectionPageIndexSource = await fs.readFile(
    path.join(projectDirectory, "src", "scripts", "section-page-index.ts"),
    "utf8",
  );

  assert.match(
    docsPageSource,
    /readFile\(\s*join\(\s*process\.cwd\(\),[\s\S]*"generated-docs",[\s\S]*`\$\{project\.slug\}\.html`/,
  );
  assert.match(docsPageSource, /data-generated-docs/);
  // The chapter renders as one block: the related-guides accordion used to be
  // spliced between the chapter title and its first paragraph.
  assert.match(docsPageSource, /set:html=\{generatedDocHtml\}/);
  assert.doesNotMatch(docsPageSource, /generatedDocHtmlParts/);
  assert.ok(
    docsPageSource.indexOf("<DocsRelatedGuides") <
      docsPageSource.indexOf("set:html={generatedDocHtml}"),
    "related guides lead the content column ahead of the generated chapter",
  );
  assert.match(docsPageSource, /@\/scripts\/generated-docs-hash-aligner/);
  assert.doesNotMatch(docsPageSource, /generatedDocsHashAlignerUrl|\?url/);
  assert.doesNotMatch(docsPageSource, /<script is:inline>/);
  assert.doesNotMatch(docsPageSource, /alignHash|window\.scrollTo/);
  assertNoRuntimeGeneratedRendering("docs route", docsPageSource);
  assert.match(generatedDocsHashAlignerSource, /alignGeneratedDocsHash/);
  assert.match(
    generatedDocsHashAlignerSource,
    /scheduleGeneratedDocsHashAlignment/,
  );
  assert.match(generatedDocsHashAlignerSource, /window\.scrollTo/);
  assert.match(generatedDocsHashAlignerSource, /data-generated-docs/);
  assert.match(generatedDocsHashAlignerSource, /astro:hydrate/);
  assert.match(
    docsPageSource,
    /canonicalSurfaceUrl\("docs", `\/docs\/\$\{project\.slug\}\/`\)/,
  );
  assert.match(docsPageSource, /canonicalUrl=\{canonicalUrl\}/);
  assert.match(docsPageSource, /GeneratedDocsStaticEnhancer/);
  assert.doesNotMatch(
    docsPageSource,
    /from "@\/components\/web\/generated-docs-enhancer\.astro"/,
  );
  assert.doesNotMatch(docsPageSource, /GeneratedDocsPropertiesFallback/);
  assertNoRuntimeGeneratedRendering(
    "docs static enhancer",
    generatedDocsStaticEnhancerSource,
  );
  assert.doesNotMatch(generatedDocsStaticEnhancerSource, /define:vars/);
  assert.match(
    generatedDocsStaticEnhancerSource,
    /@\/scripts\/generated-docs-static-enhancer/,
  );
  assert.match(
    assetsRouteSource,
    /"src",\s*"content",\s*"generated-docs",\s*"assets",?/,
  );
  assert.match(
    assetsRouteSource,
    /fs\.readFile\(\s*path\.join\(generatedAssetsDirectory/,
  );
  assert.match(searchIndexRouteSource, /buildDocsSearchIndex/);
  assert.match(searchIndexRouteSource, /"generated-docs"/);
  assert.match(docsIndexSource, /loadDocsProjectCatalog/);
  assert.match(docsPageSource, /loadDocsProjectCatalog/);
  assert.match(searchIndexRouteSource, /loadDocsProjectCatalog/);
  assert.match(docsSidebarContentSource, /category\.slug !== "most-popular"/);
  // The released deployment reads its published manifest; the snapshot hosts
  // no release line, so it names itself and asks for no manifest at all.
  assert.match(
    docsSidebarContentSource,
    /versionManifestHref=\{isDocsSnapshot \? "" : "\/versions\.json"\}/,
  );
  assert.match(docsSidebarContentSource, /label: "Snapshot"/);
  assert.match(
    docsSidebarContentSource,
    /isActiveProject[\s\S]*\? `#\$\{project\.slug\}-docs`[\s\S]*: withBasePath\(project\.href\)/,
  );
  assert.match(docsSidebarContentSource, /DocsVersionSelector/);
  assert.doesNotMatch(docsSidebarContentSource, /DocsVersionSwitcher/);
  assert.doesNotMatch(docsSidebarContentSource, /client:idle/);
  assert.match(docsShellSource, /docs-scroll-spy\.astro/);
  assert.match(docsShellSource, /<DocsScrollSpy \/>/);
  assert.match(docsShellSource, /instanceId="desktop"/);
  assert.match(docsShellSource, /instanceId="mobile"/);
  assert.doesNotMatch(docsShellSource, /DocsScrollSpy client:idle/);
  assert.doesNotMatch(docsScrollSpySource, /"use client"/);
  assert.match(docsSidebarContentSource, /data-docs-scroll-container/);
  assert.match(docsSidebarContentSource, /data-docs-project-section-toggle/);
  assert.match(docsSidebarContentSource, /data-docs-project-sections/);
  assert.match(
    docsSidebarContentSource,
    /aria-expanded=\{hasActiveSections \? "true" : undefined\}/,
  );
  assert.match(
    docsSidebarContentSource,
    /aria-controls=\{\s*hasActiveSections \? projectSectionsId : undefined\s*\}/,
  );
  assert.doesNotMatch(
    docsSidebarContentSource,
    /data-\[active=true\]:before:bg-brand/,
  );
  assert.match(docsPageSource, /id=\{`\$\{project\.slug\}-docs`\}/);
  assert.match(docsPageSource, /data-docs-scroll-container/);
  assert.doesNotMatch(docsPageSource, /data-\[active=true\]:before:bg-brand/);
  assert.match(docsPageSource, /\{\s*currentSectionLinks\.length > 0 && \(/);
  assert.match(docsPageSource, /\{currentSectionLinks\.map\(\(section\) => \(/);
  assert.match(docsPageSource, /data-docs-current-section-index/);
  assert.match(docsPageSource, /data-docs-current-section-link/);
  assert.match(
    docsPageSource,
    /data-docs-section-root-id=\{section\.parentId\}/,
  );
  assert.match(
    docsPageSource,
    /currentSectionLinks = contentSections\.filter\(\s*\(section\) => section\.depth > 1 && section\.parentId,?\s*\)/,
  );
  assert.match(docsSidebarContentSource, /data-docs-project-section-link/);
  // The mobile "On this page" outline lists every section but stays out of
  // the scroll spy; only the rails' links participate.
  const mobileOutline =
    /<details[\s\S]*?<\/details>/.exec(docsPageSource)?.[0] || "";
  assert.match(mobileOutline, /contentSections\.map\(\(section\) => \(/);
  assert.doesNotMatch(
    mobileOutline,
    /data-docs-scroll-link|data-docs-current-section-link/,
  );
  assert.doesNotMatch(docsPageSource, /data-docs-section-depth/);
  assert.match(docsVersionSelectorSource, /data-docs-version-selector/);
  assert.match(docsVersionSelectorSource, /withBasePathForBase/);
  assert.match(docsVersionSelectorSource, /withSurfacePath\("docs"/);
  assert.match(docsVersionSelectorSource, /versionDestination/);
  assert.match(docsVersionSelectorSource, /pageSuffix/);
  assert.match(
    docsVersionSelectorSource,
    /document\.addEventListener\("change"/,
  );
  assert.match(docsVersionSelectorSource, /MutationObserver/);
  assert.match(
    docsVersionSelectorSource,
    /mutations\.some\(mutationAddsVersionSelector\)/,
  );
  assert.doesNotMatch(
    docsVersionSelectorSource,
    /new MutationObserver\(\(\) => updateAllSelects\(\)\)/,
  );
  assert.match(docsVersionSelectorSource, /astro:hydrate/);
  assert.doesNotMatch(docsVersionSelectorSource, /astro-island/);
  assert.match(
    docsScrollSpyComponentSource,
    /<script src="\.\.\/\.\.\/scripts\/docs-scroll-spy\.ts"><\/script>/,
  );
  assert.doesNotMatch(docsScrollSpyComponentSource, /\?url|type="module"/);
  assert.match(docsScrollSpySource, /enhanceSectionPageIndex/);
  assert.match(docsScrollSpySource, /data-docs-current-section-link/);
  assert.match(docsScrollSpySource, /data-docs-project-section-link/);
  assert.match(docsScrollSpySource, /docsSectionRootId/);
  assert.match(sectionPageIndexSource, /scrollOffset/);
  assert.match(sectionPageIndexSource, /setActiveIdFromHash/);
  assert.match(sectionPageIndexSource, /scrollActiveLinkIntoView/);
  assert.match(
    sectionPageIndexSource,
    /window\.addEventListener\("scroll", scheduleUpdate/,
  );
  assert.match(
    sectionPageIndexSource,
    /window\.addEventListener\("hashchange", scheduleHashUpdate\)/,
  );
  assert.match(
    sectionPageIndexSource,
    /document\.addEventListener\("astro:hydrate"/,
  );
  assert.match(docsScrollSpySource, /onProjectSectionToggleClick/);
  assert.match(docsScrollSpySource, /event\.preventDefault\(\)/);
  assert.match(docsScrollSpySource, /setProjectSectionsExpanded/);
  assert.match(
    docsScrollSpySource,
    /document\.addEventListener\("click", onProjectSectionToggleClick\)/,
  );
  assert.match(sectionPageIndexSource, /MutationObserver/);
});

function assertScriptOrder(script: any, producer: any, consumer: any): any {
  assert.equal(typeof script, "string");
  const producerIndex = script.indexOf(producer);
  const consumerIndex = script.indexOf(consumer);
  assert.notEqual(producerIndex, -1, `${script} should include '${producer}'`);
  assert.notEqual(consumerIndex, -1, `${script} should include '${consumer}'`);
  assert.ok(
    producerIndex < consumerIndex,
    `${script} should run '${producer}' before '${consumer}'`,
  );
}

function lines(value: any): any {
  return value.split(/\r?\n/).filter(Boolean);
}

function canonicalCatalogIcon(icon: string): string {
  return icon.startsWith("lucide:") ? icon.slice("lucide:".length) : icon;
}

async function catalogLucideIconComponents(): Promise<Map<string, string>> {
  const iconGlyphSource = await fs.readFile(
    path.join(projectDirectory, "src", "components", "web", "icon-glyph.tsx"),
    "utf8",
  );
  const iconMapSource =
    iconGlyphSource.match(
      /const icons: Record<string, LucideIcon> = \{([\s\S]*?)\n\};/,
    )?.[1] || "";
  return new Map(
    [
      ...iconMapSource.matchAll(
        /^\s*(?:"([^"]+)"|([a-z][\w-]*)):\s*([A-Z]\w*)/gm,
      ),
    ]
      .map((match): [string, string] => [match[1] || match[2], match[3]])
      .filter(([icon, component]): boolean => Boolean(icon && component)),
  );
}

async function resolvedCatalogIconIdentity(
  icon: string,
  lucideIcons: Map<string, string>,
): Promise<string | undefined> {
  const assetPath = catalogIconAssetPath(icon);
  if (assetPath) {
    try {
      const asset = await fs.readFile(assetPath);
      return `asset:${createHash("sha256").update(asset).digest("hex")}`;
    } catch {
      return undefined;
    }
  }
  const component = lucideIcons.get(canonicalCatalogIcon(icon));
  return component ? `lucide:${component}` : undefined;
}

function catalogIconAssetPath(icon: string): string | undefined {
  if (icon.startsWith("brand:")) {
    return path.join(
      projectDirectory,
      "public",
      "micronaut-assets",
      "icons",
      "brands",
      `${icon.slice("brand:".length)}.svg`,
    );
  }
  if (icon.startsWith("feature:")) {
    return path.join(
      projectDirectory,
      "public",
      "micronaut-assets",
      "icons",
      "features",
      `${icon.slice("feature:".length)}.svg`,
    );
  }
  if (icon.startsWith("image:")) {
    return path.join(
      projectDirectory,
      "public",
      "micronaut-assets",
      "icons",
      icon.slice("image:".length),
    );
  }
  return undefined;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    const stats = await fs.stat(file);
    return stats.isFile();
  } catch {
    return false;
  }
}
