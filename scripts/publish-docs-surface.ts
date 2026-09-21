import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, stringArg } from "./shared/cli.ts";
import { copyCrawlerFiles } from "./shared/crawler-files.ts";
import { pruneUnreferencedAstroAssets } from "./prune-surface.ts";
import {
  mergeSharedSurfaceAssets,
  pruneUnusedHashedSurfaceAssets,
} from "./shared/surface-assets.ts";
import {
  buildDocsVersionOptions,
  docsVersionLine,
  isDocsVersionLine,
} from "./update-docs-version-manifest.ts";
import {
  resolveDeploymentSettings,
  type DeploymentSettings,
} from "../src/lib/deployment-defaults.ts";
import { clientRedirectDocument } from "../src/lib/route-compatibility.ts";

type SurfaceUrls = Pick<
  DeploymentSettings,
  "mainSiteUrl" | "docsSiteUrl" | "guidesSiteUrl"
>;

type PublishedDeploymentMetadata = SurfaceUrls & {
  base: string;
};

const deploymentMetadataFile = ".micronaut-deployment.json";
const legacyDeployment: PublishedDeploymentMetadata = {
  base: "/micronaut-docs-v2/",
  mainSiteUrl: "https://micronaut-projects.github.io/micronaut-web/",
  docsSiteUrl: "https://micronaut-projects.github.io/micronaut-docs-v2/",
  guidesSiteUrl: "https://micronaut-projects.github.io/micronaut-guides-v2/",
};

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  const deployment = resolveDeploymentSettings({
    ...process.env,
    MICRONAUT_DEPLOY_SURFACE: "docs",
  });
  await publishDocsSurface({
    distDirectory:
      stringArg(options.dist) || path.join(projectDirectory, "dist"),
    publishedDirectory:
      stringArg(options.publishedDir) || process.env.PUBLISHED_DOCS_DIR,
    version: stringArg(options.version) || process.env.MICRONAUT_DOCS_VERSION,
    base:
      stringArg(options.base) ||
      process.env.ASTRO_BASE ||
      "/micronaut-docs-v2/",
    latest: stringArg(options.latest) !== "false",
    surfaceUrls: deployment,
  });
}

export async function publishDocsSurface({
  distDirectory,
  publishedDirectory,
  version,
  base = "/micronaut-docs-v2/",
  latest = true,
  surfaceUrls,
}: {
  distDirectory: string;
  publishedDirectory?: string;
  version?: string;
  base?: string;
  latest?: boolean;
  surfaceUrls?: SurfaceUrls;
}): Promise<void> {
  if (!publishedDirectory) {
    throw new Error("Expected --published-dir or PUBLISHED_DOCS_DIR.");
  }
  const publishVersion = sanitizeVersion(version);
  const publishLine = docsVersionLine(publishVersion);
  await fs.mkdir(publishedDirectory, { recursive: true });
  const previousDeployment = await readDeploymentMetadata(publishedDirectory);
  const resolvedSurfaceUrls =
    surfaceUrls ||
    resolveDeploymentSettings({
      MICRONAUT_DEPLOY_SURFACE: "docs",
    });
  const currentDeployment: PublishedDeploymentMetadata = {
    base: normalizeBase(base),
    mainSiteUrl: resolvedSurfaceUrls.mainSiteUrl,
    docsSiteUrl: resolvedSurfaceUrls.docsSiteUrl,
    guidesSiteUrl: resolvedSurfaceUrls.guidesSiteUrl,
  };

  await copyIfExists(
    path.join(distDirectory, "_astro"),
    path.join(publishedDirectory, "_astro"),
  );
  await mergeSharedSurfaceAssets({
    sourceDirectory: distDirectory,
    targetDirectory: publishedDirectory,
  });
  // Every published version references these from the surface root, so they
  // have to be merged like `_astro` rather than left inside a version folder.
  // `prune-surface.ts` puts them in the artifact; without this step they never
  // reach the published tree and every docs page 404s its project icons.
  await copyIfExists(
    path.join(distDirectory, "micronaut-assets", "icons"),
    path.join(publishedDirectory, "micronaut-assets", "icons"),
  );
  await copyIfExists(
    path.join(distDirectory, "index.html"),
    path.join(publishedDirectory, "index.html"),
  );
  await copyIfExists(
    path.join(distDirectory, "404.html"),
    path.join(publishedDirectory, "404.html"),
  );
  await copyIfExists(
    path.join(distDirectory, "CNAME"),
    path.join(publishedDirectory, "CNAME"),
  );
  await copyCrawlerFiles(distDirectory, publishedDirectory);
  await writeNoJekyll(publishedDirectory);

  const lineDirectory = path.join(publishedDirectory, publishLine);
  await replaceIfExists(
    await docsRootSource(distDirectory, publishLine),
    lineDirectory,
  );
  await writeRedirect(
    path.join(publishedDirectory, `${publishLine}.html`),
    withBase(base, `/${publishLine}/`),
    `Micronaut ${publishLine} docs`,
  );
  await redirectSupersededVersions(publishedDirectory, publishLine, base);

  if (latest) {
    await writeLatestRedirects(publishedDirectory, publishLine, base);
    await writeRedirect(
      path.join(publishedDirectory, "latest.html"),
      withBase(base, `/${publishLine}/`),
      "Micronaut latest docs",
    );
  }

  await writeVersionsJson(publishedDirectory, publishVersion, latest);
  await migratePublishedDeployment(
    publishedDirectory,
    previousDeployment || legacyDeployment,
    currentDeployment,
  );
  await writeDeploymentMetadata(publishedDirectory, currentDeployment);
  await pruneUnusedHashedSurfaceAssets(publishedDirectory);
  await pruneUnreferencedAstroAssets(publishedDirectory);
}

