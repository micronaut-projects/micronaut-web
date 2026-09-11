import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectRuntimeScriptAssertions,
  expectClipboardText,
  expectNoForbiddenRuntimeLibraries,
  installClipboardMock,
} from "./runtime-script-assertions";

const docsProjects = [
  {
    language: "java",
    name: "Core",
    requireDependency: true,
    requireProperties: true,
    slug: "core",
  },
  {
    language: "kotlin",
    name: "Data",
    requireDependency: false,
    requireProperties: false,
    slug: "data",
  },
  {
    language: "groovy",
    name: "Serialization",
    requireDependency: false,
    requireProperties: false,
    slug: "serde",
  },
];

// The catalog also lists the project rendered out of core's own guide, which
// carries no snippets of its own for the snippet tests below.
const docsCatalogProjects = [
  ...docsProjects.map((project) => ({
    name: project.name,
    slug: project.slug,
  })),
  { name: "HTTP", slug: "http" },
];

test("docs catalog lays out generated project cards", async ({ page }) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/docs/"));

  await expect(page.locator("[data-docs-shell]")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Playwright Copied Docs" }),
  ).toBeVisible();
  await expect(
    page.locator("main section#playwright > div").first().locator("svg"),
  ).toHaveCount(0);
  await expect(
    page
      .locator("[data-docs-sidebar] [data-docs-target-id='playwright']")
      .locator("svg"),
  ).toHaveCount(0);

  const cards = page.locator('main [data-slot="card"]');
  await expect(cards).toHaveCount(docsCatalogProjects.length);
  for (const project of docsCatalogProjects) {
    const card = cards.filter({ hasText: project.name });
    await expect(card).toBeVisible();
    // The whole card is the link now, so the redundant "Docs" button is gone.
    await expect(
      card.getByRole("link", { name: project.name, exact: true }),
    ).toHaveAttribute("href", docsProjectHrefPattern(project.slug));
  }

  const searchButton = page.getByRole("button", { name: "Search Micronaut" });
  const searchInput = page.getByPlaceholder(
    "Search projects, classes, properties, docs...",
  );
  await expect(async () => {
    await searchButton.click();
    await expect(searchInput).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(searchInput).toHaveAttribute("type", "search");
  await expect(searchInput).toHaveAttribute("autocomplete", "off");
  await expect(searchInput).toHaveAttribute("autocapitalize", "none");
  await expect(searchInput).toHaveAttribute("autocorrect", "off");
  await expect(searchInput).toHaveAttribute("spellcheck", "false");

  await expectNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test("generated docs page renders desktop content and sidebars without overlap", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/docs/core/"));

  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Core",
    }),
  ).toBeVisible();
  await expect(page.locator("[data-generated-docs]")).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(page.locator(".docs-properties-template").first()).toBeVisible();

  // Which release of the module the page documents, named on the page itself.
  const projectVersion = page.locator("[data-docs-project-version]");
  await expect(projectVersion).toHaveText("Core 5.0.0");

  const docsSidebar = page.locator("[data-docs-sidebar]");
  await expect(docsSidebar).toBeVisible();
  const activeProjectLink = docsSidebar.getByRole("link", {
    name: "Core",
  });
  await expect(activeProjectLink).toHaveAttribute("aria-current", "page");
  await expect(activeProjectLink).toHaveAttribute(
    "data-docs-active-project-link",
    "true",
  );
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "true");
  const activeProjectSections = page.locator("#docs-desktop-core-sections");
  await expect(activeProjectSections).toBeVisible();
  const projectUrlBeforeToggle = page.url();
  await activeProjectLink.click();
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "false");
  await expect(activeProjectSections).toBeHidden();
  expect(page.url()).toBe(projectUrlBeforeToggle);
  await activeProjectLink.click();
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "true");
  await expect(activeProjectSections).toBeVisible();
  await activeProjectLink.click();
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "false");
  await expect(activeProjectSections).toBeHidden();
  await activeProjectLink.click();
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "true");
  await expect(activeProjectSections).toBeVisible();
  expect(page.url()).toBe(projectUrlBeforeToggle);

  const sectionNav = page.locator("[data-docs-current-section-index]");
  await expect(sectionNav).toBeHidden();
  for (const rootLabel of [
    "1 Introduction",
    "2 Quick Start",
    "3 Snippet Gallery",
  ]) {
    await expect(
      sectionNav
        .locator("[data-docs-current-section-link]")
        .getByText(rootLabel, { exact: true }),
    ).toHaveCount(0);
  }

  await scrollToGeneratedHeading(page, "2 Quick Start");
  await expect(sectionNav).toBeVisible();
  const introductionSection = docsSidebar.getByRole("link", {
    name: "1 Introduction",
  });
  const quickStartSection = docsSidebar.getByRole("link", {
    name: "2 Quick Start",
  });
  const snippetGallerySection = docsSidebar.getByRole("link", {
    name: "3 Snippet Gallery",
  });
  const createApplication = sectionNav.getByRole("link", {
    includeHidden: true,
    name: "Create an Application",
  });
  await expect(createApplication).toHaveCount(1);
  await expect(createApplication).toBeVisible();
  await expect(quickStartSection).toHaveAttribute("data-active", "true");
  await expect(quickStartSection).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(introductionSection).not.toHaveClass(/(^|\s)active(\s|$)/);
  const ordinarySourceBlocks = sectionNav.getByRole("link", {
    includeHidden: true,
    name: "Ordinary Source Blocks",
  });
  await expect(ordinarySourceBlocks).toHaveCount(1);
  await expect(ordinarySourceBlocks).toBeHidden();

  await scrollToGeneratedHeading(page, "Create an Application");
  await expect(createApplication).toHaveAttribute("data-active", "true");
  await expect(createApplication).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(createApplication).toHaveAttribute("aria-current", "location");

  await scrollToGeneratedHeading(page, "Ordinary Source Blocks");
  await expect(ordinarySourceBlocks).toBeVisible();
  await expect(createApplication).toBeHidden();
  await expect(createApplication).toHaveAttribute("data-active", "false");
  await expect(createApplication).not.toHaveClass(/(^|\s)active(\s|$)/);
  await expect(
    sectionNav.getByRole("link", { name: "Generated Snippet Macros" }),
  ).toBeVisible();
  await expect(ordinarySourceBlocks).toHaveAttribute("data-active", "true");
  await expect(ordinarySourceBlocks).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(snippetGallerySection).toHaveAttribute("data-active", "true");
  await expect(snippetGallerySection).toHaveClass(/(^|\s)active(\s|$)/);
  await expect(quickStartSection).toHaveAttribute("data-active", "false");
  await expect(quickStartSection).not.toHaveClass(/(^|\s)active(\s|$)/);
  await expect(ordinarySourceBlocks).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expectTopHeaderPinned(page);
  // Pinned with the reference row, so the version stays readable deep in a
  // chapter, not only where the reader landed.
  await expect(projectVersion).toBeInViewport();

  await expectNoHorizontalOverflow(page);
  await expectElementInsideViewport(page, ".docs-code-snippet-template");
  await expectElementsDoNotOverlap(
    page,
    "[data-generated-docs]",
    'aside[aria-label="In this section"]',
  );
  expect(failures).toEqual([]);
});

