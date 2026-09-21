import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { clientRedirectDocument } from "../../../src/lib/route-compatibility.ts";
import { pruneSurface } from "../../prune-surface.ts";
import { publishDocsSurface } from "../../publish-docs-surface.ts";
import { publishDocsSnapshotRedirects } from "../../publish-docs-snapshot.ts";
import { configurePagesDeployment } from "../../configure-pages-deployment.ts";
import {
  isNewestPublishedDocsVersion,
  supersedingDocsLineRelease,
  updateDocsVersionManifest,
} from "../../update-docs-version-manifest.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const deploymentConfigFile = path.join(
  projectDirectory,
  "src",
  "lib",
  "deployment-config.ts",
);
const surfaceRoutesFile = path.join(
  projectDirectory,
  "src",
  "lib",
  "surface-routes.ts",
);
const pagesArtifactTokenPattern = new RegExp("PAGES_" + "TOKEN");

test("Pages deployment derives its base and URL from the target repository", async (t) => {
  const environment = await configurePagesDeployment({
    surface: "docs",
    targetRepository: "example-org/reference-docs",
    publishedDirectory: await temporaryDirectory(t),
    repositoryOwner: "micronaut-projects",
  });

  assert.equal(environment.ASTRO_BASE, "/reference-docs/");
  assert.equal(
    environment.MICRONAUT_DOCS_SITE_URL,
    "https://example-org.github.io/reference-docs/",
  );
  assert.equal(
    environment.MICRONAUT_MAIN_SITE_URL,
    "https://micronaut-projects.github.io/micronaut-web/",
  );
});

test("Pages deployment detects branch custom domains and complete surface URLs", async (t) => {
  const published = await temporaryDirectory(t);
  await writeTextFile(published, "CNAME", "guides.micronaut.io\n");

  const environment = await configurePagesDeployment({
    surface: "guides",
    targetRepository: "micronaut-projects/micronaut-guides-v2",
    publishedDirectory: published,
    repositoryOwner: "micronaut-projects",
    configuredMainSiteUrl: "https://micronaut.io/",
    configuredDocsSiteUrl: "https://docs.micronaut.io/",
  });

  assert.equal(environment.ASTRO_BASE, "/");
  assert.equal(environment.MICRONAUT_CUSTOM_DOMAIN, "guides.micronaut.io");
  assert.equal(
    environment.MICRONAUT_GUIDES_SITE_URL,
    "https://guides.micronaut.io/",
  );
  assert.equal(environment.MICRONAUT_MAIN_SITE_URL, "https://micronaut.io/");
  assert.equal(
    environment.MICRONAUT_DOCS_SITE_URL,
    "https://docs.micronaut.io/",
  );
});

test("deployment routes keep all-in-one paths by default", async () => {
  const deployment = await importDeploymentConfig("all", {
    MICRONAUT_DEPLOY_SURFACE: undefined,
    MICRONAUT_DOCS_ROOT: undefined,
    MICRONAUT_DOCS_LATEST_ROOT: undefined,
    MICRONAUT_GUIDES_ROOT: undefined,
    MICRONAUT_GUIDES_LATEST_ROOT: undefined,
    DEFAULT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_MAIN_SITE_URL: undefined,
    MICRONAUT_DOCS_SITE_URL: undefined,
    MICRONAUT_GUIDES_SITE_URL: undefined,
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "/docs/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/example/"),
    "/guides/example/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/latest/example/"),
    "/latest/example/",
  );
  assert.equal(deployment.routeForSurface("docs", "/latest/"), "/docs/");
});

