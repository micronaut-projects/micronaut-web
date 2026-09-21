import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseArgs, stringArg } from "./shared/cli.ts";
import { copyCrawlerFiles } from "./shared/crawler-files.ts";
import { hoistVersionedSurfaceAssets } from "./shared/surface-assets.ts";
import { projectPagesUri } from "./asciidoc/api-links.ts";
import { clientRedirectDocument } from "../src/lib/route-compatibility.ts";

export type Surface = "main" | "docs" | "guides";

export type PruneSurfaceOptions = {
  surface: Surface;
  distDirectory?: string;
  budgetMb?: number;
  base?: string;
  docsRoot?: string;
  customDomain?: string;
};

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

if (isMainModule()) {
  const options = parseArgs(process.argv.slice(2));
  await pruneSurface({
    surface: parseSurface(
      stringArg(options.surface) || process.env.MICRONAUT_DEPLOY_SURFACE,
    ),
    distDirectory:
      stringArg(options.dist) || path.join(projectDirectory, "dist"),
    budgetMb: numberOption(
      stringArg(options.budgetMb) || process.env.MICRONAUT_SURFACE_BUDGET_MB,
      300,
    ),
    base: process.env.ASTRO_BASE || "/",
    docsRoot: process.env.MICRONAUT_DOCS_ROOT || "/latest",
    customDomain: process.env.MICRONAUT_CUSTOM_DOMAIN,
  });
}

export async function pruneSurface({
  surface,
  distDirectory = path.join(projectDirectory, "dist"),
  budgetMb = 300,
  base = process.env.ASTRO_BASE || "/",
  docsRoot = process.env.MICRONAUT_DOCS_ROOT || "/latest",
  customDomain = process.env.MICRONAUT_CUSTOM_DOMAIN,
}: PruneSurfaceOptions): Promise<void> {
  if (surface === "main") {
    await pruneMain(distDirectory, customDomain);
  } else if (surface === "docs") {
    await pruneDocs(distDirectory, base, docsRoot, customDomain);
  } else {
    await pruneGuides(distDirectory, base, customDomain);
  }

  await pruneUnreferencedAstroAssets(distDirectory);

  const bytes = await directorySize(distDirectory);
  const mib = bytes / 1024 / 1024;
  console.log(
    `Prepared ${surface} surface artifact at ${distDirectory} (${mib.toFixed(1)} MiB).`,
  );
  if (budgetMb > 0 && mib > budgetMb) {
    throw new Error(
      `${surface} surface artifact is ${mib.toFixed(1)} MiB, above the ${budgetMb} MiB budget.`,
    );
  }
}

async function pruneMain(
  directory: string,
  customDomain?: string,
): Promise<void> {
  await Promise.all(
    ["docs", "guides", "latest", "micronaut-web", "versions.json"].map(
      (entry) =>
        fs.rm(path.join(directory, entry), { force: true, recursive: true }),
    ),
  );
  await writeNoJekyll(directory);
  await writeCustomDomain(directory, customDomain);
}

