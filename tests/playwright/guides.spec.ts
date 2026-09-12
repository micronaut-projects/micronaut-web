import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectRuntimeScriptAssertions,
  expectClipboardText,
  expectNoForbiddenRuntimeLibraries,
  installClipboardMock,
} from "./runtime-script-assertions";

const httpClientGuideTitle = "Micronaut HTTP Client";
const generatedGuidePages = [
  {
    dependencyLanguage: "gradle",
    expectedAbsentText: ["== Gradle Git Properties Plugin"],
    expectedCallouts: [
      ["1", "Annotate the class"],
      ["2", "Inject the"],
      ["3", "Creating HTTP Requests"],
      ["4", "Use"],
    ],
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Gradle Git Properties Plugin",
      "Test",
    ],
    expectedText: "add git commit info",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "java",
    slug: "adding-commit-info-gradle-java",
    title: "Adding Commit Info to your Micronaut Application",
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "java",
    slug: "micronaut-http-client-gradle-java",
    title: httpClientGuideTitle,
  },
  {
    dependencyLanguage: "maven",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "groovy",
    slug: "micronaut-http-client-maven-groovy",
    title: httpClientGuideTitle,
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: false,
    requireProperties: false,
    sourceLanguage: "java",
    slug: "creating-your-first-micronaut-app-gradle-java",
    title: "Creating your first Micronaut application",
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: [
      "What you will need",
      "Solution",
      "Writing the Application",
    ],
    expectedText: "Download and unzip the source",
    requireDependency: true,
    requireProperties: true,
    sourceLanguage: "java",
    slug: "micronaut-data-jdbc-repository-gradle-java",
    title: "Access a database with Micronaut Data JDBC",
  },
  {
    dependencyLanguage: "gradle",
    expectedAbsentText: ["=== Native Executable Generation"],
    expectedCallouts: [
      ["1", "Use"],
      ["2", "Inject a Logger"],
      ["3", "Create trigger every 10 seconds"],
      ["4", "Create another trigger every 45 seconds"],
    ],
    expectedHeadings: [
      "Creating a Job",
      "Scheduling a Job Manually",
      "Native Executable Generation",
    ],
    expectedText: "schedule periodic tasks",
    requireDependency: false,
    requireProperties: false,
    sourceLanguage: "java",
    slug: "micronaut-scheduled-gradle-java",
    title: "Schedule periodic tasks inside your Micronaut applications",
  },
  {
    dependencyLanguage: "gradle",
    expectedHeadings: ["Content Macros", "Snippet Macros"],
    expectedRenderedText: [
      "Common template value: COMMON.",
      "External guide include content.",
      "Rocker template include content.",
      "Source callout loaded from a guide callout macro.",
      "Grouped HTTP client dependency.",
    ],
    expectedText: "Common guide snippet content.",
    requireDependency: true,
    requireProperties: false,
    sourceLanguage: "java",
    slug: "snippet-gallery-gradle-java",
    title: "Snippet Gallery",
  },
];

test("guides manifest endpoint exposes generated guide metadata", async ({
  page,
}) => {
  const response = await page.request.get(appPath("/guides/manifest.json"));
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("application/json");

  const manifest = await response.json();
  const dataGuide = manifest.guides.find(
    (guide: any) => guide.slug === "micronaut-data-jdbc-repository",
  );
  expect(dataGuide).toBeTruthy();
  expect(dataGuide.title).toBe("Access a database with Micronaut Data JDBC");
  expect(dataGuide.tags).toContain("micronaut-data");
  expect(dataGuide.defaultOptionFile).toBe(
    "micronaut-data-jdbc-repository-gradle-java.html",
  );
});

test("top search finds a guide from the published guides manifest", async ({
  page,
}) => {
  await page.goto(appPath("/guides/"));
  // The search button is inert until the header island hydrates, and a click
  // that lands before then opens nothing.
  const headerIsland = page.locator(
    'astro-island[component-export="SiteHeader"]',
  );
  await expect
    .poll(() =>
      headerIsland.evaluate((element) => !element.hasAttribute("ssr")),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Search Micronaut" }).click();

  const dialog = page.getByRole("dialog", { name: "Search Micronaut" });
  await expect(dialog).toBeVisible();
  // The site index this dialog also reads carries no guides, so a guide only
  // shows up when the guides manifest is loaded alongside it.
  await dialog
    .getByRole("combobox")
    .fill("Access a database with Micronaut Data JDBC");
  const result = dialog.getByRole("option", {
    name: /Access a database with Micronaut Data JDBC/,
  });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-data-jdbc-repository-gradle-java"),
  );
});