test("deployment routes map docs project pages to the standalone docs root", async () => {
  const deployment = await importDeploymentConfig("docs", {
    MICRONAUT_DEPLOY_SURFACE: "docs",
    MICRONAUT_DOCS_ROOT: "/latest",
    MICRONAUT_DOCS_SITE_URL: "https://example.test/micronaut-docs/",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "/latest/core/",
  );
  assert.equal(deployment.routeForCurrentDeployment("/docs/"), "/latest/");
  assert.equal(
    deployment.routeForCurrentDeployment("/docs/search-index.json"),
    "/latest/search-index.json",
  );
  assert.equal(
    deployment.externalSurfacePath("guides", "/guides/micronaut-http-client/"),
    "https://example.test/micronaut-guides/micronaut-http-client/",
  );
  assert.equal(
    deployment.canonicalSurfaceUrl("docs", "/docs/core/"),
    "https://example.test/micronaut-docs/latest/core/",
  );
});

test("deployment routes map main links to external docs and guides sites", async () => {
  const deployment = await importDeploymentConfig("main", {
    MICRONAUT_DEPLOY_SURFACE: "main",
    MICRONAUT_DOCS_SITE_URL: "https://example.test/micronaut-docs/",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://example.test/micronaut-docs/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://example.test/micronaut-guides/micronaut-http-client/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/"),
    "https://example.test/micronaut-guides/",
  );
});

test("deployment routes derive external surface URLs from the GitHub Pages origin", async () => {
  const deployment = await importDeploymentConfig("github-pages-origin", {
    MICRONAUT_DEPLOY_SURFACE: "main",
    DEFAULT_GITHUB_PAGES_ORIGIN: undefined,
    MICRONAUT_GITHUB_PAGES_ORIGIN: "https://example-org.github.io/",
    MICRONAUT_MAIN_SITE_URL: undefined,
    MICRONAUT_DOCS_SITE_URL: undefined,
    MICRONAUT_GUIDES_SITE_URL: undefined,
  });

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://example-org.github.io/micronaut-docs-v2/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://example-org.github.io/micronaut-guides-v2/micronaut-http-client/",
  );
});

test("deployment routes use the default GitHub Pages origin fallback", async () => {
  const deployment = await importDeploymentConfig(
    "default-github-pages-origin",
    {
      MICRONAUT_DEPLOY_SURFACE: "main",
      DEFAULT_GITHUB_PAGES_ORIGIN: "https://fallback-org.github.io/",
      MICRONAUT_GITHUB_PAGES_ORIGIN: undefined,
      MICRONAUT_MAIN_SITE_URL: undefined,
      MICRONAUT_DOCS_SITE_URL: undefined,
      MICRONAUT_GUIDES_SITE_URL: undefined,
    },
  );

  assert.equal(
    deployment.routeForCurrentDeployment("/docs/core/"),
    "https://fallback-org.github.io/micronaut-docs-v2/latest/core/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "https://fallback-org.github.io/micronaut-guides-v2/micronaut-http-client/",
  );
});

test("deployment routes publish standalone guides at the root", async () => {
  const deployment = await importDeploymentConfig("guides", {
    MICRONAUT_DEPLOY_SURFACE: "guides",
    MICRONAUT_GUIDES_SITE_URL: "https://example.test/micronaut-guides/",
  });

  assert.equal(deployment.routeForCurrentDeployment("/"), "/");
  assert.equal(deployment.routeForCurrentDeployment("/guides/"), "/");
  // Icons ship with the surface; everything else under /micronaut-assets/ is
  // still resolved against the main site.
  assert.equal(
    deployment.routeForCurrentDeployment(
      "/micronaut-assets/icons/projects/reactor.webp",
    ),
    "/micronaut-assets/icons/projects/reactor.webp",
  );
  assert.match(
    deployment.routeForCurrentDeployment("/micronaut-assets/logos/logo.svg"),
    /^https:\/\//,
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/guides/micronaut-http-client/"),
    "/micronaut-http-client/",
  );
  assert.equal(
    deployment.routeForCurrentDeployment("/latest/micronaut-http-client/"),
    "/micronaut-http-client/",
  );
});

test("surface route guards skip generated docs and guides routes in main builds", async () => {
  const routes = await importSurfaceRoutes("guards", {});
  assert.equal(routes.shouldBuildDocsRoutes("main"), false);
  assert.equal(routes.shouldBuildGuidesRoutes("main"), false);
  assert.equal(routes.shouldBuildDocsRoutes("docs"), true);
  assert.equal(routes.shouldBuildGuidesRoutes("docs"), false);
  assert.equal(routes.shouldBuildDocsRoutes("guides"), false);
  assert.equal(routes.shouldBuildGuidesRoutes("guides"), true);
  assert.equal(routes.shouldBuildDocsRoutes("all"), true);
  assert.equal(routes.shouldBuildGuidesRoutes("all"), true);
});

test("generated docs and guides dynamic route files use surface guards", async () => {
  const guardedRoutes = [
    ["src/pages/docs/[slug].astro", "shouldBuildDocsRoutes"],
    ["src/pages/docs/[searchIndex].json.ts", "shouldBuildDocsRoutes"],
    ["src/pages/docs/assets/[...path].ts", "shouldBuildDocsRoutes"],
    ["src/pages/guides/[slug].astro", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/[slug].html.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/[download].zip.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/guides/assets/[...path].ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/[page].html.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/[download].zip.ts", "shouldBuildGuidesRoutes"],
    ["src/pages/latest/assets/[...path].ts", "shouldBuildGuidesRoutes"],
  ];

  for (const [routeFile, guard] of guardedRoutes) {
    const source = await fs.readFile(
      path.join(projectDirectory, routeFile),
      "utf8",
    );
    assert.match(source, new RegExp(`${guard}\\(\\)`), routeFile);
  }
  assert.equal(
    await exists(
      path.join(projectDirectory, "src/pages/docs/search-index.json.ts"),
    ),
    false,
  );
});

test("docs pruning publishes docs at the repository root", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "docs",
    distDirectory: dist,
    base: "/micronaut-docs/",
    docsRoot: "/latest",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(await exists(path.join(dist, "versions.json")), true);
  assert.equal(
    await exists(path.join(dist, "latest", "core", "index.html")),
    true,
  );
  assert.equal(
    await exists(path.join(dist, "latest", "search-index.json")),
    true,
  );
  assert.equal(await exists(path.join(dist, "latest.html")), true);
  assert.equal(await exists(path.join(dist, "robots.txt")), true);
  assert.equal(await exists(path.join(dist, "sitemap-index.xml")), true);
  assert.equal(await exists(path.join(dist, "sitemap-0.xml")), true);
  assert.equal(
    await exists(path.join(dist, "latest", "guide", "index.html")),
    true,
  );
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  // Only the icon assets travel with a surface; the rest stays on the main site.
  assert.equal(
    await exists(
      path.join(dist, "micronaut-assets", "icons", "projects", "reactor.webp"),
    ),
    true,
  );
  assert.equal(
    await exists(path.join(dist, "micronaut-assets", "logo.svg")),
    false,
  );
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), false);
  assert.equal(
    await exists(path.join(dist, "shell", "site-header.css")),
    false,
  );
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  const assetFile = await singleProjectHashedAssetFile(
    dist,
    "core",
    "diagram",
    "svg",
  );
  assert.equal(
    await exists(path.join(dist, "assets", "core", assetFile)),
    true,
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest", "index.html"), "utf8"),
    /docs\/index\.html/,
  );
  const docsCoreHtml = await fs.readFile(
    path.join(dist, "latest", "core", "index.html"),
    "utf8",
  );
  assertNoDocsVersionSwitcherIsland(docsCoreHtml);
  assert.doesNotMatch(docsCoreHtml, /<style\b[^>]*data-docs-shiki/i);
  assert.doesNotMatch(docsCoreHtml, /window\.docsSnippetRuntime/);
  assert.match(docsCoreHtml, /_astro\/generated-code\.css/);
  assert.match(docsCoreHtml, /_astro\/snippet-runtime\.js/);
  assert.match(
    docsCoreHtml,
    new RegExp(
      `\\.\\./\\.\\./assets/core/${escapeRegExp(assetFile)}\\?cache=1#diagram`,
    ),
  );
  const docsGuideRedirectHtml = await fs.readFile(
    path.join(dist, "latest", "guide", "index.html"),
    "utf8",
  );
  assert.match(docsGuideRedirectHtml, /\/micronaut-docs\/latest\/core\//);
  assert.match(
    await fs.readFile(
      path.join(dist, "latest", "guide", "configurationreference.html"),
      "utf8",
    ),
    /location\.replace\("\/micronaut-docs\/latest\/core\/configuration-reference\/"/,
  );
  // Core's javadoc left this host; the 404 page forwards `/{version}/api/`.
  const notFoundHtml = await fs.readFile(path.join(dist, "404.html"), "utf8");
  assert.match(notFoundHtml, /const base="\/micronaut-docs\/"/);
  assert.match(
    notFoundHtml,
    /"https:\/\/micronaut-projects\.github\.io\/micronaut-docs"\+"\/"\+version\+"\/api\/"/,
  );
  assert.match(
    await fs.readFile(path.join(dist, "latest.html"), "utf8"),
    /location\.replace/,
  );
});

test("guides pruning publishes root-level guides and legacy latest redirects", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "guides",
    distDirectory: dist,
    base: "/micronaut-guides/",
    customDomain: "guides.micronaut.io",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(
    await fs.readFile(path.join(dist, "CNAME"), "utf8"),
    "guides.micronaut.io\n",
  );
  assert.equal(await exists(path.join(dist, "robots.txt")), true);
  assert.equal(await exists(path.join(dist, "sitemap-index.xml")), true);
  assert.equal(await exists(path.join(dist, "sitemap-0.xml")), true);
  assert.equal(
    await exists(path.join(dist, "micronaut-http-client", "index.html")),
    true,
  );
  assert.equal(
    await exists(
      path.join(dist, "latest", "micronaut-http-client", "index.html"),
    ),
    true,
  );
  assert.equal(await exists(path.join(dist, "latest", "guide")), false);
  assert.equal(await exists(path.join(dist, "latest", "assets")), false);
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(
    await exists(
      path.join(dist, "micronaut-assets", "icons", "projects", "reactor.webp"),
    ),
    true,
  );
  assert.equal(
    await exists(path.join(dist, "micronaut-assets", "logo.svg")),
    false,
  );
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), false);
  assert.equal(
    await exists(path.join(dist, "shell", "site-header.css")),
    false,
  );
  assert.equal(await exists(path.join(dist, "assets")), true);
  const assetFile = await singleProjectHashedAssetFile(
    dist,
    "micronaut-http-client",
    "client",
    "png",
  );
  assert.equal(
    await exists(path.join(dist, "assets", "micronaut-http-client", assetFile)),
    true,
  );
  const guideHtml = await fs.readFile(
    path.join(dist, "micronaut-http-client", "index.html"),
    "utf8",
  );
  assert.doesNotMatch(guideHtml, /<style\b[^>]*data-docs-shiki/i);
  assert.doesNotMatch(guideHtml, /window\.docsSnippetRuntime/);
  assert.match(guideHtml, /_astro\/generated-code\.css/);
  assert.match(guideHtml, /_astro\/snippet-runtime\.js/);
  assert.match(
    guideHtml,
    new RegExp(
      `\\.\\./assets/micronaut-http-client/${escapeRegExp(assetFile)}`,
    ),
  );
  assert.equal(await exists(path.join(dist, "latest", "index.html")), true);
});