test("docs section and subsection navigation follows scroll movement", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);
  await routeEmptyRelatedGuides(page);

  await page.goto(appPath("/docs/core/"));
  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Core",
    }),
  ).toBeVisible();
  await expect(page.locator("[data-docs-related-guides]")).toHaveCount(0);

  const docsSidebar = page.locator("[data-docs-sidebar]");
  const sectionNav = page.locator("[data-docs-current-section-index]");
  const introductionSection = docsSidebar.getByRole("link", {
    name: "1 Introduction",
  });
  const quickStartSection = docsSidebar.getByRole("link", {
    name: "2 Quick Start",
  });
  const snippetGallerySection = docsSidebar.getByRole("link", {
    name: "3 Snippet Gallery",
  });
  const createApplication = sectionNav.getByRole("link", {
    includeHidden: true,
    name: "Create an Application",
  });
  const generatedSnippetMacros = sectionNav.getByRole("link", {
    includeHidden: true,
    name: "Generated Snippet Macros",
  });

  await scrollToGeneratedHeading(page, "Create an Application");
  await expect(sectionNav).toBeVisible();
  // The rail rides the scroll. Its sticky container can only travel inside the
  // <aside> around it, so an auto-height aside left the rail parked at the top
  // of the page and out of sight for every chapter after the first.
  await expectSectionRailPinned(sectionNav);
  await expectDocsLinkActive(quickStartSection, true);
  await expectDocsLinkActive(createApplication, true);
  await expectDocsLinkActive(introductionSection, false);
  await expectDocsLinkActive(snippetGallerySection, false);
  await expect(generatedSnippetMacros).toBeHidden();

  await scrollToGeneratedHeading(page, "Generated Snippet Macros");
  await expect(generatedSnippetMacros).toBeVisible();
  await expectSectionRailPinned(sectionNav);
  await expectDocsLinkActive(snippetGallerySection, true);
  await expectDocsLinkActive(generatedSnippetMacros, true);
  await expectDocsLinkActive(quickStartSection, false);
  await expectDocsLinkActive(createApplication, false);
  await expect(createApplication).toBeHidden();

  await scrollToGeneratedHeading(page, "Create an Application");
  await expect(createApplication).toBeVisible();
  await expectDocsLinkActive(quickStartSection, true);
  await expectDocsLinkActive(createApplication, true);
  await expectDocsLinkActive(snippetGallerySection, false);
  await expectDocsLinkActive(generatedSnippetMacros, false);

  expect(failures).toEqual([]);
});