async function pruneDocs(
  directory: string,
  base: string,
  docsRoot: string,
  customDomain?: string,
): Promise<void> {
  const root = normalizedRoot(docsRoot);
  const targetDirectory = root === "/" ? "" : root.replace(/^\/+/, "");
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-docs-surface-"),
  );
  try {
    await copyIfExists(
      path.join(directory, "_astro"),
      path.join(temporaryDirectory, "_astro"),
    );
    await copyIfExists(
      path.join(directory, "versions.json"),
      path.join(temporaryDirectory, "versions.json"),
    );
    await copyCrawlerFiles(directory, temporaryDirectory);
    await copySurfaceIconAssets(directory, temporaryDirectory);
    const sourceDocsDirectory = path.join(directory, "docs");
    await copyChildren(
      sourceDocsDirectory,
      path.join(temporaryDirectory, targetDirectory),
    );
    await hoistVersionedSurfaceAssets({
      directory: temporaryDirectory,
      versionRoot: targetDirectory,
    });
    await copyIfExists(
      path.join(sourceDocsDirectory, "index.html"),
      path.join(temporaryDirectory, "index.html"),
    );
    await writeRedirect(
      path.join(temporaryDirectory, targetDirectory, "guide", "index.html"),
      withBase(base, joinUrlPath(root, "/core/")),
      "Micronaut Core docs",
    );
    // Module guides link Core's reference tables as
    // `guide/configurationreference.html#<owner binary name>`; the per-module
    // reference carries the same table anchors.
    await writeRedirect(
      path.join(
        temporaryDirectory,
        targetDirectory,
        "guide",
        "configurationreference.html",
      ),
      withBase(base, joinUrlPath(root, "/core/configuration-reference/")),
      "the Micronaut Core configuration reference",
    );
    await fs.writeFile(
      path.join(temporaryDirectory, "404.html"),
      docsNotFoundDocument(withBase(base, "/")),
      "utf8",
    );
    if (root !== "/") {
      await writeRedirect(
        path.join(temporaryDirectory, `${root.replace(/^\/+|\/+$/g, "")}.html`),
        withBase(base, directoryRoot(root)),
        "Micronaut docs",
      );
    }
    await writeNoJekyll(temporaryDirectory);
    await writeCustomDomain(temporaryDirectory, customDomain);
    await replaceDirectory(directory, temporaryDirectory);
  } catch (error) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

async function pruneGuides(
  directory: string,
  base: string,
  customDomain?: string,
): Promise<void> {
  const temporaryDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-guides-surface-"),
  );
  try {
    await copyIfExists(
      path.join(directory, "_astro"),
      path.join(temporaryDirectory, "_astro"),
    );
    await copyCrawlerFiles(directory, temporaryDirectory);
    await copySurfaceIconAssets(directory, temporaryDirectory);
    await copyChildren(path.join(directory, "guides"), temporaryDirectory);
    await copyIfExists(
      path.join(directory, "latest"),
      path.join(temporaryDirectory, "latest"),
    );
    await hoistVersionedSurfaceAssets({
      directory: temporaryDirectory,
      versionRoot: "",
    });
    await Promise.all(
      ["guide", "assets"].map((entry) =>
        fs.rm(path.join(temporaryDirectory, "latest", entry), {
          force: true,
          recursive: true,
        }),
      ),
    );
    await writeNoJekyll(temporaryDirectory);
    await writeCustomDomain(temporaryDirectory, customDomain);
    await replaceDirectory(directory, temporaryDirectory);
  } catch (error) {
    await fs.rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
}

export async function pruneUnreferencedAstroAssets(
  directory: string,
): Promise<void> {
  const astroDirectory = path.join(directory, "_astro");
  if (!(await existsDirectory(astroDirectory))) {
    return;
  }

  const astroFiles = await listFiles(astroDirectory);
  const knownAssets = new Set(
    astroFiles.map((file) => toPosixPath(path.relative(astroDirectory, file))),
  );
  const reachableAssets = new Set<string>();
  const pendingAssets: string[] = [];
  const addReachableAsset = (asset: string | undefined) => {
    const normalized = normalizeAstroAsset(asset);
    if (
      !normalized ||
      !knownAssets.has(normalized) ||
      reachableAssets.has(normalized)
    ) {
      return;
    }
    reachableAssets.add(normalized);
    pendingAssets.push(normalized);
  };

  const files = await listFiles(directory);
  for (const file of files) {
    if (path.extname(file) !== ".html") {
      continue;
    }
    addAstroReferences(await fs.readFile(file, "utf8"), addReachableAsset);
  }

  for (let index = 0; index < pendingAssets.length; index += 1) {
    const asset = pendingAssets[index];
    if (!isTextAsset(asset)) {
      continue;
    }
    const content = await fs.readFile(
      path.join(astroDirectory, ...asset.split("/")),
      "utf8",
    );
    addAstroReferences(content, addReachableAsset);
    addRelativeReferences(content, asset, addReachableAsset);
  }

  await Promise.all(
    [...knownAssets]
      .filter((asset) => !reachableAssets.has(asset))
      .map((asset) =>
        fs.rm(path.join(astroDirectory, ...asset.split("/")), {
          force: true,
        }),
      ),
  );
  await removeEmptyDirectories(astroDirectory, astroDirectory);
}