test("main pruning drops docs, guides, latest, and template artifacts", async (t) => {
  const dist = await fakeDist(t);

  await pruneSurface({
    surface: "main",
    distDirectory: dist,
    base: "/micronaut-web/",
    budgetMb: 1,
  });

  assert.equal(await exists(path.join(dist, "index.html")), true);
  assert.equal(await exists(path.join(dist, ".nojekyll")), true);
  assert.equal(await exists(path.join(dist, "launch", "index.html")), false);
  assert.equal(
    await exists(path.join(dist, "micronaut-assets", "logo.svg")),
    true,
  );
  assert.equal(await exists(path.join(dist, "_astro", "app.js")), true);
  assert.equal(await exists(path.join(dist, "_astro", "app.css")), true);
  assert.equal(await exists(path.join(dist, "_astro", "chunk.js")), true);
  assert.equal(await exists(path.join(dist, "shell", "site-header.js")), true);
  assert.equal(await exists(path.join(dist, "shell", "site-header.css")), true);
  assert.equal(
    await exists(path.join(dist, "_astro", "fonts", "code.woff2")),
    true,
  );
  assert.equal(await exists(path.join(dist, "_astro", "unused.js")), false);
  assert.equal(await exists(path.join(dist, "_astro", "unused.css")), false);
  assert.equal(await exists(path.join(dist, "docs")), false);
  assert.equal(await exists(path.join(dist, "guides")), false);
  assert.equal(await exists(path.join(dist, "latest")), false);
  assert.equal(await exists(path.join(dist, "micronaut-web")), false);
  assert.equal(await exists(path.join(dist, "versions.json")), false);
  assert.equal(await exists(path.join(dist, "robots.txt")), true);
  assert.equal(await exists(path.join(dist, "sitemap-index.xml")), true);
});

test("docs and guides production layouts load the shared header shell from the main site", async () => {
  const layout = await fs.readFile(
    path.join(projectDirectory, "src", "layouts", "WebLayout.astro"),
    "utf8",
  );
  const shell = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "site-header-shell.tsx",
    ),
    "utf8",
  );
  const shellClient = await fs.readFile(
    path.join(
      projectDirectory,
      "src",
      "components",
      "web",
      "site-header-shell-client.tsx",
    ),
    "utf8",
  );
  const shellBuild = await fs.readFile(
    path.join(projectDirectory, "scripts", "build-site-header-shell.ts"),
    "utf8",
  );
  const astroConfig = await fs.readFile(
    path.join(projectDirectory, "astro.config.mjs"),
    "utf8",
  );

  assert.match(layout, /data-micronaut-site-header/);
  assert.match(layout, /externalSurfaceUrls\.main/);
  assert.match(layout, /shell\/site-header\.js/);
  assert.match(layout, /shell\/site-header\.css/);
  assert.match(layout, /!import\.meta\.env\.DEV/);
  assert.match(layout, /resolvedCanonicalUrl/);
  assert.match(layout, /canonicalSurfaceUrl\(canonicalSurface, routePath\)/);
  assert.match(astroConfig, /site:\s*deploymentConfig\.site/);
  assert.match(shell, /import\("\.\/site-header-shell-client"\)/);
  assert.match(shell, /requestIdleCallback/);
  assert.match(shell, /scheduleHeaderLoad\(\)/);
  assert.match(layout, /<SiteHeader/);
  assert.match(shellClient, /hydrateRoot/);
  assert.match(shell, /@\/styles\/globals\.css/);
  assert.match(shellClient, /SiteHeader/);
  assert.match(
    shellBuild,
    /"process\.env\.NODE_ENV":\s*JSON\.stringify\("production"\)/,
  );
});

test("every surface publishes crawler metadata for its own canonical pages", async () => {
  const astroConfig = await fs.readFile(
    path.join(projectDirectory, "astro.config.mjs"),
    "utf8",
  );
  const layout = await fs.readFile(
    path.join(projectDirectory, "src", "layouts", "WebLayout.astro"),
    "utf8",
  );
  const robots = await fs.readFile(
    path.join(projectDirectory, "src", "pages", "robots.txt.ts"),
    "utf8",
  );

  // Without both hooks the sitemap lists the other surfaces' pages, the
  // pre-prune paths, and every Astro.redirect stub.
  assert.match(astroConfig, /sitemap\(\{/);
  assert.match(astroConfig, /filter: \(page\) =>/);
  assert.match(astroConfig, /isIndexablePage\(routePath\)/);
  assert.match(astroConfig, /serialize: \(item\) =>/);
  assert.match(
    astroConfig,
    /routeForSurface\(surface, sitemapPath\(pageUrl\)\)/,
  );
  assert.match(layout, /name="robots" content="noindex"/);
  assert.match(layout, /property="og:image"/);
  assert.match(layout, /name="twitter:card" content="summary_large_image"/);
  assert.match(layout, /application\/ld\+json/);
  assert.match(robots, /sitemap-index\.xml/);
  assert.match(robots, /import\.meta\.env\.BASE_URL/);
});

test("web workflow deploys the main surface through GitHub Pages Actions", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-web.yml"),
    "utf8",
  );

  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
  assert.match(workflow, /environment:\s*\n\s*name:\s*github-pages/);
  assert.match(workflow, /MICRONAUT_DEPLOY_SURFACE:\s*main/);
  assert.match(workflow, /repository_dispatch:/);
  assert.match(workflow, /micronaut-starter-ui-published/);
  assert.match(
    workflow,
    /MICRONAUT_DOCS_SITE_URL:\s*https:\/\/docs\.micronaut\.io\//,
  );
  assert.match(workflow, /MICRONAUT_SKIP_MAIN_SITE_BROWSER_TESTS:\s*"true"/);
  assert.doesNotMatch(workflow, /npx playwright install --with-deps chromium/);
  assert.match(workflow, /npm run build:main/);
  assert.match(workflow, /git fetch --no-tags --depth=1 origin gh-pages/);
  assert.match(workflow, /git archive FETCH_HEAD launch/);
  assert.match(workflow, /touch dist\/\.nojekyll/);
  assert.match(workflow, /actions\/configure-pages@/);
  assert.match(workflow, /actions\/upload-pages-artifact@/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@/);
  assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
  assert.doesNotMatch(workflow, /git worktree add published-web/);
  assert.doesNotMatch(workflow, /checkout --orphan/);
  assert.doesNotMatch(workflow, /git push origin HEAD:"\$TARGET_BRANCH"/);
});

