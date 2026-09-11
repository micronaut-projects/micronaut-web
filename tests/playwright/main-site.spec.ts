import { expect, test, type Page } from "@playwright/test";
import {
  collectRuntimeScriptAssertions,
  expectNoForbiddenRuntimeLibraries,
} from "./runtime-script-assertions";

const deploySurface = process.env.MICRONAUT_DEPLOY_SURFACE;

test("collapsed mobile navigation exposes primary destinations", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto(appPath("/"));

  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectPrimaryMobileLinks(page);
  expect(failures).toEqual([]);
});

test("mobile header centers the search icon and navigates to Releases", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto(appPath("/"));
  await expectSiteHeaderHydrated(page);

  const searchButton = page.getByRole("button", { name: "Search Micronaut" });
  const [buttonBox, iconBox] = await Promise.all([
    searchButton.boundingBox(),
    searchButton.locator("svg").boundingBox(),
  ]);
  expect(buttonBox).not.toBeNull();
  expect(iconBox).not.toBeNull();
  expect(
    Math.abs(
      iconBox!.x + iconBox!.width / 2 - (buttonBox!.x + buttonBox!.width / 2),
    ),
  ).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Micronaut" });
  const releasesLink = dialog
    .locator('[data-mobile-navigation-group="Browse"]')
    .getByRole("link", { name: "Releases", exact: true });
  await expect(releasesLink).toHaveAttribute(
    "href",
    appPath("/category/release-announcements/"),
  );
  await releasesLink.click();
  await expect(page).toHaveURL(appPath("/category/release-announcements/"));
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Micronaut Release Announcements",
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test("tablet navigation stays collapsed and can select docs, guides, and blog", async ({
  page,
}) => {
  const failures = collectBrowserFailures(page);

  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto(appPath("/"));

  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);

  if (deploySurface === "main") {
    await expectMobileDestinationHref(
      page,
      "Docs",
      /\/micronaut-docs-v2\/latest\/$/,
    );
    await expectMobileDestinationHref(
      page,
      "Guides",
      /\/micronaut-guides-v2\/$/,
    );
  } else {
    await openMobileDestination(page, "Docs", /\/docs\/$/);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await openMobileDestination(page, "Guides", /\/guides\/$/);
    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  }

  await openMobileDestination(page, "Blog", /\/blog\/$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Micronaut Blog" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(failures).toEqual([]);
});

test("desktop navigation links directly to the blog", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/"));

  await expect(
    page.locator("header").getByRole("link", { name: "Blog" }),
  ).toHaveAttribute("href", /\/blog\/$/);
});

test("theme query parameter presets the selected color mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (new URLSearchParams(window.location.search).get("theme") === "dark") {
      localStorage.setItem("micronaut-web-theme-mode", "light");
    }
  });

  await page.goto(`${appPath("/")}?theme=dark`);
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute("data-theme-mode", "dark");

  await page.goto(appPath("/"));
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.goto(`${appPath("/")}?theme=light`);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-theme-mode",
    "light",
  );
});