test("docs runtime scripts do not include build-time content processors", async ({
  page,
}) => {
  const runtimeScripts = collectRuntimeScriptAssertions(page);
  const failures = collectBrowserFailures(page);
  await installClipboardMock(page);

  await page.goto(appPath("/docs/core/"));

  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template code span[style]").first(),
  ).toBeVisible();
  const firstSnippet = page.locator(".docs-code-snippet-template").first();
  const tabs = firstSnippet.locator(".docs-snippet-tabs button[role='tab']");
  if ((await tabs.count()) > 1) {
    const initialTab = tabs.nth(0);
    await expect(initialTab).toHaveAttribute("aria-selected", "true");
    await expect(initialTab).toHaveClass(/(^|\s)selected(\s|$)/);
    await tabs.nth(1).click();
    await expect(initialTab).toHaveAttribute("aria-selected", "false");
    await expect(initialTab).not.toHaveClass(/(^|\s)selected(\s|$)/);
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveClass(/(^|\s)selected(\s|$)/);
  }
  await firstSnippet.locator("[data-copy-active-snippet]").click();
  await expect(
    firstSnippet.locator("[data-copy-active-snippet]"),
  ).toHaveAttribute("aria-label", "Copied");
  await expectClipboardText(page);

  await expectNoForbiddenRuntimeLibraries(runtimeScripts);
  expect(failures).toEqual([]);
});

test("generated docs pages convert snippets for selected real projects", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  for (const project of docsProjects) {
    await page.goto(appPath(`/docs/${project.slug}/`));

    await expect(
      page.getByRole("heading", {
        exact: true,
        level: 1,
        name: project.name,
      }),
    ).toBeVisible();
    await expectConvertedGeneratedSnippets(page, {
      language: project.language,
      requireDependency: project.requireDependency,
      requireProperties: project.requireProperties,
    });
    await expectNoHorizontalOverflow(page);
  }

  expect(failures).toEqual([]);
});