test("docs and guides workflows branch-deploy to configured target repositories", async () => {
  const [webWorkflow, ...branchWorkflows] = await Promise.all(
    ["deploy-web.yml", "deploy-docs.yml", "deploy-guides.yml"].map(
      async (workflow) =>
        fs.readFile(
          path.join(projectDirectory, ".github", "workflows", workflow),
          "utf8",
        ),
    ),
  );

  const [docsWorkflow, guidesWorkflow] = branchWorkflows;
  assert.doesNotMatch(webWorkflow, pagesArtifactTokenPattern);
  for (const workflow of branchWorkflows) {
    assert.match(workflow, /TARGET_REPOSITORY:\s*micronaut-projects\//);
    assert.match(workflow, /repository:\s*\$\{\{ env\.TARGET_REPOSITORY \}\}/);
    assert.match(workflow, /token:\s*\$\{\{ secrets\.GH_TOKEN \}\}/);
    assert.match(
      workflow,
      /git push origin HEAD:\$\{\{ env\.TARGET_BRANCH \}\}/,
    );
    assert.doesNotMatch(workflow, pagesArtifactTokenPattern);
    assert.doesNotMatch(workflow, /upload-pages-artifact/);
    assert.doesNotMatch(workflow, /deploy-pages/);
  }
  assert.match(
    docsWorkflow,
    /TARGET_REPOSITORY:\s*micronaut-projects\/micronaut-docs-v2/,
  );
  assert.match(docsWorkflow, /path:\s*published-docs/);
  assert.match(docsWorkflow, /working-directory:\s*published-docs/);
  assert.match(
    guidesWorkflow,
    /TARGET_REPOSITORY:\s*micronaut-projects\/micronaut-guides-v2/,
  );
  assert.match(guidesWorkflow, /path:\s*published-guides/);
  assert.match(guidesWorkflow, /working-directory:\s*published-guides/);
  assert.match(docsWorkflow, /GH_TOKEN/);
  assert.match(guidesWorkflow, /GH_TOKEN/);
  assert.match(docsWorkflow, /configure-pages-deployment\.ts --surface docs/);
  assert.match(
    guidesWorkflow,
    /configure-pages-deployment\.ts --surface guides/,
  );
  // Publishing builds the artifact only; a browser test unrelated to the
  // artifact must not be able to block a docs or guides release.
  for (const workflow of branchWorkflows) {
    assert.doesNotMatch(workflow, /npx playwright install chromium/);
    assert.doesNotMatch(workflow, /run: npm run check/);
  }
  assert.match(docsWorkflow, /MICRONAUT_DOCS_CUSTOM_DOMAIN/);
  assert.match(docsWorkflow, /Ensure docs Pages custom domain/);
  assert.match(docsWorkflow, /gh api --method PUT .*pages/);
  assert.match(guidesWorkflow, /MICRONAUT_GUIDES_CUSTOM_DOMAIN/);
  assert.match(docsWorkflow, /--base "\$ASTRO_BASE"/);
  assert.doesNotMatch(docsWorkflow, /ASTRO_BASE:\s*\/micronaut-docs-v2\//);
  assert.doesNotMatch(guidesWorkflow, /ASTRO_BASE:\s*\/micronaut-guides-v2\//);
});

test("published docs republish workflow refreshes latest after older versions", async () => {
  const [republishWorkflow, docsWorkflow] = await Promise.all(
    ["republish-published-docs.yml", "deploy-docs.yml"].map(async (workflow) =>
      fs.readFile(
        path.join(projectDirectory, ".github", "workflows", workflow),
        "utf8",
      ),
    ),
  );

  assert.doesNotMatch(republishWorkflow, /schedule:/);
  assert.match(republishWorkflow, /workflow_dispatch:/);
  assert.match(republishWorkflow, /actions:\s*write/);
  assert.match(
    republishWorkflow,
    /repository:\s*micronaut-projects\/micronaut-docs-v2/,
  );
  assert.match(republishWorkflow, /path:\s*published-docs/);
  // versions.json lists one release per published line folder, and the site's
  // version selector is rendered from it. Exact-version directories on the
  // branch are imported javadoc, so a directory scan would republish versions
  // the site never links to.
  assert.match(
    republishWorkflow,
    /jq -r '\.versions\[\]\.release \/\/ empty' published-docs\/versions\.json/,
  );
  assert.doesNotMatch(republishWorkflow, /find published-docs/);
  assert.match(republishWorkflow, /sort -V/);
  assert.match(republishWorkflow, /gh workflow run deploy-docs\.yml/);
  assert.match(republishWorkflow, /--field "docs_version=\$version"/);
  assert.match(republishWorkflow, /gh run watch .*--exit-status/);
  // /latest follows the newest published version, so republishing an older one
  // must not be able to ask for it.
  assert.doesNotMatch(docsWorkflow, /publish_latest:/);
});

test("local surface build defaults match the transferred repositories", async () => {
  const buildSurface = await fs.readFile(
    path.join(projectDirectory, "scripts", "build-surface.ts"),
    "utf8",
  );

  assert.match(buildSurface, /`micronaut-\$\{surface\}-v2`/);
  assert.doesNotMatch(buildSurface, /`micronaut-\$\{surface\}`/);
});

test("published surface artifacts stay out of local typecheck inputs", async () => {
  const tsconfig = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "tsconfig.json"), "utf8"),
  ) as { exclude?: string[] };
  const gitignore = await fs.readFile(
    path.join(projectDirectory, ".gitignore"),
    "utf8",
  );

  for (const directory of ["published-docs", "published-guides"]) {
    assert.ok(
      tsconfig.exclude?.includes(directory),
      `tsconfig.json should exclude ${directory}`,
    );
    assert.match(gitignore, new RegExp(`^${directory}/$`, "m"));
  }
});

test("PostCSS disables Tailwind production optimization reparsing", async () => {
  const configModule = await import(
    `${pathToFileURL(path.join(projectDirectory, "postcss.config.mjs")).href}?test=postcss`
  );

  assert.equal(
    configModule.default.plugins["@tailwindcss/postcss"].optimize,
    false,
  );
});