async function docsRootSource(distDirectory: string, line: string) {
  const lineDirectory = path.join(distDirectory, line);
  if (await exists(lineDirectory)) {
    return lineDirectory;
  }
  // A local `npm run build:docs` roots the artifact at /latest instead of the
  // line, so the fixture builds the deployment tests publish still resolve.
  const latestDirectory = path.join(distDirectory, "latest");
  if (await exists(latestDirectory)) {
    return latestDirectory;
  }
  throw new Error(
    `Expected docs artifact to contain ${lineDirectory} or ${latestDirectory}.`,
  );
}

async function writeVersionsJson(
  directory: string,
  version: string,
  latest: boolean,
) {
  const payload = {
    versions: await buildDocsVersionOptions({
      publishedDirectory: directory,
      version,
      latest,
    }),
  };
  await fs.writeFile(
    path.join(directory, "versions.json"),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

/**
 * `/latest` is never a copy of the docs: a reader who lands there is moved onto
 * the current line, so the URL they bookmark, share, and see in search results
 * is the versioned one. Mirroring the line's pages as redirect stubs keeps every
 * historical `/latest/<page>/` link working instead of only `/latest/` itself.
 */
async function writeLatestRedirects(
  publishedDirectory: string,
  line: string,
  base: string,
) {
  await writeRedirectMirror({
    sourceDirectory: path.join(publishedDirectory, line),
    targetDirectory: path.join(publishedDirectory, "latest"),
    title: "the current Micronaut docs",
    destination: (page, html) =>
      redirectDestination(html) ||
      withBase(base, `/${line}/${pageDirectory(page)}`),
  });
}

/**
 * Rebuilds `targetDirectory` as one redirect stub per page of
 * `sourceDirectory`, so a docs tree can be entered under a second URL without
 * being copied under it.
 */
export async function writeRedirectMirror({
  sourceDirectory,
  targetDirectory,
  title,
  destination,
}: {
  sourceDirectory: string;
  targetDirectory: string;
  title: string;
  destination: (page: string, html: string) => string;
}): Promise<void> {
  await fs.rm(targetDirectory, { force: true, recursive: true });
  for (const file of await listHtmlFiles(sourceDirectory)) {
    const page = toPosixPath(path.relative(sourceDirectory, file));
    await writeRedirect(
      path.join(targetDirectory, ...page.split("/")),
      destination(page, await fs.readFile(file, "utf8")),
      title,
    );
  }
}

/** `core/index.html` is served as `core/`, and that is the URL to redirect to. */
export function pageDirectory(page: string) {
  return page.replace(/(^|\/)index\.html$/, "$1");
}

/**
 * Pages in the line tree that are themselves redirects — `/{line}/guide/` is the
 * historical Core alias — hand the mirror their own destination, so the most
 * linked docs URL on the web costs one hop rather than two.
 */
function redirectDestination(html: string) {
  return /<meta http-equiv="refresh" content="0;url=([^"]+)"/.exec(html)?.[1];
}

/**
 * Docs used to be published under the exact release, so `/5.0.3/` trees are
 * still out there and still linked. The line replaces them; leave a redirect
 * where each one stood rather than deleting the URL.
 */
async function redirectSupersededVersions(
  publishedDirectory: string,
  line: string,
  base: string,
) {
  const destination = withBase(base, `/${line}/`);
  const entries = await fs.readdir(publishedDirectory, { withFileTypes: true });
  for (const entry of entries) {
    const isHtmlStub = entry.isFile() && entry.name.endsWith(".html");
    if (!entry.isDirectory() && !isHtmlStub) {
      continue;
    }
    const version = isHtmlStub
      ? entry.name.slice(0, -".html".length)
      : entry.name;
    if (
      isDocsVersionLine(version) ||
      !isPublishedVersion(version) ||
      docsVersionLine(version) !== line
    ) {
      continue;
    }
    const target = isHtmlStub
      ? path.join(publishedDirectory, entry.name)
      : path.join(publishedDirectory, entry.name, "index.html");
    if (entry.isDirectory()) {
      await fs.rm(path.join(publishedDirectory, entry.name), {
        force: true,
        recursive: true,
      });
    }
    await writeRedirect(target, destination, `Micronaut ${line} docs`);
  }
}