test("guide catalog renders static cards and hydrates only the variant menu", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/guides/"));

  await expect(
    page.getByRole("heading", { level: 1, name: "Micronaut Guides" }),
  ).toBeVisible();

  // The default view is the category directory; guide rows appear after
  // picking a category.
  await page
    .locator("[data-guides-directory]")
    .getByRole("link", { name: /HTTP Client/ })
    .click();
  await expect(page).toHaveURL(/category=http-client/);

  const card = page
    .locator("[data-guide-card]", { hasText: httpClientGuideTitle })
    .first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();

  // The card itself is static markup; the only island inside it is the
  // variant menu.
  const island = card.locator("astro-island");
  await expect(island).toHaveCount(1);
  await expect(island).toBeVisible();
  await expect
    .poll(async () =>
      island.evaluate((element) => !element.hasAttribute("ssr")),
    )
    .toBe(true);

  await expect(
    card.getByRole("link", { name: `Read ${httpClientGuideTitle}` }),
  ).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-gradle-java.html"),
  );
  await card
    .getByRole("button", { name: `Choose variant for ${httpClientGuideTitle}` })
    .click();

  const javaGradle = page.getByRole("menuitem", { name: /Java\s+Gradle/ });
  await expect(javaGradle).toBeVisible();
  await expect(javaGradle).toHaveAttribute("aria-current", "page");

  const kotlinGradle = page.getByRole("menuitem", {
    name: /Kotlin\s+Gradle/,
  });
  await expect(kotlinGradle).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-gradle-kotlin.html"),
  );

  if (isGuidesSurface()) {
    await page.goto(appPath("/guides/micronaut-http-client-gradle-kotlin/"));
  } else {
    await kotlinGradle.click();
  }

  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-http-client-gradle-kotlin"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: httpClientGuideTitle }),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("guide catalog search matches normalized category aliases", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/guides/?q=getting-started"));

  await expect(
    page.locator("[data-guide-card]", {
      hasText: "Creating your first Micronaut application",
    }),
  ).toBeVisible();
  await expect(
    page.locator("[data-guide-card]", { hasText: httpClientGuideTitle }),
  ).toBeHidden();
  expect(failures).toEqual([]);
});

test("guide catalog displays the query from a direct search URL", async ({
  page,
}) => {
  await page.goto(appPath("/guides/?q=spring-jpa"));

  await expect(
    page.getByRole("searchbox", { name: "Filter guides" }),
  ).toHaveValue("spring-jpa");
});

test("guide catalog provides a search form", async ({ page }) => {
  await page.goto(appPath("/guides/"));

  const search = page.getByRole("search");
  await expect(
    search.getByRole("searchbox", { name: "Filter guides" }),
  ).toBeVisible();
  await search
    .getByRole("searchbox", { name: "Filter guides" })
    .fill("getting-started");
  await search.getByRole("button", { name: "Filter" }).click();

  expect(new URL(page.url()).search).toBe("?q=getting-started");
  await expect(
    search.getByRole("searchbox", { name: "Filter guides" }),
  ).toHaveValue("getting-started");
  await expect(
    page.locator("[data-guide-card]", {
      hasText: "Creating your first Micronaut application",
    }),
  ).toBeVisible();
});