test("npm dependencies do not rely on latest dist-tags", async () => {
  const manifest = JSON.parse(
    await fs.readFile(path.join(projectDirectory, "package.json"), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  for (const [section, dependencies] of Object.entries({
    dependencies: manifest.dependencies ?? {},
    devDependencies: manifest.devDependencies ?? {},
  })) {
    for (const [name, version] of Object.entries(dependencies)) {
      assert.notEqual(version, "latest", `${section}.${name}`);
    }
  }
});

test("external source checkouts stay inside the GitHub workspace", async () => {
  const docsWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-docs.yml"),
    "utf8",
  );
  const guidesWorkflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-guides.yml"),
    "utf8",
  );

  assert.match(
    docsWorkflow,
    /target="external\/docs\/repos\/micronaut-platform"/,
  );
  assert.match(
    docsWorkflow,
    /DOCS_DIR:\s*\$\{\{ github\.workspace \}\}\/external\/docs/,
  );
  assert.match(guidesWorkflow, /path:\s*external\/micronaut-guides/);
  assert.match(
    guidesWorkflow,
    /MICRONAUT_GUIDES_DIR:\s*\$\{\{ github\.workspace \}\}\/external\/micronaut-guides/,
  );
  assert.doesNotMatch(docsWorkflow, /runner\.temp/);
  assert.doesNotMatch(guidesWorkflow, /runner\.temp/);
});

test("guides publish builds the sample projects its snippets and downloads come from", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-guides.yml"),
    "utf8",
  );

  assert.match(workflow, /uses:\s*actions\/setup-java/);
  // The generation tasks do not declare the Java version as an input, so a
  // cached entry from one Java version is a valid hit under another.
  assert.match(workflow, /gradlew --no-build-cache [^\n]*generateCodeZip/);
  // A guide page links its own archive, and the build writes a redirect stub
  // in its place; publishing the stubs points every download at this site.
  assert.match(
    workflow,
    /cp external\/micronaut-guides\/build\/dist\/\*\.zip dist\//,
  );
});

test("validation runs fixture-based docs and guides tests without external checkouts", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "validate-build.yml"),
    "utf8",
  );

  assert.match(workflow, /run:\s*npm run build:docs/);
  assert.match(workflow, /run:\s*npm run build:guides/);
  assert.match(workflow, /MICRONAUT_DEPLOY_SURFACE:\s*docs/);
  assert.match(workflow, /MICRONAUT_DEPLOY_SURFACE:\s*guides/);
  assert.match(workflow, /MICRONAUT_PREPARE_GENERATED_CONTENT:\s*"false"/);
  assert.match(workflow, /PLAYWRIGHT_STATIC_PREVIEW:\s*"true"/);
  assert.doesNotMatch(
    workflow,
    /repository:\s*micronaut-projects\/micronaut-(?:platform|docs|guides)/,
    "Validation must rely on checked-in generated-content fixtures.",
  );
});

test("docs workflow resolves platform refs as branches or tags", async () => {
  const workflow = await fs.readFile(
    path.join(projectDirectory, ".github", "workflows", "deploy-docs.yml"),
    "utf8",
  );

  assert.match(workflow, /platform-released/);
  assert.match(
    workflow,
    /DOCS_VERSION:\s*\$\{\{ github\.event\.client_payload\.version \|\| inputs\.docs_version \}\}/,
  );
  assert.match(
    workflow,
    /PLATFORM_REF:\s*\$\{\{ github\.event\.client_payload\.sha \}\}/,
  );
  // Docs are published per release line, so nothing has to purge the patch
  // folders a release supersedes.
  assert.match(workflow, /docsVersionLine/);
  assert.match(workflow, /supersedingDocsLineRelease/);
  assert.match(
    workflow,
    /MICRONAUT_DOCS_ROOT:\s*\/\$\{\{ steps\.release\.outputs\.docs_line \}\}/,
  );
  assert.doesNotMatch(workflow, /purge-docs-patch-versions/);
  assert.match(workflow, /effective_ref="\$\{PLATFORM_REF:-\$DOCS_VERSION\}"/);
  assert.match(
    workflow,
    /ls-remote --exit-code --heads origin "\$effective_ref"/,
  );
  assert.match(
    workflow,
    /refs\/heads\/\$\{effective_ref\}:refs\/remotes\/origin\/\$\{effective_ref\}/,
  );
  assert.match(
    workflow,
    /ls-remote --exit-code --tags origin "\$resolved_tag"/,
  );
  assert.match(workflow, /resolved_tag="v\$effective_ref"/);
  assert.match(
    workflow,
    /refs\/tags\/\$\{resolved_tag\}:refs\/tags\/\$\{resolved_tag\}/,
  );
  assert.match(
    workflow,
    /git -C "\$target" fetch --depth=1 origin "\$effective_ref"/,
  );
  assert.match(
    workflow,
    /Could not resolve \$PLATFORM_REPOSITORY ref '\$effective_ref'/,
  );
  assert.doesNotMatch(workflow, /default:\s*main/);
  assert.doesNotMatch(workflow, /ref:\s*\$\{\{ inputs\.platform_ref \}\}/);
});

test("publishing a patch replaces the whole line it belongs to", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  await writeFiles(dist, ["5.0.x/index.html", "5.0.x/core/index.html"]);
  await writeFiles(published, [
    "5.0.0/index.html",
    "5.0.0.html",
    "5.0.1/core/index.html",
    "5.1.0/index.html",
    "4.9.9/index.html",
  ]);

  await publishDocsSurface({
    distDirectory: dist,
    publishedDirectory: published,
    version: "5.0.1",
    base: "/micronaut-docs-v2/",
    latest: false,
  });

  await fs.access(path.join(published, "5.0.x", "core", "index.html"));
  // The exact-version folders the line replaces stay reachable as redirects
  // rather than 404ing the links that already point at them.
  for (const superseded of [
    "5.0.0/index.html",
    "5.0.0.html",
    "5.0.1/index.html",
  ]) {
    assert.match(
      await fs.readFile(path.join(published, superseded), "utf8"),
      /\/micronaut-docs-v2\/5\.0\.x\//,
      superseded,
    );
  }
  assert.equal(
    await exists(path.join(published, "5.0.1", "core", "index.html")),
    false,
  );
  // Lines the release does not belong to are left alone.
  await fs.access(path.join(published, "5.1.0", "index.html"));
  await fs.access(path.join(published, "4.9.9", "index.html"));

  const versions = JSON.parse(
    await fs.readFile(path.join(published, "versions.json"), "utf8"),
  ) as { versions: Array<{ label: string; release?: string }> };
  assert.deepEqual(
    versions.versions.map((version) => version.label),
    ["Latest (5.1.0)", "5.0.1", "4.9.9"],
  );
  // The selector names the release, but the entry still links to the line and
  // carries the release the publish guard and republish workflow read.
  assert.deepEqual(
    versions.versions.find((version) => version.label === "5.0.1"),
    { label: "5.0.1", href: "/5.0.x/", release: "5.0.1" },
  );
});

test("publishing an older patch over a newer line is refused", async (t) => {
  const published = await temporaryDirectory(t);
  await writeTextFile(
    published,
    "versions.json",
    JSON.stringify({
      versions: [
        { label: "Latest (5.0.x)", href: "/latest/", release: "5.0.3" },
      ],
    }),
  );

  // A replayed or re-dispatched release event for an older tag must not
  // overwrite the line with docs that are older than what it already serves.
  assert.equal(
    await supersedingDocsLineRelease({
      publishedDirectory: published,
      version: "5.0.1",
    }),
    "5.0.3",
  );
  assert.equal(
    await supersedingDocsLineRelease({
      publishedDirectory: published,
      version: "5.0.3",
    }),
    undefined,
  );
  assert.equal(
    await supersedingDocsLineRelease({
      publishedDirectory: published,
      version: "5.0.4",
    }),
    undefined,
  );
  assert.equal(
    await isNewestPublishedDocsVersion({
      publishedDirectory: published,
      version: "5.0.4",
    }),
    true,
  );
});