test("docs page renders related latest guides from the guides manifest", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);
  await page.route(
    /\/(?:guides|latest|micronaut-guides-v2)\/manifest\.json$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(relatedGuidesManifest()),
      });
    },
  );

  await page.goto(appPath("/docs/data/"));

  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Data",
    }),
  ).toBeVisible();

  const relatedGuides = page.locator("[data-docs-related-guides]");
  await expect(relatedGuides).toBeVisible();
  await expect(
    relatedGuides.getByRole("heading", { name: "Latest guides" }),
  ).toBeVisible();

  // The block is collapsed, so the first line of documentation stays within a
  // screen of the page title instead of a screen and a half of guide cards.
  const collapsedBox = await relatedGuides.boundingBox();
  assertBox(collapsedBox, "collapsed related guides");
  expect(collapsedBox.height).toBeLessThan(120);
  const introductionBox = await page
    .locator("[data-generated-docs]")
    .getByRole("heading", { name: "1 Introduction" })
    .boundingBox();
  assertBox(introductionBox, "first docs section heading");
  expect(introductionBox.y).toBeLessThan(page.viewportSize()!.height);

  await openRelatedGuides(relatedGuides);
  await expect(
    relatedGuides.getByRole("link", { name: "Show more" }),
  ).toHaveAttribute(
    "href",
    /\/(?:guides|latest|micronaut-guides-v2)\/\?q=micronaut-data$/,
  );
  await expect(relatedGuides.locator('[data-slot="card"]')).toHaveCount(3);
  const guideActionLinks = relatedGuides.locator(
    "[data-related-guide-read], [data-docs-related-guides-show-more]",
  );
  await expect(guideActionLinks).toHaveCount(4);
  expect(
    await guideActionLinks.evaluateAll((links) =>
      links.every(
        (link) =>
          getComputedStyle(link).display.includes("flex") &&
          getComputedStyle(link).flexWrap === "nowrap",
      ),
    ),
  ).toBe(true);
  await expectShowMoreBelowCard(relatedGuides, 2);
  await expect(relatedGuides.locator('[data-slot="card-title"] a')).toHaveText([
    "Build reactive repositories with Micronaut Data R2DBC",
    "Use MongoDB with Micronaut Data",
    "Access a database with Micronaut Data JDBC",
  ]);
  await expect(relatedGuides.getByText("Micronaut HTTP Client")).toHaveCount(0);
  await expect(relatedGuides.getByText("Old Micronaut Data guide")).toHaveCount(
    0,
  );
  const generatedContentOrder = await page
    .locator("[data-generated-docs]")
    .evaluate((root) =>
      Array.from(root.children)
        .filter(
          (child) => !["script", "style"].includes(child.tagName.toLowerCase()),
        )
        .slice(0, 4)
        .map((child) => {
          const element = child as HTMLElement;
          if (
            element.matches("[data-docs-related-guides]") ||
            element.querySelector("[data-docs-related-guides]")
          ) {
            return "latest-guides";
          }
          return element.textContent?.replace(/\s+/g, " ").trim() || "";
        }),
    );
  // The accordion no longer splits the chapter title from its first paragraph;
  // it lives in the side column instead. The leading entry is the empty
  // project-document anchor span that the renderer prepends.
  const meaningfulOrder = generatedContentOrder.filter(Boolean);
  expect(meaningfulOrder[0]).toContain("Data");
  expect(meaningfulOrder[1]).toContain("1 Introduction");
  expect(generatedContentOrder).not.toContain("latest-guides");
  const guideLink = relatedGuides
    .getByRole("link", {
      name: "Access a database with Micronaut Data JDBC",
    })
    .first();
  await expect(guideLink).toHaveAttribute(
    "href",
    relatedGuideHrefPattern("micronaut-data-jdbc-repository-gradle-java.html"),
  );

  expect(failures).toEqual([]);
});

test("docs related guides show more link follows shorter result counts", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);
  await page.route(
    /\/(?:guides|latest|micronaut-guides-v2)\/manifest\.json$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(relatedGuidesManifest()),
      });
    },
  );

  await page.goto(appPath("/docs/core/"));
  const coreRelatedGuides = page.locator("[data-docs-related-guides]");
  await expect(coreRelatedGuides).toBeVisible();
  await expect(coreRelatedGuides.locator('[data-slot="card"]')).toHaveCount(2);
  await openRelatedGuides(coreRelatedGuides);
  await expectShowMoreBelowCard(coreRelatedGuides, 1);

  await page.goto(appPath("/docs/serde/"));
  const serdeRelatedGuides = page.locator("[data-docs-related-guides]");
  await expect(serdeRelatedGuides).toBeVisible();
  await expect(serdeRelatedGuides.locator('[data-slot="card"]')).toHaveCount(1);
  await openRelatedGuides(serdeRelatedGuides);
  await expectShowMoreBelowCard(serdeRelatedGuides, 0);

  expect(failures).toEqual([]);
});

test("generated docs page fits the mobile viewport", async ({ page }) => {
  const failures = collectBrowserFailures(page);
  await page.setViewportSize({ width: 390, height: 860 });

  await page.goto(appPath("/docs/data/"));

  await expect(page.locator("[data-generated-docs]")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      exact: true,
      level: 1,
      name: "Data",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open docs navigation" }),
  ).toBeVisible();
  const mobileNavigationTrigger = page.getByRole("button", {
    name: "Open docs navigation",
  });
  expect((await mobileNavigationTrigger.boundingBox())?.x).toBeLessThan(64);
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();
  await expect(
    page.locator('aside[aria-label="In this section"]'),
  ).toBeHidden();

  await expectNoHorizontalOverflow(page);
  await expectElementInsideViewport(page, ".docs-code-snippet-template");
  expect(failures).toEqual([]);
});