test("legacy latest guide links redirect to canonical catalog and tag paths", async ({
  page,
}) => {
  test.skip(
    !isStaticPreview(),
    "Legacy static redirects are validated against the pruned deployment artifact.",
  );

  await page.goto(appPath("/latest/index.html?source=legacy"));
  await expect(page).toHaveURL(catalogUrlPattern("source=legacy"));
  await expect(
    page.getByRole("heading", { level: 1, name: "Micronaut Guides" }),
  ).toBeVisible();

  await page.goto(appPath("/latest/tag-micronaut-data.html?source=legacy"));
  await expect(page).toHaveURL(
    tagUrlPattern("micronaut-data", "source=legacy"),
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Micronaut Guides: micronaut-data",
    }),
  ).toBeVisible();

  await page.goto(appPath("/latest/tag-micronaut_data.html?source=legacy"));
  await expect(page).toHaveURL(
    tagUrlPattern("micronaut-data", "source=legacy"),
  );

  await page.goto(
    appPath("/latest/micronaut-http-client-gradle-java.html?source=legacy"),
  );
  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-http-client-gradle-java", "source=legacy"),
  );
});

test("guide overview redirects to the preferred variant and exposes variant navigation", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.goto(
    appPath(
      isGuidesSurface()
        ? "/guides/micronaut-http-client-gradle-java/"
        : "/guides/micronaut-http-client.html",
    ),
  );

  await expect(page).toHaveURL(
    guideUrlPattern("micronaut-http-client-gradle-java"),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: httpClientGuideTitle }),
  ).toBeVisible();
  await expect(page.getByText("Guide content unavailable")).toHaveCount(0);
  await expect(
    page.getByText(
      "In this guide, we will create a Micronaut application written in Java",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".docs-code-snippet-template").first(),
  ).toBeVisible();

  const guideNavigation = page.locator('aside[aria-label="On this guide"]');
  await expect(guideNavigation).toBeVisible();
  await expect(
    guideNavigation.getByRole("link", { name: "Java / Gradle" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    guideNavigation.getByRole("link", { name: "Groovy / Maven" }),
  ).toHaveAttribute(
    "href",
    guideHrefPattern("micronaut-http-client-maven-groovy.html"),
  );

  // The panel holds the guide's whole outline — roots and subsections alike,
  // all visible regardless of the reader's position.
  const guidePageIndex = page.locator('aside[aria-label="In this section"]');
  await expect(guidePageIndex).toBeVisible();
  for (const rootLabel of [
    "Getting Started",
    "Writing the Application",
    "HTTP Client Filter",
  ]) {
    await expect(
      guidePageIndex
        .locator("[data-guide-page-index-link]")
        .getByText(rootLabel, { exact: true }),
    ).toHaveCount(1);
  }
  const dependencyLink = guidePageIndex.getByRole("link", {
    name: "Dependency",
  });
  await expect(dependencyLink).toHaveCount(1);
  await expect(dependencyLink).toBeVisible();
  await expect(
    guidePageIndex.getByRole("link", { name: "JSON Codec Configuration" }),
  ).toBeVisible();
  const configurationParametersLink = guidePageIndex.getByRole("link", {
    name: "Configuration Parameters",
  });
  await expect(configurationParametersLink).toHaveCount(1);
  await expect(configurationParametersLink).toBeVisible();

  const controllerLink = guidePageIndex.getByRole("link", {
    name: "Controller",
  });
  await scrollToGeneratedHeading(page, "Controller");
  await expect(controllerLink).toHaveAttribute("aria-current", "location");
  await expect(
    guideNavigation.getByRole("link", { name: "Writing the Application" }),
  ).toHaveClass(/active/);

  await scrollToGeneratedHeading(page, "HTTP Client Filter");
  await expect(configurationParametersLink).toBeVisible();
  await expect(dependencyLink).toBeVisible();
  expect(failures).toEqual([]);
});