test("/latest redirects to the published line instead of copying it", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  const base = "/micronaut-docs-v2/";

  await writeFiles(dist, ["_astro/app.css"]);
  await fs.mkdir(path.join(dist, "5.1.x", "core"), { recursive: true });
  await writeTextFile(
    dist,
    "5.1.x/index.html",
    '<a href="/micronaut-docs-v2/5.1.x/core/">Core</a>',
  );
  await writeTextFile(
    dist,
    "5.1.x/core/index.html",
    '<a href="/micronaut-docs-v2/5.1.x/">Index</a>',
  );
  await writeTextFile(
    dist,
    "5.1.x/guide/index.html",
    clientRedirectDocument(
      "/micronaut-docs-v2/5.1.x/core/",
      "Micronaut Core docs",
    ),
  );

  await publishDocsSurface({
    distDirectory: dist,
    publishedDirectory: published,
    version: "5.1.1",
    base,
    latest: true,
  });

  // A reader who opens /latest ends up on the versioned URL, so what they
  // bookmark and share names the line the docs actually came from.
  for (const [stub, destination] of [
    ["latest/index.html", "/micronaut-docs-v2/5.1.x/"],
    ["latest/core/index.html", "/micronaut-docs-v2/5.1.x/core/"],
    ["latest.html", "/micronaut-docs-v2/5.1.x/"],
    ["5.1.x.html", "/micronaut-docs-v2/5.1.x/"],
  ] as const) {
    const html = await fs.readFile(path.join(published, stub), "utf8");
    assert.match(
      html,
      new RegExp(`location\\.replace\\("${escapeRegExp(destination)}"`),
      stub,
    );
  }

  // A page in the line that is itself a redirect hands /latest its own
  // destination, so the historical Core alias stays one hop from the docs.
  assert.match(
    await fs.readFile(
      path.join(published, "latest", "guide", "index.html"),
      "utf8",
    ),
    /location\.replace\("\/micronaut-docs-v2\/5\.1\.x\/core\/"/,
  );

  // Nothing under /latest is a copy of the docs.
  assert.doesNotMatch(
    await fs.readFile(path.join(published, "latest", "index.html"), "utf8"),
    /href="\/micronaut-docs-v2\/5\.1\.x\/core\/">Core</,
  );
  const lineIndex = await fs.readFile(
    path.join(published, "5.1.x", "index.html"),
    "utf8",
  );
  assert.match(lineIndex, /href="\/micronaut-docs-v2\/5\.1\.x\/core\/"/);
});

test("/snapshot enters the snapshot Pages site instead of copying it", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);

  await writeTextFile(dist, "snapshot/index.html", "<p>Snapshot docs</p>");
  await writeTextFile(dist, "snapshot/core/index.html", "<p>Core snapshot</p>");
  await writeTextFile(
    dist,
    "snapshot/guide/index.html",
    clientRedirectDocument(
      "/micronaut-docs-snapshot/snapshot/core/",
      "Micronaut Core docs",
    ),
  );
  await writeTextFile(published, "snapshot/retired/index.html", "<p>Gone</p>");

  await publishDocsSnapshotRedirects({
    distDirectory: dist,
    publishedDirectory: published,
    snapshotSiteUrl:
      "https://micronaut-projects.github.io/micronaut-docs-snapshot/",
  });

  // A GitHub Pages host serves one repository, so the released docs branch
  // reaches the snapshot deployment through stubs, page for page.
  for (const [stub, destination] of [
    [
      "snapshot/index.html",
      "https://micronaut-projects.github.io/micronaut-docs-snapshot/snapshot/",
    ],
    [
      "snapshot/core/index.html",
      "https://micronaut-projects.github.io/micronaut-docs-snapshot/snapshot/core/",
    ],
    // A page that redirects inside the snapshot tree resolves its own
    // destination against the snapshot deployment base, which does not exist
    // on the released docs host, so the stub names the page itself and lets
    // the snapshot site take the second hop.
    [
      "snapshot/guide/index.html",
      "https://micronaut-projects.github.io/micronaut-docs-snapshot/snapshot/guide/",
    ],
  ] as const) {
    const html = await fs.readFile(path.join(published, stub), "utf8");
    assert.match(
      html,
      new RegExp(`location\\.replace\\("${escapeRegExp(destination)}"`),
      stub,
    );
  }

  // Nothing under /snapshot is a copy of the docs, and a page the snapshot no
  // longer builds does not survive in the mirror.
  assert.doesNotMatch(
    await fs.readFile(path.join(published, "snapshot", "index.html"), "utf8"),
    /Snapshot docs/,
  );
  assert.equal(
    await exists(path.join(published, "snapshot", "retired", "index.html")),
    false,
  );
});

test("snapshot docs are force-pushed to their own repository and entered from the docs branch", async () => {
  const [snapshotWorkflow, pollWorkflow] = await Promise.all(
    ["deploy-docs-snapshot.yml", "publish-upstream-updates.yml"].map(
      async (workflow) =>
        fs.readFile(
          path.join(projectDirectory, ".github", "workflows", workflow),
          "utf8",
        ),
    ),
  );

  assert.match(
    snapshotWorkflow,
    /TARGET_REPOSITORY:\s*micronaut-projects\/micronaut-docs-snapshot/,
  );
  assert.match(snapshotWorkflow, /MICRONAUT_DOCS_ROOT:\s*\/snapshot/);
  // Every project is rendered from its own default branch, so the snapshot
  // documents the unreleased modules rather than the releases the platform
  // catalog pins.
  assert.match(snapshotWorkflow, /DOCS_SNAPSHOT_SOURCES:\s*"true"/);
  // The snapshot is rebuilt whenever the platform default branch moves, so its
  // branch is replaced by one orphan commit instead of growing a docs tree per
  // upstream merge.
  assert.match(snapshotWorkflow, /git push --force/);
  // Both this publish and Deploy Docs push the released docs branch, where the
  // /snapshot entry lives.
  assert.match(snapshotWorkflow, /group:\s*docs-pages/);
  assert.match(snapshotWorkflow, /publish-docs-snapshot\.ts/);
  assert.match(
    snapshotWorkflow,
    /git push origin HEAD:\$\{\{ env\.DOCS_BRANCH \}\}/,
  );
  // The poller publishes only when the built revision recorded by the last
  // snapshot publish is behind the platform default branch.
  assert.match(pollWorkflow, /\.platform-revision/);
  assert.match(pollWorkflow, /gh workflow run deploy-docs-snapshot\.yml/);
});