async function copyChildren(source: string, target: string): Promise<void> {
  const entries = await fs.readdir(source, { withFileTypes: true });
  await fs.mkdir(target, { recursive: true });
  await Promise.all(
    entries.map((entry) =>
      fs.cp(path.join(source, entry.name), path.join(target, entry.name), {
        recursive: true,
      }),
    ),
  );
}

/**
 * Icon assets are the one part of `/micronaut-assets/` a surface keeps its own
 * copy of, so docs and guides pages do not fetch above-the-fold imagery from
 * the main-site origin. `surface-path-rules.ts` keeps the matching paths local.
 */
async function copySurfaceIconAssets(
  sourceDirectory: string,
  targetDirectory: string,
): Promise<void> {
  await copyIfExists(
    path.join(sourceDirectory, "micronaut-assets", "icons"),
    path.join(targetDirectory, "micronaut-assets", "icons"),
  );
}

async function copyIfExists(source: string, target: string): Promise<void> {
  try {
    await fs.cp(source, target, { recursive: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

async function existsDirectory(directory: string): Promise<boolean> {
  try {
    return (await fs.stat(directory)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return entry.isFile() ? [fullPath] : [];
    }),
  );
  return files.flat();
}

async function replaceDirectory(
  target: string,
  replacement: string,
): Promise<void> {
  const swap = await fs.mkdtemp(
    path.join(path.dirname(target), ".surface-swap-"),
  );
  await fs.rm(swap, { force: true, recursive: true });
  await fs.rename(target, swap);
  try {
    await fs.rename(replacement, target);
  } catch (error) {
    await fs.rename(swap, target);
    throw error;
  }
  await fs.rm(swap, { force: true, recursive: true });
}

/**
 * GitHub Pages answers every missing path with the root `404.html`. This host
 * used to carry Core's javadoc at `/{version}/api/`, and module guides still
 * link it there; the javadoc is now published to Core's Pages site under the
 * same `{version}/api/` layout, so those requests are forwarded to it.
 */
function docsNotFoundDocument(base: string): string {
  const javadocSite = projectPagesUri({ project: { slug: "core" } });
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="robots" content="noindex" />',
    '<meta name="color-scheme" content="light dark" />',
    "<style>",
    "body{margin:0;display:grid;min-height:100vh;place-items:center;font:15px/1.5 system-ui,sans-serif;background:Canvas;color:CanvasText}",
    "a{color:inherit}",
    "</style>",
    "<title>Page not found</title>",
    "<script>",
    `const base=${JSON.stringify(base)};`,
    'const [version,api,...page]=location.pathname.startsWith(base)?location.pathname.slice(base.length).split("/"):[];',
    `if(version&&api==="api"){location.replace(${JSON.stringify(javadocSite)}+"/"+version+"/api/"+page.join("/")+location.search+location.hash);}`,
    "</script>",
    "</head>",
    "<body>",
    `<p>This page does not exist. <a href="${base}">Browse the Micronaut docs</a></p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

async function writeRedirect(
  file: string,
  destination: string,
  title: string,
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, clientRedirectDocument(destination, title), "utf8");
}

async function writeCustomDomain(
  directory: string,
  customDomain?: string,
): Promise<void> {
  if (!customDomain) {
    return;
  }
  await fs.writeFile(
    path.join(directory, "CNAME"),
    `${customDomain.trim()}\n`,
    "utf8",
  );
}

async function writeNoJekyll(directory: string): Promise<void> {
  await fs.writeFile(path.join(directory, ".nojekyll"), "", "utf8");
}

async function directorySize(directory: string): Promise<number> {
  let total = 0;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(fullPath);
    } else if (entry.isFile()) {
      total += (await fs.stat(fullPath)).size;
    }
  }
  return total;
}

async function removeEmptyDirectories(
  directory: string,
  root: string,
): Promise<void> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) =>
        removeEmptyDirectories(path.join(directory, entry.name), root),
      ),
  );
  if (directory === root) {
    return;
  }
  if ((await fs.readdir(directory)).length === 0) {
    await fs.rmdir(directory);
  }
}

function withBase(base: string, target: string) {
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  const normalizedTarget = target.replace(/^\/+/, "");
  return `${normalizedBase}${normalizedTarget}`.replace(/\/{2,}/g, "/");
}

function joinUrlPath(root: string, suffix: string) {
  const normalizedRoot = normalizedRootPath(root);
  const normalizedSuffix = normalizedRootPath(suffix);
  if (normalizedRoot === "/") {
    return normalizedSuffix;
  }
  return `${normalizedRoot.replace(/\/+$/, "")}${normalizedSuffix}`;
}

function directoryRoot(root: string) {
  const normalized = normalizedRoot(root);
  return normalized === "/" ? "/" : `${normalized.replace(/\/+$/, "")}/`;
}

function normalizedRoot(root: string) {
  const normalized = normalizedRootPath(root || "/");
  return normalized === "/" ? "/" : normalized.replace(/\/+$/, "");
}

function normalizedRootPath(value: string) {
  if (!value) {
    return "/";
  }
  return `/${value}`.replace(/\/{2,}/g, "/");
}

function addAstroReferences(
  content: string,
  addReachableAsset: (asset: string | undefined) => void,
) {
  const references = /_astro\/([^"'`<>\s?#)]+)/g;
  let match: RegExpExecArray | null;
  while ((match = references.exec(content))) {
    addReachableAsset(match[1]);
  }
}

function addRelativeReferences(
  content: string,
  fromAsset: string,
  addReachableAsset: (asset: string | undefined) => void,
) {
  const quotedReferences = /["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = quotedReferences.exec(content))) {
    addReachableAsset(resolveRelativeAsset(fromAsset, match[1]));
  }

  const cssUrls = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
  while ((match = cssUrls.exec(content))) {
    addReachableAsset(resolveRelativeAsset(fromAsset, match[1]));
  }
}

function resolveRelativeAsset(fromAsset: string, reference: string) {
  if (!reference.startsWith("./") && !reference.startsWith("../")) {
    return undefined;
  }
  return path.posix.normalize(
    path.posix.join(path.posix.dirname(fromAsset), reference),
  );
}

function normalizeAstroAsset(asset: string | undefined) {
  if (!asset) {
    return undefined;
  }
  const withoutHash = asset.split(/[?#]/, 1)[0];
  const decoded = decodeUrlPath(withoutHash).replace(/\\/g, "/");
  const astroIndex = decoded.indexOf("_astro/");
  const relative =
    astroIndex >= 0 ? decoded.slice(astroIndex + "_astro/".length) : decoded;
  const normalized = path.posix.normalize(relative.replace(/^\/+/, ""));
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("../") ||
    path.posix.isAbsolute(normalized)
  ) {
    return undefined;
  }
  return normalized;
}

function decodeUrlPath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isTextAsset(asset: string) {
  return /\.(?:css|html|js|json|mjs|svg|txt)$/i.test(asset);
}

function toPosixPath(value: string) {
  return value.split(path.sep).join("/");
}

function parseSurface(value: string | undefined): Surface {
  if (value === "main" || value === "docs" || value === "guides") {
    return value;
  }
  throw new Error(
    `Expected --surface to be one of main, docs, or guides; received ${value || "nothing"}.`,
  );
}

function numberOption(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function isMainModule() {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
}