function isPublishedVersion(value: string) {
  return /^\d+\.\d+(?:\.\d+)?(?:[-.][A-Za-z0-9]+)?$/.test(value);
}

async function listHtmlFiles(directory: string): Promise<string[]> {
  return (await listTextFiles(directory)).filter((file) =>
    file.endsWith(".html"),
  );
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

async function migratePublishedDeployment(
  directory: string,
  previous: PublishedDeploymentMetadata,
  current: PublishedDeploymentMetadata,
) {
  if (
    normalizeBase(previous.base) === "/" &&
    normalizeBase(current.base) !== "/"
  ) {
    throw new Error(
      `Cannot automatically migrate published docs from the root base to ${current.base}; republish the retained versions for the repository-path deployment.`,
    );
  }
  const replacements = deploymentReplacements(previous, current);
  for (const legacyReplacement of deploymentReplacements(
    legacyDeployment,
    current,
  )) {
    if (!replacements.some(([from]) => from === legacyReplacement[0])) {
      replacements.push(legacyReplacement);
    }
  }
  if (!replacements.length) {
    return;
  }

  for (const file of await listTextFiles(directory)) {
    const source = await fs.readFile(file, "utf8");
    const migrated = replacements.reduce(
      (value, [from, to]) => value.replaceAll(from, to),
      source,
    );
    if (migrated !== source) {
      await fs.writeFile(file, migrated, "utf8");
    }
  }
}

function deploymentReplacements(
  previous: PublishedDeploymentMetadata,
  current: PublishedDeploymentMetadata,
): Array<[string, string]> {
  return [
    [previous.mainSiteUrl, current.mainSiteUrl],
    [previous.docsSiteUrl, current.docsSiteUrl],
    [previous.guidesSiteUrl, current.guidesSiteUrl],
    [normalizeBase(previous.base), normalizeBase(current.base)],
  ].filter(([from, to]) => from !== to) as Array<[string, string]>;
}

async function readDeploymentMetadata(
  directory: string,
): Promise<PublishedDeploymentMetadata | undefined> {
  try {
    const value: unknown = JSON.parse(
      await fs.readFile(path.join(directory, deploymentMetadataFile), "utf8"),
    );
    if (
      typeof value === "object" &&
      value !== null &&
      typeof (value as PublishedDeploymentMetadata).base === "string" &&
      typeof (value as PublishedDeploymentMetadata).mainSiteUrl === "string" &&
      typeof (value as PublishedDeploymentMetadata).docsSiteUrl === "string" &&
      typeof (value as PublishedDeploymentMetadata).guidesSiteUrl === "string"
    ) {
      return value as PublishedDeploymentMetadata;
    }
    return undefined;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function writeDeploymentMetadata(
  directory: string,
  deployment: PublishedDeploymentMetadata,
) {
  await fs.writeFile(
    path.join(directory, deploymentMetadataFile),
    `${JSON.stringify(deployment, null, 2)}\n`,
    "utf8",
  );
}

async function listTextFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTextFiles(absolutePath)));
    } else if (entry.isFile() && isTextDeploymentAsset(entry.name)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function isTextDeploymentAsset(file: string) {
  return /\.(?:css|html|js|json|map|svg|txt|webmanifest|xml)$/i.test(file);
}

function normalizeBase(base: string) {
  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

async function replaceIfExists(source: string, target: string) {
  if (!(await exists(source))) {
    return;
  }
  await fs.rm(target, { force: true, recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function copyIfExists(source: string, target: string) {
  if (!(await exists(source))) {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true });
}

async function exists(file: string) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function writeRedirect(
  file: string,
  destination: string,
  title: string,
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, clientRedirectDocument(destination, title), "utf8");
}

async function writeNoJekyll(directory: string) {
  await fs.writeFile(path.join(directory, ".nojekyll"), "", "utf8");
}

function withBase(base: string, target: string) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedTarget = target.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedTarget}`.replace(/\/{2,}/g, "/");
}

function sanitizeVersion(version: string | undefined) {
  if (!version || !/^\d+\.\d+(?:\.\d+)?(?:[-.][A-Za-z0-9]+)?$/.test(version)) {
    throw new Error(
      `Expected --version to be a Micronaut version such as 4.10.14; received ${version || "nothing"}.`,
    );
  }
  return version;
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}