test("docs bar names the chapter being read and jumps inside it", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);
  await page.setViewportSize({ width: 390, height: 860 });

  await page.goto(appPath("/docs/core/"));

  const sectionMenu = page.locator("[data-docs-section-menu]");
  // Introduction has no subsections, so there is nothing to jump to yet.
  await expect(sectionMenu).toBeHidden();

  await page.evaluate(() =>
    document.getElementById("core-quickStart")?.scrollIntoView(),
  );
  await expect(sectionMenu).toBeVisible();
  await expect(sectionMenu).toContainText("2 Quick Start");

  await sectionMenu.locator("summary").click();
  const subsections = sectionMenu.getByRole("navigation", {
    name: "In this section",
  });
  await expect(
    subsections.getByRole("link", { name: "Create an Application" }),
  ).toBeVisible();
  // The other chapter's subsections stay out of the menu.
  await expect(
    subsections.getByRole("link", { name: "Ordinary Source Blocks" }),
  ).toBeHidden();

  // Reading on into the next chapter renames the bar and reloads the menu.
  await page.evaluate(() =>
    document.getElementById("core-snippetGallery")?.scrollIntoView(),
  );
  await expect(sectionMenu).toContainText("3 Snippet Gallery");
  await expect(
    subsections.getByRole("link", { name: "Ordinary Source Blocks" }),
  ).toBeVisible();
  await expect(
    subsections.getByRole("link", { name: "Create an Application" }),
  ).toBeHidden();

  await subsections
    .getByRole("link", { name: "Generated Snippet Macros" })
    .click();
  await expect(sectionMenu).not.toHaveAttribute("open", /.*/);
  expect(new URL(page.url()).hash).toBe("#core-_generated_snippet_macros");

  expect(failures).toEqual([]);
});

test("expanded docs project link toggles sections inside the mobile sidebar", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);
  await page.setViewportSize({ width: 390, height: 860 });

  await page.goto(appPath("/docs/core/"));

  await page.getByRole("button", { name: "Open docs navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Docs navigation" });
  await expect(sheet).toBeVisible();

  const activeProjectLink = sheet.getByRole("link", {
    name: "Core",
  });
  const activeProjectSections = sheet.locator("#docs-mobile-core-sections");
  await expect(activeProjectLink).toHaveAttribute("aria-expanded", "true");
  await expect(activeProjectSections).toBeVisible();

  await clickAndExpectProjectSections({
    container: sheet,
    link: activeProjectLink,
    sections: activeProjectSections,
    expanded: false,
  });
  await clickAndExpectProjectSections({
    container: sheet,
    link: activeProjectLink,
    sections: activeProjectSections,
    expanded: true,
  });
  await clickAndExpectProjectSections({
    container: sheet,
    link: activeProjectLink,
    sections: activeProjectSections,
    expanded: false,
  });

  expect(failures).toEqual([]);
});

test("global language cookie defaults docs snippets to Kotlin on load", async ({
  page,
  context,
}) => {
  const failures = collectBrowserFailures(page);

  await context.addCookies([
    {
      name: "micronaut-code-language",
      value: "kotlin",
      url: appPath("/docs/core/"),
      path: "/",
    },
  ]);

  await page.goto(appPath("/docs/core/"));

  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const firstKotlinTab = root
    .locator(".docs-code-snippet-template")
    .locator("button[role='tab'][data-lang='kotlin']")
    .first();

  const count = await firstKotlinTab.count();
  if (count > 0) {
    await expect(firstKotlinTab).toHaveAttribute("aria-selected", "true");
    await expect(firstKotlinTab).toHaveClass(/(^|\s)selected(\s|$)/);
  }

  expect(failures).toEqual([]);
});

test("global language cookie defaults docs snippets to Groovy on load", async ({
  page,
  context,
}) => {
  const failures = collectBrowserFailures(page);

  await context.addCookies([
    {
      name: "micronaut-code-language",
      value: "groovy",
      url: appPath("/docs/core/"),
      path: "/",
    },
  ]);

  await page.goto(appPath("/docs/core/"));

  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const firstGroovyTab = root
    .locator(".docs-code-snippet-template")
    .locator("button[role='tab'][data-lang='groovy']")
    .first();

  const count = await firstGroovyTab.count();
  if (count > 0) {
    await expect(firstGroovyTab).toHaveAttribute("aria-selected", "true");
    await expect(firstGroovyTab).toHaveClass(/(^|\s)selected(\s|$)/);
  }

  expect(failures).toEqual([]);
});