test("guides runtime scripts do not include build-time content processors", async ({
  page,
}) => {
  const runtimeScripts = collectRuntimeScriptAssertions(page);
  const failures = collectBrowserFailures(page);
  await installClipboardMock(page);

  await page.goto(appPath("/guides/micronaut-http-client-gradle-java/"));

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

test("generated guide pages are rendered from real sources with converted snippets", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  for (const guide of generatedGuidePages) {
    await page.goto(appPath(`/guides/${guide.slug}/`));

    await expect(page).toHaveURL(guideUrlPattern(guide.slug));
    await expect(
      page.getByRole("heading", { level: 1, name: guide.title }),
    ).toBeVisible();
    await expect(page.getByText("Guide content unavailable")).toHaveCount(0);
    const content = page.locator(".generated-guides-content");
    for (const heading of guide.expectedHeadings) {
      await expect(
        content.getByRole("heading", {
          exact: true,
          name: heading,
        }),
      ).toBeVisible();
    }
    await expect(content.getByText(guide.expectedText).first()).toBeVisible();
    for (const text of guide.expectedRenderedText || []) {
      await expect(content.getByText(text).first()).toBeVisible();
    }
    for (const text of guide.expectedAbsentText || []) {
      await expect(content.getByText(text, { exact: true })).toHaveCount(0);
    }
    if (guide.expectedCallouts) {
      await expectGuideCallouts(content, guide.expectedCallouts);
    }
    await expectConvertedGuideSnippets(page, guide);
  }

  expect(failures).toEqual([]);
});

test("Guides language selection updates the global cookie", async ({
  page,
  context,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/guides/"));

  const guidePickerIsland = page.locator(
    'astro-island[component-export="GuideVariantPreferencePicker"]',
  );
  await expect
    .poll(() => guidePickerIsland.evaluate((el) => !el.hasAttribute("ssr")))
    .toBe(true);

  await page
    .getByRole("group", { name: "Preferred guide language" })
    .getByRole("button", { name: "Kotlin" })
    .click();

  const cookies = await context.cookies();
  const langCookie = cookies.find((c) => c.name === "micronaut-code-language");
  expect(langCookie).toBeDefined();
  expect(langCookie?.value).toBe("kotlin");

  expect(failures).toEqual([]);
});

test("Guides build-tool selection updates the global cookie", async ({
  page,
  context,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/guides/"));

  const guidePickerIsland = page.locator(
    'astro-island[component-export="GuideVariantPreferencePicker"]',
  );
  await expect
    .poll(() => guidePickerIsland.evaluate((el) => !el.hasAttribute("ssr")))
    .toBe(true);

  await page
    .getByRole("group", { name: "Preferred guide build tool" })
    .getByRole("button", { name: "Maven" })
    .click();

  const cookies = await context.cookies();
  const buildCookie = cookies.find((c) => c.name === "micronaut-build-tool");
  expect(buildCookie).toBeDefined();
  expect(buildCookie?.value).toBe("maven");

  expect(failures).toEqual([]);
});

test("language preference persists after page refresh when set via Guides picker", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/guides/"));

  const guidePickerIsland = page.locator(
    'astro-island[component-export="GuideVariantPreferencePicker"]',
  );
  await expect
    .poll(() => guidePickerIsland.evaluate((el) => !el.hasAttribute("ssr")))
    .toBe(true);

  await page
    .getByRole("group", { name: "Preferred guide language" })
    .getByRole("button", { name: "Groovy" })
    .click();

  await page.reload();

  const guidePickerIsland2 = page.locator(
    'astro-island[component-export="GuideVariantPreferencePicker"]',
  );
  await expect
    .poll(() => guidePickerIsland2.evaluate((el) => !el.hasAttribute("ssr")))
    .toBe(true);

  await expect(
    page
      .getByRole("group", { name: "Preferred guide language" })
      .getByRole("button", { name: "Groovy" }),
  ).toHaveAttribute("aria-pressed", "true");

  expect(failures).toEqual([]);
});

async function expectGuideCallouts(
  content: Locator,
  expectedCallouts: string[][],
): Promise<void> {
  const firstCalloutText = expectedCallouts[0]?.[1] || "";
  const callouts = content
    .locator(".docs-code-callouts")
    .filter({ hasText: firstCalloutText })
    .first();
  await expect(callouts).toBeVisible();

  for (const [, text] of expectedCallouts) {
    await expect(callouts.getByText(text).first()).toBeVisible();
  }

  const values = await callouts
    .locator(".conum")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-value")),
    );
  expect(values).toEqual(expectedCallouts.map(([value]) => value));
}

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

async function expectConvertedGuideSnippets(
  page: Page,
  {
    dependencyLanguage,
    requireDependency,
    requireProperties,
    sourceLanguage,
  }: {
    dependencyLanguage: string;
    requireDependency: boolean;
    requireProperties: boolean;
    sourceLanguage: string;
  },
): Promise<void> {
  const root = page.locator(".generated-guides-content");
  await expect(root).toBeVisible();

  const codeSnippets = root.locator(".docs-code-snippet-template");
  await expect.poll(async () => codeSnippets.count()).toBeGreaterThanOrEqual(4);
  await expect(
    codeSnippets.locator(`button[data-lang="${sourceLanguage}"]`).first(),
  ).toBeVisible();
  await expect(
    root.locator("[data-copy-active-snippet]").first(),
  ).toBeVisible();
  await expect(root.locator(".listingblock")).toHaveCount(0);
  await expect(
    root.locator(".literalblock pre").filter({ hasText: /^\[source,/ }),
  ).toHaveCount(0);

  if (requireDependency) {
    await expect(
      root.locator(".docs-dependency-template").first(),
    ).toBeVisible();
    await expect(
      root
        .locator(".docs-dependency-template")
        .locator(`button[data-lang="${dependencyLanguage}"]`)
        .first(),
    ).toBeVisible();
  }
  if (requireProperties) {
    await expect(
      root.locator(".docs-properties-template").first(),
    ).toBeVisible();
  }

  expect(await root.innerHTML()).not.toMatch(
    /\b(?:common|source|dependency|zipInclude|diffLink):{1,2}[^<\[]*\[[^\]]*]/,
  );
}

async function scrollToGeneratedHeading(
  page: Page,
  headingName: string,
): Promise<void> {
  await page.evaluate((name) => {
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>(
        ".generated-guides-content h1, .generated-guides-content h2, .generated-guides-content h3, .generated-guides-content h4, .generated-guides-content h5, .generated-guides-content h6",
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

function appPath(path: string): string {
  const basePath = normalizeBasePath(
    process.env.PLAYWRIGHT_BASE_PATH || process.env.ASTRO_BASE,
  );
  const deployedPath = deployedGuidesPath(path);
  if (deployedPath === "/") {
    return basePath;
  }
  return `${basePath}${deployedPath.replace(/^\/+/, "")}`;
}

function deployedGuidesPath(path: string): string {
  if (!isStaticPreview() || !isGuidesSurface()) {
    return path;
  }
  const root = configuredGuidesRoot();
  if (path === "/guides" || path === "/guides/") {
    return root;
  }
  if (path.startsWith("/guides/")) {
    return `${root}${path.slice("/guides/".length)}`;
  }
  return path;
}

function guideHrefPattern(file: string): RegExp {
  const slug = file.replace(/\.html$/, "");
  if (isGuidesSurface()) {
    return new RegExp(
      `${escapeRegExp(appPath(`${configuredGuidesRoot()}${slug}/`))}$`,
    );
  }
  return new RegExp(`/guides/${escapeRegExp(slug)}/$`);
}

function guideUrlPattern(slug: string, search?: string): RegExp {
  const query = search ? `\\?${escapeRegExp(search)}` : "";
  if (isGuidesSurface()) {
    return new RegExp(`${escapeRegExp(appPath(`/guides/${slug}/`))}${query}$`);
  }
  return new RegExp(`/guides/${escapeRegExp(slug)}/${query}$`);
}

function catalogUrlPattern(search: string): RegExp {
  const root = isGuidesSurface() ? configuredGuidesRoot() : "/guides/";
  return new RegExp(
    `${escapeRegExp(appPath(root))}\\?${escapeRegExp(search)}$`,
  );
}

function tagUrlPattern(tag: string, search: string): RegExp {
  const path = isGuidesSurface()
    ? `${configuredGuidesRoot()}tag-${tag}/`
    : `/guides/tag-${tag}/`;
  return new RegExp(
    `${escapeRegExp(appPath(path))}\\?${escapeRegExp(search)}$`,
  );
}

function isGuidesSurface(): boolean {
  return process.env.MICRONAUT_DEPLOY_SURFACE === "guides";
}

function isStaticPreview(): boolean {
  return process.env.PLAYWRIGHT_STATIC_PREVIEW === "true";
}

function configuredGuidesRoot(): string {
  return normalizeRoot(process.env.MICRONAUT_GUIDES_ROOT || "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