test("desktop navigation highlights Blog only on blog routes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(appPath("/"));
  await expect(
    page.locator("header").getByRole("link", { name: "Blog", exact: true }),
  ).not.toHaveAttribute("data-active");

  await page.goto(appPath("/blog/"));
  await expect(
    page.locator("header").getByRole("link", { name: "Blog", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("desktop header enlarges the brand without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/"));

  const header = page.locator("header");
  await expect(header.locator(":scope > div")).toHaveCSS("height", "64px");
  await expect(
    header.locator('a[aria-label="Micronaut home"] img:visible'),
  ).toHaveCSS("height", "52px");
  await expectNoHorizontalOverflow(page);
});

test("main-site runtime scripts do not include build-time content processors", async ({
  page,
}) => {
  const runtimeScripts = collectRuntimeScriptAssertions(page);
  const failures = collectBrowserFailures(page);

  await page.goto(appPath("/"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoForbiddenRuntimeLibraries(runtimeScripts);

  await expectNoForbiddenRuntimeLibraries(runtimeScripts);
  expect(failures).toEqual([]);
});

test("desktop navigation presents blog and releases directly", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appPath("/"));

  const header = page.locator("header");
  await expect(
    header.getByRole("link", { name: "Blog", exact: true }),
  ).toHaveAttribute("href", /\/blog\/$/);
  await expect(
    header.getByRole("link", { name: "Get Started", exact: true }),
  ).toHaveCount(0);

  await expect(
    header.getByRole("link", { name: "Releases", exact: true }),
  ).toHaveAttribute("href", /\/category\/release-announcements\/$/);
  await expect(
    header.getByRole("button", { name: "Resources", exact: true }),
  ).toHaveCount(0);
});

test("homepage code examples do not include a Python variant", async ({
  page,
}) => {
  await page.goto(appPath("/"));

  const pythonTab = page.locator('[role="tab"][data-lang="python"]').first();
  await expect(pythonTab).toHaveCount(0);
});

test("homepage Download the CLI link opens the CLI page", async ({ page }) => {
  await page.goto(appPath("/"));

  const cliLink = page.getByRole("link", { name: "Download the CLI" });
  await expect(cliLink).toHaveAttribute("href", appPath("/cli/"));
  await cliLink.click();
  await expect(page).toHaveURL(appPath("/cli/"));
  await expect(
    page.getByRole("heading", { level: 1, name: "Micronaut CLI" }),
  ).toBeVisible();
});

test("homepage addresses PageSpeed image and accessibility findings", async ({
  page,
}) => {
  const svgPathErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("<path> attribute d")
    ) {
      svgPathErrors.push(message.text());
    }
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${appPath("/")}?theme=dark`);

  const marquee = page.locator(".customer-logo-marquee");
  await marquee.scrollIntoViewIfNeeded();

  for (const [name, widths] of [
    ["Samsung SmartThings", "111w|222w"],
    ["Mojang", "100w|200w"],
    ["Minecraft", "111w|222w"],
  ] as const) {
    const images = page.locator(`img[alt="${name} logo"]`);
    expect(await images.count()).toBeGreaterThan(0);
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("srcset", /\.webp/);
      await expect
        .poll(() =>
          image.evaluate((element) => (element as HTMLImageElement).currentSrc),
        )
        .toMatch(new RegExp(`(?:${widths})\\.webp$`));
    }
  }

  const commonhausLink = page.getByRole("link", {
    name: "Commonhaus Foundation",
  });
  await commonhausLink.scrollIntoViewIfNeeded();
  await expect(commonhausLink).toBeVisible();
  await expect(commonhausLink.locator("img")).toHaveCount(2);
  await expect(commonhausLink.locator("img").nth(0)).toHaveAttribute(
    "width",
    "1350",
  );
  await expect(commonhausLink.locator("img").nth(0)).toHaveAttribute(
    "height",
    "286",
  );
  await expect(commonhausLink.locator("img").nth(1)).toHaveAttribute(
    "width",
    "800",
  );
  await expect(commonhausLink.locator("img").nth(1)).toHaveAttribute(
    "height",
    "350",
  );

  await expect(page.locator("#server-groovy-tab svg path")).toHaveAttribute(
    "d",
    /-1\.622-2\.692-2\.36-3\.951z/,
  );
  expect(svgPathErrors).toEqual([]);
});

test("the hero release refreshes in the browser and survives a failed request", async ({
  page,
}) => {
  // Preview hosts are not on the launch.micronaut.io CORS allowlist, so the
  // refresh reads the GitHub API here. Failing it proves the build-time
  // version still stands on its own.
  await page.route("https://api.github.com/**", (route) => route.abort());
  const releaseRequest = page.waitForRequest(
    "https://api.github.com/repos/micronaut-projects/micronaut-starter/releases/latest",
  );

  await page.goto(appPath("/"));
  await releaseRequest;

  // The rendered version is not asserted: when GitHub is unreachable at build
  // time — its unauthenticated budget is 60 requests per hour per IP — the hero
  // is meant to fall back to bare "Latest release" rather than render empty.
  const heroVersion = page.locator("[data-micronaut-release-version]").first();
  await expect(heroVersion).toHaveAttribute(
    "data-micronaut-release-version",
    "Latest release: Micronaut {version}",
  );
  await expect(heroVersion).not.toBeEmpty();
});

test("visor keeps a still starfield under Reduce Motion", async ({ page }) => {
  // Set before navigating: the project's device preset supplies its own context
  // options, so a describe-level test.use for this does not survive.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(appPath("/"));

  await expect(
    page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
  ).resolves.toBe(true);

  // The marks sit off to the right of the visor and are clipped until
  // something moves them, so hiding them or freezing them at their start
  // renders as blank glass rather than as a still field.
  const onGlass = await page.evaluate(() => {
    const svg = document.querySelector("svg.sally-visor");
    if (!svg) return -1;
    return [...svg.querySelectorAll(".sv-m")].filter((mark) => {
      const x = 600 + new DOMMatrix(getComputedStyle(mark).transform).m41;
      return x > 290 && x < 526;
    }).length;
  });
  expect(onGlass).toBeGreaterThan(4);

  const positions = () =>
    page.evaluate(() =>
      [...document.querySelectorAll("svg.sally-visor .sv-m")]
        .map((m) =>
          Math.round(new DOMMatrix(getComputedStyle(m).transform).m41),
        )
        .join(","),
    );
  const before = await positions();
  await page.waitForTimeout(700);
  expect(await positions()).toBe(before);
});

test("GraalVM comparison keeps every measurement readable on narrow viewports", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.goto(appPath("/"));

  const comparison = page.locator("[data-graalvm-comparison]");
  await expect(comparison).toContainText("Startup");
  await expect(comparison).toContainText("Memory");

  // Wide content scrolls inside its own container rather than the page.
  const [box, pageOverflows] = await Promise.all([
    comparison.boundingBox(),
    page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ]);
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
  expect(pageOverflows).toBe(false);
});

test("footer exposes social and contact links as labelled icons", async ({
  page,
}) => {
  await page.goto(appPath("/"));

  const socialLinks = page.getByRole("navigation", {
    name: "Micronaut social links",
  });
  await expect(
    socialLinks.getByRole("link", { name: "Email" }),
  ).toHaveAttribute("href", "mailto:info@micronaut.io");
  await expect(
    socialLinks.getByRole("link", { name: "GitHub" }),
  ).toHaveAttribute("href", "https://github.com/micronaut-projects");
  await expect(
    socialLinks.getByRole("link", { name: "OpenCollective" }),
  ).toHaveAttribute("href", "https://opencollective.com/micronaut");
  await expect(
    socialLinks.getByRole("link", { name: "LinkedIn" }),
  ).toHaveAttribute("href", "https://www.linkedin.com/showcase/28176137");
  await expect(
    socialLinks.getByRole("link", { name: "Discord" }),
  ).toHaveAttribute("href", "https://discord.com/invite/9xRFsHv98T");
  await expect(socialLinks.getByRole("link", { name: "X" })).toHaveAttribute(
    "href",
    "https://x.com/micronautfw",
  );
  await expect(
    socialLinks.getByRole("link", { name: "BlueSky" }),
  ).toHaveAttribute("href", "https://bsky.app/profile/micronautfw.bsky.social");
  await expect(
    socialLinks.getByRole("link", { name: "Mastodon" }),
  ).toHaveAttribute("href", "https://fosstodon.org/@micronaut");
  await expect(
    socialLinks.getByRole("link", { name: "YouTube" }),
  ).toHaveAttribute("href", "https://www.youtube.com/@MicronautFramework");
});

test("footer labels links without the Micronaut prefix", async ({ page }) => {
  await page.goto(appPath("/"));

  const footer = page.getByRole("navigation", { name: "Main site footer" });
  const expectedLinks = [
    ["Success Stories", /\/micronaut-success-stories\/$/],
    ["Blog", /\/blog\/$/],
    ["Release Announcements", /\/category\/release-announcements\/$/],
    ["Roadmap", /\/micronaut-roadmap\/$/],
    ["Security Announcements", /\/category\/security-announcements\/$/],
    ["Logos", /\/brand-guidelines\/micronaut-logos\/$/],
    ["Trademark Policy", /\/brand-guidelines\/micronaut-trademark-policy\/$/],
  ] as const;

  for (const [label, href] of expectedLinks) {
    await expect(
      footer.getByRole("link", { name: label, exact: true }),
    ).toHaveAttribute("href", href);
  }

  await expect(footer.getByRole("link", { name: /^Micronaut/ })).toHaveCount(0);
});

test("pages carry share card metadata and structured data", async ({
  page,
}) => {
  await page.goto(appPath("/"));

  const content = (property: string, attribute = "property") =>
    page
      .locator(`meta[${attribute}="${property}"]`)
      .first()
      .getAttribute("content");

  expect(await content("og:type")).toBe("website");
  expect(await content("og:site_name")).toBe("Micronaut Framework");
  expect(await content("og:title")).toBe("Micronaut Framework");
  expect(await content("og:description")).toContain("JVM-based");
  expect(await content("og:url")).toMatch(/\/$/);
  expect(await content("og:image")).toMatch(
    /\/micronaut-assets\/social\/micronaut-share-card\.png$/,
  );
  expect(await content("twitter:card", "name")).toBe("summary_large_image");
  expect(await content("twitter:image", "name")).toBe(
    await content("og:image"),
  );

  const homeStructuredData = JSON.parse(
    (await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent()) || "{}",
  );
  expect(homeStructuredData["@type"]).toBe("WebPage");
  expect(homeStructuredData.url).toBe(await content("og:url"));

  await page.goto(appPath("/2018/10/23/micronaut-1-0-ga-released/"));
  expect(await content("og:type")).toBe("article");
  expect(await content("article:published_time")).toMatch(/^2018-10-23T/);
  const postStructuredData = JSON.parse(
    (await page
      .locator('script[type="application/ld+json"]')
      .first()
      .textContent()) || "{}",
  );
  expect(postStructuredData["@type"]).toBe("BlogPosting");
  expect(postStructuredData.headline).toContain("Micronaut 1.0 GA Released");
});

async function expectPrimaryMobileLinks(page: Page): Promise<void> {
  await expectSiteHeaderHydrated(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Micronaut" });
  await expect(dialog).toBeVisible();

  const browseLinks = dialog.locator('[data-mobile-navigation-group="Browse"]');
  await expect(browseLinks.getByRole("link", { name: "Docs" })).toHaveAttribute(
    "href",
    deploySurface === "main" ? /\/micronaut-docs-v2\/latest\/$/ : /\/docs\/$/,
  );
  await expect(
    browseLinks.getByRole("link", { name: "Guides" }),
  ).toHaveAttribute(
    "href",
    deploySurface === "main" ? /\/micronaut-guides-v2\/$/ : /\/guides\/$/,
  );
  await expect(browseLinks.getByRole("link", { name: "Blog" })).toHaveAttribute(
    "href",
    /\/blog\/$/,
  );
  await expect(
    browseLinks.getByRole("link", { name: "Launch" }),
  ).toHaveAttribute("href", "https://launch.micronaut.io");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

async function expectMobileDestinationHref(
  page: Page,
  label: string,
  expectedHref: RegExp,
): Promise<void> {
  await expectSiteHeaderHydrated(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Micronaut" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .locator('[data-mobile-navigation-group="Browse"]')
      .getByRole("link", { name: label }),
  ).toHaveAttribute("href", expectedHref);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

async function openMobileDestination(
  page: Page,
  label: string,
  expectedUrl: RegExp,
): Promise<void> {
  await expectSiteHeaderHydrated(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  const dialog = page.getByRole("dialog", { name: "Micronaut" });
  await expect(dialog).toBeVisible();
  await dialog
    .locator('[data-mobile-navigation-group="Browse"]')
    .getByRole("link", { name: label })
    .click();
  await expect(page).toHaveURL(expectedUrl);
}

async function expectSiteHeaderHydrated(page: Page): Promise<void> {
  const headerIsland = page.locator(
    'astro-island[component-export="SiteHeader"]',
  );
  await expect(headerIsland).toBeVisible();
  await expect
    .poll(() =>
      headerIsland.evaluate((element) => !element.hasAttribute("ssr")),
    )
    .toBe(true);
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

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Execution context was destroyed")
        ) {
          return Number.MAX_SAFE_INTEGER;
        }
        throw error;
      }
    })
    .toBeLessThanOrEqual(1);
}

function appPath(path: string): string {
  const basePath = normalizeBasePath(
    process.env.PLAYWRIGHT_BASE_PATH || process.env.ASTRO_BASE,
  );
  if (path === "/") {
    return basePath;
  }
  return `${basePath}${path.replace(/^\/+/, "")}`;
}

function normalizeBasePath(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }
  const absolutePath = path.startsWith("/") ? path : `/${path}`;
  return absolutePath.endsWith("/") ? absolutePath : `${absolutePath}/`;
}