test("global language does not break local snippet tab override", async ({
  page,
  context,
}) => {
  const failures = collectBrowserFailures(page);

  await context.addCookies([
    {
      name: "micronaut-code-language",
      value: "kotlin",
      url: appPath("/docs/core/"),
      path: "/",
    },
  ]);

  await page.goto(appPath("/docs/core/"));

  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const firstJavaTab = root
    .locator(".docs-code-snippet-template")
    .locator("button[role='tab'][data-lang='java']")
    .first();

  const count = await firstJavaTab.count();
  if (count > 0) {
    await firstJavaTab.click();
    await expect(firstJavaTab).toHaveAttribute("aria-selected", "true");
    await expect(firstJavaTab).toHaveClass(/(^|\s)selected(\s|$)/);
  }

  expect(failures).toEqual([]);
});

test("global build-tool change updates docs snippets in real time", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/docs/core/"));

  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const firstMavenTab = root
    .locator(".docs-code-snippet-template")
    .locator("button[role='tab'][data-lang='maven']")
    .first();

  const count = await firstMavenTab.count();
  if (count > 0) {
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("micronaut-web-build-tool-change", {
          detail: { buildTool: "maven" },
        }),
      );
    });

    await expect(firstMavenTab).toHaveAttribute("aria-selected", "true");
  }

  expect(failures).toEqual([]);
});