test("docs version manifest is rebuilt from the published docs branch", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, [
    "4.9.x/index.html",
    "4.8.4.html",
    "assets/stylesheets/site.css",
    "docsassets/css/main.css",
  ]);

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    version: "4.10.14",
  });

  assert.deepEqual(versions.slice(0, 3), [
    {
      label: "Latest (4.10.14)",
      href: "/latest/",
      release: "4.10.14",
      current: true,
    },
    // A line published before the manifest recorded its release falls back to
    // naming itself.
    { label: "4.9.x", href: "/4.9.x/" },
    { label: "4.8.4", href: "/4.8.4.html" },
  ]);
  assert.match(await fs.readFile(manifest, "utf8"), /"Latest \(4\.10\.14\)"/);
});

test("docs version manifest skips version directories without published docs", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  // The docs branch also carries imported javadoc under `<version>/api`. Those
  // directories are not docs builds, and their roots are 404s, so offering them
  // in the version selector sent readers nowhere.
  await writeFiles(published, [
    "4.9.x/index.html",
    "4.8.x/api/index.html",
    "3.10.10/api/index.html",
  ]);

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    version: "4.10.14",
  });

  assert.deepEqual(versions, [
    {
      label: "Latest (4.10.14)",
      href: "/latest/",
      release: "4.10.14",
      current: true,
    },
    { label: "4.9.x", href: "/4.9.x/" },
  ]);
});

test("docs version manifest preserves the latest release for non-latest publishes", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, ["4.10.x/index.html", "4.9.x/index.html"]);
  await writeTextFile(
    published,
    "versions.json",
    JSON.stringify({
      versions: [
        {
          label: "Latest (4.10.x)",
          href: "/latest/",
          release: "4.10.14",
          current: true,
        },
      ],
    }),
  );

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    version: "4.9.5",
    latest: false,
  });

  assert.deepEqual(versions, [
    { label: "Latest (4.10.14)", href: "/latest/", release: "4.10.14" },
    { label: "4.9.5", href: "/4.9.x/", release: "4.9.5" },
  ]);
});

test("docs version manifest sorts final releases before prereleases", async (t) => {
  const published = await temporaryDirectory(t);
  const manifest = path.join(await temporaryDirectory(t), "docs-versions.json");
  await writeFiles(published, [
    "5.0.0-rc1/index.html",
    "4.10.14/index.html",
    "5.0.0/index.html",
  ]);

  const versions = await updateDocsVersionManifest({
    manifestFile: manifest,
    publishedDirectory: published,
    latest: false,
  });

  // Versions published before docs moved to release lines keep their exact
  // folders until the line that replaces them is republished.
  assert.deepEqual(
    versions.map((version) => version.label),
    ["Latest (5.0.0)", "5.0.0-rc1", "4.10.14"],
  );
});

test("docs publish merge preserves shared assets and updates version roots", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  await writeFiles(dist, [
    "_astro/app.js",
    "assets/core/diagram.1111111111111111.svg",
    "index.html",
    "robots.txt",
    "sitemap-index.xml",
    "sitemap-0.xml",
    "4.10.x/index.html",
    "4.10.x/core/index.html",
    "micronaut-assets/icons/brands/apachekafka.svg",
    "micronaut-assets/icons/projects/reactor.webp",
  ]);
  await writeFiles(published, [
    "assets/aaaaaaaaaaaaaaaa/unused.png",
    "assets/bbbbbbbbbbbbbbbb/old.png",
    "assets/core/unused.aaaaaaaaaaaaaaaa.png",
    "assets/core/old.bbbbbbbbbbbbbbbb.png",
    "assets/stylesheets/site.css",
    "docsassets/css/main.css",
    "4.9.x/core/index.html",
    "4.9.x/index.html",
  ]);
  await writeTextFile(
    dist,
    "4.10.x/core/index.html",
    '<img src="../../assets/core/diagram.1111111111111111.svg">',
  );
  await writeTextFile(
    published,
    "4.9.x/core/index.html",
    [
      '<img src="../../assets/bbbbbbbbbbbbbbbb/old.png">',
      '<img src="/assets/core/old.bbbbbbbbbbbbbbbb.png">',
    ].join("\n"),
  );

  await publishDocsSurface({
    distDirectory: dist,
    publishedDirectory: published,
    version: "4.10.14",
    base: "/micronaut-docs/",
  });

  assert.equal(await exists(path.join(published, "robots.txt")), true);
  assert.equal(await exists(path.join(published, "sitemap-index.xml")), true);
  // Published pages reference icons from the surface root, so the merge has to
  // carry them like `_astro`; leaving them out 404s every project icon.
  assert.equal(
    await exists(
      path.join(
        published,
        "micronaut-assets",
        "icons",
        "brands",
        "apachekafka.svg",
      ),
    ),
    true,
  );
  assert.equal(
    await exists(
      path.join(
        published,
        "micronaut-assets",
        "icons",
        "projects",
        "reactor.webp",
      ),
    ),
    true,
  );
  assert.equal(await exists(path.join(published, "sitemap-0.xml")), true);
  assert.equal(
    await exists(path.join(published, "assets", "stylesheets", "site.css")),
    true,
  );
  assert.equal(
    await exists(path.join(published, "docsassets", "css", "main.css")),
    true,
  );
  assert.equal(await exists(path.join(published, ".nojekyll")), true);
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "diagram.1111111111111111.svg"),
    ),
    true,
  );
  assert.equal(
    await exists(path.join(published, "assets", "bbbbbbbbbbbbbbbb", "old.png")),
    true,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "old.bbbbbbbbbbbbbbbb.png"),
    ),
    true,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "aaaaaaaaaaaaaaaa", "unused.png"),
    ),
    false,
  );
  assert.equal(
    await exists(
      path.join(published, "assets", "core", "unused.aaaaaaaaaaaaaaaa.png"),
    ),
    false,
  );
  assert.equal(
    await exists(path.join(published, "4.10.x", "core", "index.html")),
    true,
  );
  assert.match(
    await fs.readFile(
      path.join(published, "latest", "core", "index.html"),
      "utf8",
    ),
    /location\.replace\("\/micronaut-docs\/4\.10\.x\/core\/"/,
  );
  assert.match(
    await fs.readFile(path.join(published, "4.10.x.html"), "utf8"),
    /location\.replace\("\/micronaut-docs\/4\.10\.x\/"/,
  );
  const versionsJson = JSON.parse(
    await fs.readFile(path.join(published, "versions.json"), "utf8"),
  );
  assert.deepEqual(versionsJson.versions.slice(0, 2), [
    {
      label: "Latest (4.10.14)",
      href: "/latest/",
      release: "4.10.14",
      current: true,
    },
    { label: "4.9.x", href: "/4.9.x/" },
  ]);
});