function collectBrowserFailures(page: Page) {
  const failures: string[] = [];
  page.on("pageerror", (error) => {
    failures.push(`page error: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "script") {
      failures.push(
        `script request failed: ${request.url()} ${request.failure()?.errorText || ""}`.trim(),
      );
    }
  });
  page.on("response", (response) => {
    if (
      response.request().resourceType() === "script" &&
      response.status() >= 400
    ) {
      failures.push(
        `script response failed: ${response.url()} ${response.status()}`,
      );
    }
  });
  return failures;
}

function docsProjectHrefPattern(slug: string): RegExp {
  if (process.env.MICRONAUT_DEPLOY_SURFACE === "docs") {
    return new RegExp(
      `${escapeRegExp(appPath(`${configuredDocsRoot()}${slug}/`))}$`,
    );
  }
  return new RegExp(`/docs/${slug}/$`);
}

function relatedGuideHrefPattern(file: string): RegExp {
  const slug = file.replace(/\.html$/, "");
  return new RegExp(
    `/(?:guides|latest|micronaut-guides-v2)/${escapeRegExp(slug)}/$`,
  );
}

function relatedGuidesManifest() {
  const guides = [
    relatedGuideManifestEntry({
      slug: "micronaut-http-client",
      title: "Micronaut HTTP Client",
      intro: "Learn how to use Micronaut low-level HTTP Client.",
      tags: ["client"],
      categories: ["HTTP Client"],
      publicationDate: "2030-01-01",
      estimatedMinutes: 30,
    }),
    relatedGuideManifestEntry({
      slug: "micronaut-configuration",
      title: "Configure Micronaut applications",
      intro: "Learn how to configure Micronaut applications.",
      tags: ["configuration"],
      categories: ["Core Basics"],
      publicationDate: "2024-01-01",
    }),
    relatedGuideManifestEntry({
      slug: "creating-your-first-micronaut-app",
      title: "Creating your first Micronaut application",
      intro: "Learn how to create a first Micronaut application.",
      tags: ["junit"],
      categories: ["Getting Started"],
      publicationDate: "2018-05-23",
    }),
    relatedGuideManifestEntry({
      slug: "micronaut-produces-xml",
      title: "Produce XML responses with Micronaut",
      intro: "Learn how to produce XML responses from Micronaut controllers.",
      tags: [],
      categories: ["Beyond JSON"],
      publicationDate: "2022-01-31",
    }),
    relatedGuideManifestEntry({
      slug: "micronaut-data-r2dbc-repository",
      title: "Build reactive repositories with Micronaut Data R2DBC",
      intro:
        "Learn how to access a database with Micronaut Data R2DBC repositories.",
      tags: ["database", "micronaut-data", "r2dbc"],
      categories: ["Data R2DBC"],
      publicationDate: "2025-02-15",
    }),
    relatedGuideManifestEntry({
      slug: "micronaut-data-mongodb",
      title: "Use MongoDB with Micronaut Data",
      intro: "Learn how to use MongoDB repositories with Micronaut Data.",
      tags: ["database", "micronaut-data", "mongodb"],
      categories: ["Data MongoDB"],
      publicationDate: "2023-10-10",
    }),
    relatedGuideManifestEntry({
      slug: "micronaut-data-jdbc-repository",
      title: "Access a database with Micronaut Data JDBC",
      intro: "Learn how to access a database with Micronaut JDBC repositories.",
      tags: ["database", "micronaut-data", "jdbc"],
      categories: ["Data JDBC"],
      publicationDate: "2021-05-28",
    }),
    relatedGuideManifestEntry({
      slug: "old-micronaut-data-guide",
      title: "Old Micronaut Data guide",
      intro: "A historical Micronaut Data guide.",
      tags: ["database", "micronaut-data"],
      categories: ["Data JDBC"],
      publicationDate: "2019-01-01",
    }),
  ];
  return {
    generatedAt: "2026-06-12T00:00:00.000Z",
    guideCount: guides.length,
    guides,
  };
}

async function routeEmptyRelatedGuides(page: Page): Promise<void> {
  await page.route(
    /\/(?:guides|latest|micronaut-guides-v2)\/manifest\.json$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({
          generatedAt: "2026-01-01T00:00:00.000Z",
          guideCount: 0,
          guides: [],
        }),
      });
    },
  );
}

function relatedGuideManifestEntry({
  slug,
  title,
  intro,
  tags,
  categories,
  publicationDate,
  estimatedMinutes = 25,
}: {
  slug: string;
  title: string;
  intro: string;
  tags: string[];
  categories: string[];
  publicationDate: string;
  estimatedMinutes?: number;
}) {
  const optionFile = `${slug}-gradle-java.html`;
  return {
    slug,
    title,
    intro,
    authors: ["Micronaut"],
    tags,
    categories,
    publicationDate,
    estimatedMinutes,
    overviewFile: `${slug}.html`,
    defaultOptionFile: optionFile,
    options: [
      {
        id: `${slug}-gradle-java`,
        label: "Java / Gradle",
        language: "java",
        languageLabel: "Java",
        buildTool: "gradle",
        buildToolLabel: "Gradle",
        file: optionFile,
        fragment: `fragments/${optionFile}`,
        zipUrl: `${slug}-gradle-java.zip`,
      },
    ],
  };
}

function configuredDocsRoot(): string {
  return normalizeRoot(process.env.MICRONAUT_DOCS_ROOT || "/latest");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function expectConvertedGeneratedSnippets(
  page: Page,
  {
    language,
    requireDependency,
    requireProperties,
  }: {
    language: string;
    requireDependency: boolean;
    requireProperties: boolean;
  },
): Promise<void> {
  const root = page.locator("[data-generated-docs]");
  await expect(root).toBeVisible();

  const codeSnippets = root.locator(".docs-code-snippet-template");
  await expect(codeSnippets.first()).toBeVisible();
  await expect(
    codeSnippets.locator(`button[data-lang="${language}"]`).first(),
  ).toBeVisible();
  await expect(
    root.locator("[data-copy-active-snippet]").first(),
  ).toBeVisible();
  await expect(root.locator(".docs-code-callouts").first()).toBeVisible();
  await expect(root.locator(".listingblock")).toHaveCount(0);
  await expect(
    root.locator(".literalblock pre").filter({ hasText: /^\[source,/ }),
  ).toHaveCount(0);

  if (requireProperties) {
    await expect(
      root.locator(".docs-properties-template").first(),
    ).toBeVisible();
  }
  if (requireDependency) {
    await expect(
      root.locator(".docs-dependency-template").first(),
    ).toBeVisible();
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectElementInsideViewport(
  page: Page,
  selector: string,
): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize();
  assertBox(box, selector);
  expect(viewport).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual((viewport?.width || 0) + 1);
}

async function expectElementsDoNotOverlap(
  page: Page,
  leftSelector: string,
  rightSelector: string,
): Promise<void> {
  const left = await page.locator(leftSelector).first().boundingBox();
  const right = await page.locator(rightSelector).first().boundingBox();
  assertBox(left, leftSelector);
  assertBox(right, rightSelector);
  expect(left.x + left.width).toBeLessThanOrEqual(right.x + 8);
}

async function expectTopHeaderPinned(page: Page): Promise<void> {
  const banner = page.getByRole("banner");
  await expect(banner).toBeVisible();
  await expect
    .poll(async () => Math.round((await banner.boundingBox())?.y ?? -1))
    .toBe(0);
}

/**
 * The section rail is pinned under the topbar rather than scrolled away with
 * the chapter it indexes, so its list is reachable from anywhere in the page.
 */
async function expectSectionRailPinned(sectionNav: Locator): Promise<void> {
  const rail = sectionNav.locator("[data-docs-scroll-container]");
  const box = await rail.boundingBox();
  assertBox(box, "[data-docs-scroll-container]");
  const viewportHeight =
    sectionNav.page().viewportSize()?.height ??
    (await sectionNav.page().evaluate(() => window.innerHeight));
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeLessThan(viewportHeight / 2);
}

async function expectDocsLinkActive(
  link: Locator,
  active: boolean,
): Promise<void> {
  await expect(link).toHaveAttribute("data-active", active ? "true" : "false");
  if (active) {
    await expect(link).toHaveClass(/(^|\s)active(\s|$)/);
    await expect(link).toHaveAttribute("aria-current", "location");
    return;
  }
  await expect(link).not.toHaveClass(/(^|\s)active(\s|$)/);
  await expect(link).not.toHaveAttribute("aria-current", "location");
}

async function openRelatedGuides(section: Locator): Promise<void> {
  const disclosure = section.locator(".docs-related-guides-disclosure");
  await expect(disclosure).toBeVisible();
  if (await disclosure.evaluate((element) => element.hasAttribute("open"))) {
    return;
  }
  await section.locator(".docs-related-guides-summary").click();
  await expect(disclosure).toHaveAttribute("open", "");
}

async function expectShowMoreBelowCard(
  section: Locator,
  cardIndex: number,
): Promise<void> {
  const showMore = section.locator("[data-docs-related-guides-show-more]");
  const card = section.locator('[data-slot="card"]').nth(cardIndex);
  await expect(showMore).toBeVisible();
  await expect(card).toBeVisible();

  const [showMoreBox, cardBox] = await Promise.all([
    showMore.boundingBox(),
    card.boundingBox(),
  ]);
  assertBox(showMoreBox, "related guides show more link");
  assertBox(cardBox, "related guide card");
  expect(showMoreBox.y).toBeGreaterThanOrEqual(cardBox.y + cardBox.height - 1);
  expect(showMoreBox.x).toBeLessThanOrEqual(cardBox.x + cardBox.width);
  expect(showMoreBox.x + showMoreBox.width).toBeGreaterThanOrEqual(cardBox.x);
}

async function clickAndExpectProjectSections({
  container,
  link,
  sections,
  expanded,
}: {
  container: Locator;
  link: Locator;
  sections: Locator;
  expanded: boolean;
}): Promise<void> {
  await link.click();
  await expect(container).toBeVisible();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("aria-expanded", String(expanded));
  if (expanded) {
    await expect(sections).toBeVisible();
    return;
  }
  await expect(sections).toBeHidden();
}

async function scrollToGeneratedHeading(
  page: Page,
  headingName: string,
): Promise<void> {
  await page.evaluate((name) => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-generated-docs] h1, [data-generated-docs] h2, [data-generated-docs] h3, [data-generated-docs] h4, [data-generated-docs] h5, [data-generated-docs] h6",
      ),
    );
    const heading = headings.find(
      (element) => element.textContent?.replace(/\s+/g, " ").trim() === name,
    );
    if (heading) {
      const targetTop = heading.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.max(targetTop - 160, 0),
      });
    }
  }, headingName);
}

function assertBox(
  box: Awaited<ReturnType<ReturnType<Page["locator"]>["boundingBox"]>>,
  selector: string,
): asserts box is NonNullable<typeof box> {
  expect(box, `${selector} should have a layout box`).not.toBeNull();
}

function appPath(path: string): string {
  const basePath = normalizeBasePath(
    process.env.PLAYWRIGHT_BASE_PATH || process.env.ASTRO_BASE,
  );
  const deployedPath = deployedDocsPath(path);
  if (deployedPath === "/") {
    return basePath;
  }
  return `${basePath}${deployedPath.replace(/^\/+/, "")}`;
}

function deployedDocsPath(path: string): string {
  if (
    process.env.PLAYWRIGHT_STATIC_PREVIEW !== "true" ||
    process.env.MICRONAUT_DEPLOY_SURFACE !== "docs"
  ) {
    return path;
  }
  const root = configuredDocsRoot();
  if (path === "/docs" || path === "/docs/") {
    return root;
  }
  if (path.startsWith("/docs/")) {
    return `${root}${path.slice("/docs/".length)}`;
  }
  return path;
}

function normalizeBasePath(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}

function normalizeRoot(path: string): string {
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  if (absolutePath === "/") {
    return "/";
  }
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}