test("docs publish migrates retained versions to a custom domain", async (t) => {
  const dist = await temporaryDirectory(t);
  const published = await temporaryDirectory(t);
  await writeFiles(dist, [
    "_astro/new.js",
    "5.0.x/index.html",
    "5.0.x/core/index.html",
  ]);
  await writeTextFile(dist, "CNAME", "docs.micronaut.io\n");
  await writeTextFile(
    dist,
    "5.0.x/core/index.html",
    '<script src="/_astro/new.js"></script>',
  );
  await writeFiles(published, [
    "_astro/old.js",
    "_astro/unused.js",
    "4.10.x/index.html",
    "4.10.x/core/index.html",
  ]);
  await writeTextFile(
    published,
    "4.10.x/core/index.html",
    [
      '<script src="/micronaut-docs-v2/_astro/old.js"></script>',
      '<script src="https://micronaut-projects.github.io/micronaut-web/shell/site-header.js"></script>',
      '<a href="https://micronaut-projects.github.io/micronaut-guides-v2/latest/">Guides</a>',
    ].join("\n"),
  );

  await publishDocsSurface({
    distDirectory: dist,
    publishedDirectory: published,
    version: "5.0.0",
    base: "/",
    surfaceUrls: {
      mainSiteUrl: "https://micronaut.io/",
      docsSiteUrl: "https://docs.micronaut.io/",
      guidesSiteUrl: "https://guides.micronaut.io/",
    },
  });

  const retainedHtml = await fs.readFile(
    path.join(published, "4.10.x", "core", "index.html"),
    "utf8",
  );
  assert.match(retainedHtml, /src="\/_astro\/old\.js"/);
  assert.match(retainedHtml, /https:\/\/micronaut\.io\/shell\/site-header\.js/);
  assert.match(retainedHtml, /https:\/\/guides\.micronaut\.io\/latest\//);
  assert.doesNotMatch(retainedHtml, /micronaut-projects\.github\.io/);
  assert.equal(
    await fs.readFile(path.join(published, "CNAME"), "utf8"),
    "docs.micronaut.io\n",
  );
  assert.equal(await exists(path.join(published, "_astro", "old.js")), true);
  assert.equal(await exists(path.join(published, "_astro", "new.js")), true);
  assert.equal(
    await exists(path.join(published, "_astro", "unused.js")),
    false,
  );
  const deploymentMetadata = JSON.parse(
    await fs.readFile(
      path.join(published, ".micronaut-deployment.json"),
      "utf8",
    ),
  );
  assert.equal(deploymentMetadata.base, "/");
  assert.equal(deploymentMetadata.docsSiteUrl, "https://docs.micronaut.io/");
});

async function importDeploymentConfig(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../../../src/lib/deployment-config.ts")> {
  return importWithEnv(deploymentConfigFile, scenario, env);
}

async function importSurfaceRoutes(
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<typeof import("../../../src/lib/surface-routes.ts")> {
  return importWithEnv(surfaceRoutesFile, scenario, env);
}

async function importWithEnv<T>(
  file: string,
  scenario: string,
  env: Record<string, string | undefined>,
): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const [name, value] of Object.entries(env)) {
    previous.set(name, process.env[name]);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
  try {
    return (await import(
      `${pathToFileURL(file).href}?scenario=${scenario}-${Date.now()}`
    )) as T;
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

async function fakeDist(t: TestContext) {
  const dist = await temporaryDirectory(t);
  const files = [
    "_astro/app.js",
    "_astro/app.css",
    "_astro/chunk.js",
    "_astro/fonts/code.woff2",
    "_astro/generated-code.css",
    "_astro/snippet-runtime.js",
    "_astro/unused.css",
    "_astro/unused.js",
    "index.html",
    "versions.json",
    "docs/index.html",
    "docs/core/index.html",
    "docs/assets/core/docs/img/diagram.svg",
    "docs/search-index.json",
    "guides/index.html",
    "guides/micronaut-http-client/index.html",
    "guides/assets/micronaut-http-client/images/client.png",
    "latest/index.html",
    "latest/guide/index.html",
    "latest/micronaut-http-client/index.html",
    "latest/assets/micronaut-http-client/images/client.png",
    "micronaut-assets/logo.svg",
    "micronaut-assets/icons/projects/reactor.webp",
    "shell/site-header.js",
    "shell/site-header.css",
    "micronaut-web/templates/docs/docs-page.html",
    "robots.txt",
    "sitemap-index.xml",
    "sitemap-0.xml",
  ];
  await writeFiles(dist, files);
  await writeTextFile(
    dist,
    "_astro/app.js",
    'import "./chunk.js";\nconsole.log("app");',
  );
  await writeTextFile(
    dist,
    "_astro/app.css",
    '@font-face { font-family: "Code"; src: url("./fonts/code.woff2"); }',
  );
  await writeTextFile(
    dist,
    "_astro/generated-code.css",
    ".generated-docs-content .shiki { color: red; }",
  );
  await writeTextFile(
    dist,
    "_astro/snippet-runtime.js",
    "globalThis.docsSnippetRuntimeLoaded = true;",
  );
  await writeTextFile(
    dist,
    "index.html",
    '<link rel="stylesheet" href="/_astro/app.css"><script type="module" src="/_astro/app.js"></script>',
  );
  await writeTextFile(
    dist,
    "docs/index.html",
    '<link rel="stylesheet" href="/micronaut-docs/_astro/app.css"><script type="module" src="/micronaut-docs/_astro/app.js"></script>docs/index.html',
  );
  await writeTextFile(
    dist,
    "guides/index.html",
    '<link rel="stylesheet" href="/micronaut-guides/_astro/app.css"><script type="module" src="/micronaut-guides/_astro/app.js"></script>',
  );
  await writeTextFile(
    dist,
    "docs/core/index.html",
    [
      '<link rel="stylesheet" href="/micronaut-docs/_astro/generated-code.css">',
      '<script type="module" src="/micronaut-docs/_astro/snippet-runtime.js"></script>',
      '<img src="../assets/core/docs/img/diagram.svg?cache=1#diagram">',
    ].join("\n"),
  );
  await writeTextFile(
    dist,
    "guides/micronaut-http-client/index.html",
    [
      '<link rel="stylesheet" href="/micronaut-guides/_astro/generated-code.css">',
      '<script type="module" src="/micronaut-guides/_astro/snippet-runtime.js"></script>',
      '<img src="../assets/micronaut-http-client/images/client.png">',
    ].join("\n"),
  );
  return dist;
}

async function temporaryDirectory(t: TestContext) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-surface-test-"),
  );
  t.after(() => fs.rm(directory, { force: true, recursive: true }));
  return directory;
}

async function writeFiles(directory: string, files: string[]) {
  await Promise.all(
    files.map(async (file) => {
      const target = path.join(directory, file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file, "utf8");
    }),
  );
}

async function writeTextFile(directory: string, file: string, content: string) {
  const target = path.join(directory, file);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, content, "utf8");
}

async function singleProjectHashedAssetFile(
  directory: string,
  project: string,
  name: string,
  extension: string,
) {
  const entries = await fs.readdir(path.join(directory, "assets", project), {
    withFileTypes: true,
  });
  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        new RegExp(`^${name}\\.[a-f0-9]{16}\\.${extension}$`).test(entry.name),
    )
    .map((entry) => entry.name);
  assert.equal(files.length, 1);
  return files[0];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoDocsVersionSwitcherIsland(html: string) {
  assert.doesNotMatch(
    html,
    /<astro-island\b[^>]*(?:DocsVersionSwitcher|docs-version-switcher)/i,
  );
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
