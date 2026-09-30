import { promises as fs } from "node:fs";
import path from "node:path";

import { renderAsciiDoc } from "../asciidoc/rendering.ts";
import { optimizeImages as optimizeGeneratedGuideHtml } from "../shared/generated-html.ts";
import { rewriteMicronautSiteUrl } from "../shared/micronaut-links.ts";
import { guideExtensionRegistry } from "./extensions/index.ts";
import type { Guide, GuideOption, GuideRenderContext } from "./model.ts";
import { productionUrl } from "../../src/lib/route-compatibility.ts";

export type GuideManifestEntry = {
  guide: Guide;
  options: GuideOption[];
  defaultOption: GuideOption | undefined;
};

export async function renderGuideOption(
  asciidoctor: typeof import("@asciidoctor/core"),
  guidesDirectory: string,
  guide: Guide,
  option: GuideOption,
  renderOptions: { strict?: boolean } = {},
): Promise<string> {
  const context = await guideRenderContext({ guidesDirectory, guide, option });
  const source = await fs.readFile(
    path.join(guide.directory, guide.asciidoc),
    "utf8",
  );
  let html = await renderAsciiDoc({
    asciidoctor,
    source,
    diagnosticsLabel: option.id,
    strict: renderOptions.strict,
    convertOptions: {
      attributes: {
        icons: "font",
        idprefix: "",
        idseparator: "-",
        sourceDir: option.sourceDir,
        sourcedir: guide.directory,
      },
      base_dir: guide.directory,
      extension_registry: guideExtensionRegistry(asciidoctor, context),
    },
    fatalDiagnostic: isFatalGuideDiagnostic,
    ignoredDiagnostic: isIgnoredGuideDiagnostic,
  });

  html = rewriteGuideUrls(html, guide.slug);
  html = normalizeAdmonitionLabels(html);
  html = optimizeGeneratedGuideHtml(html);
  return html.trim();
}

/**
 * Under `icons=font` (which guide callout numbers rely on), Asciidoctor
 * renders admonition labels as Font Awesome `<i>` icons. The site never loads
 * Font Awesome, so NOTE/TIP labels vanished. Normalize to the text label the
 * docs surface renders; the shared admonition styles color it per type.
 */
function normalizeAdmonitionLabels(input: string): string {
  return input.replace(
    /<i class="fa icon-[a-z]+" title="([^"]+)"><\/i>/g,
    '<div class="title">$1</div>',
  );
}

export function isFatalGuideDiagnostic(diagnostic: string): boolean {
  return !isIgnoredGuideDiagnostic(diagnostic);
}

// Heading shapes that upstream guide sources are known to contain and that we
// cannot fix here. They are dropped rather than warned so that every diagnostic
// that does reach the log is one worth acting on.
export function isIgnoredGuideDiagnostic(diagnostic: string): boolean {
  return [
    /section title out of sequence: expected level \d+, got level \d+/i,
    /level 0 sections can only be used when doctype is book/i,
  ].some((ignoredGuideDiagnostic) => ignoredGuideDiagnostic.test(diagnostic));
}

async function guideRenderContext({
  guidesDirectory,
  guide,
  option,
}: {
  guidesDirectory: string;
  guide: Guide;
  option: GuideOption;
}): Promise<GuideRenderContext> {
  return {
    guidesDirectory,
    guide,
    option,
    version: await readVersion(guidesDirectory),
    dependencyVersions: await readDependencyVersions(guidesDirectory),
  };
}

// The guides build resolves `@<artifactId>Version@` from the dependencies
// declared in its own `buildSrc` pom.
async function readDependencyVersions(
  guidesDirectory: string,
): Promise<Record<string, string>> {
  let pom: string;
  try {
    pom = await fs.readFile(
      path.join(guidesDirectory, "buildSrc/src/main/resources/pom.xml"),
      "utf8",
    );
  } catch {
    return {};
  }
  return Object.fromEntries(
    Array.from(
      pom.matchAll(
        /<dependency>[^]*?<artifactId>([^<]+)<\/artifactId>\s*<version>([^<]+)<\/version>[^]*?<\/dependency>/g,
      ),
      (match) => [match[1].trim(), match[2].trim()],
    ),
  );
}

async function readVersion(guidesDirectory: string): Promise<string> {
  try {
    return (
      await fs.readFile(path.join(guidesDirectory, "version.txt"), "utf8")
    ).trim();
  } catch {
    return "";
  }
}

export async function copyGuideAssets(
  guidesDirectory: string,
  guide: Guide,
  outputDirectory: string,
  options: GuideOption[] = [],
): Promise<void> {
  await copyReferencedGuideAssets(outputDirectory, guide, options);
  await copyReferencedSharedAssets(guidesDirectory, outputDirectory, options);
}

export function guideManifest(guides: GuideManifestEntry[]): {
  generatedAt: string;
  guideCount: number;
  guides: Array<{
    slug: string;
    title: string;
    intro: string;
    authors: string[];
    tags: string[];
    categories: string[];
    publicationDate: string;
    estimatedMinutes: number;
    overviewFile: string;
    defaultOptionFile: string;
    options: Array<{
      id: string;
      label: string;
      language: string;
      languageLabel: string;
      buildTool: string;
      buildToolLabel: string;
      file: string;
      fragment: string;
      zipUrl: string;
    }>;
  }>;
} {
  const manifestGuides = guides.map(({ guide, options, defaultOption }) => ({
    slug: guide.slug,
    title: guide.title,
    intro: guide.intro,
    authors: guide.authors,
    tags: guide.tags,
    categories: guide.categories,
    publicationDate: guide.publicationDate,
    estimatedMinutes: estimateMinutes(guide),
    overviewFile: `${guide.slug}.html`,
    defaultOptionFile: defaultOption?.file || "",
    options: options.map((option) => ({
      id: option.id,
      label: option.label,
      language: option.language,
      languageLabel: option.languageLabel,
      buildTool: option.buildTool,
      buildToolLabel: option.buildToolLabel,
      file: option.file,
      fragment: `fragments/${option.file}`,
      zipUrl: option.zipUrl,
    })),
  }));

  return {
    generatedAt: new Date().toISOString(),
    guideCount: manifestGuides.length,
    guides: manifestGuides,
  };
}

function rewriteGuideUrls(input: string, slug: string): string {
  return input.replace(
    /\b(href|src)="([^"]*)"/g,
    (match: string, attributeName: string, value: string): string => {
      const canonicalUrl = rewriteMicronautSiteUrl(value);
      if (canonicalUrl) {
        return `${attributeName}="${canonicalUrl}"`;
      }
      const legacyGuidePath =
        /^https:\/\/guides\.micronaut\.io\/latest\/([^?#]+)([?#].*)?$/i.exec(
          value,
        );
      if (legacyGuidePath) {
        if (legacyGuidePath[1].endsWith(".zip")) {
          return match;
        }
        return `${attributeName}="${productionUrl("guides", guidePagePath(legacyGuidePath[1]))}${legacyGuidePath[2] || ""}"`;
      }
      if (
        !value ||
        value.startsWith("#") ||
        value.startsWith("/") ||
        /^[a-z][a-z0-9+.-]*:/i.test(value) ||
        value.startsWith("//")
      ) {
        return match;
      }
      const suffixIndex = firstSuffixIndex(value);
      const pathname = suffixIndex >= 0 ? value.slice(0, suffixIndex) : value;
      const suffix = suffixIndex >= 0 ? value.slice(suffixIndex) : "";
      const normalized = pathname
        .replaceAll("\\", "/")
        .replace(/^(\.\.\/)+/, "")
        .replace(/^\.\//, "");
      if (normalized.endsWith(".zip")) {
        return `${attributeName}="${productionUrl("guides", normalized)}${suffix}"`;
      }
      if (normalized.endsWith(".html")) {
        return `${attributeName}="${productionUrl("guides", guidePagePath(normalized))}${suffix}"`;
      }
      const assetPath =
        normalized.startsWith("images/") || normalized.startsWith("img/")
          ? `${slug}/${normalized}`
          : `shared/images/${normalized}`;
      return `${attributeName}="../assets/${assetPath}${suffix}"`;
    },
  );
}

function guidePagePath(file: string): string {
  return `${file.replace(/\.html$/, "")}/`;
}

async function copyReferencedGuideAssets(
  outputDirectory: string,
  guide: Guide,
  options: GuideOption[],
): Promise<void> {
  const prefix = `../assets/${guide.slug}/`;
  const referenced = await referencedAssets(outputDirectory, options, prefix);
  await Promise.all(
    Array.from(referenced).map(async (asset): Promise<void> => {
      if (!asset.startsWith("images/") && !asset.startsWith("img/")) {
        return;
      }
      const source = path.join(guide.directory, ...asset.split("/"));
      const target = path.join(
        outputDirectory,
        "assets",
        guide.slug,
        ...asset.split("/"),
      );
      await copyAssetFile(source, target);
    }),
  );
}

async function copyReferencedSharedAssets(
  guidesDirectory: string,
  outputDirectory: string,
  options: GuideOption[],
): Promise<void> {
  const referenced = await referencedAssets(
    outputDirectory,
    options,
    "../assets/shared/images/",
  );

  await Promise.all(
    Array.from(referenced).map(async (asset): Promise<void> => {
      const source = path.join(
        guidesDirectory,
        "src",
        "docs",
        "images",
        ...asset.split("/"),
      );
      const target = path.join(
        outputDirectory,
        "assets",
        "shared",
        "images",
        ...asset.split("/"),
      );
      await copyAssetFile(source, target);
    }),
  );
}

async function referencedAssets(
  outputDirectory: string,
  options: GuideOption[],
  prefix: string,
): Promise<Set<string>> {
  const referenced = new Set<string>();
  const expression = new RegExp(`${escapeRegExp(prefix)}([^"?#]+)`, "g");
  for (const option of options) {
    try {
      const html = await fs.readFile(
        path.join(outputDirectory, "fragments", option.file),
        "utf8",
      );
      for (const match of html.matchAll(expression)) {
        const asset = decodeURIComponent(match[1]);
        if (!asset.startsWith("/") && !asset.split("/").includes("..")) {
          referenced.add(asset);
        }
      }
    } catch {
      // Rendering has already reported a missing fragment when strict mode is enabled.
    }
  }
  return referenced;
}

async function copyAssetFile(source: string, target: string): Promise<void> {
  try {
    if (!(await fs.stat(source)).isFile()) {
      return;
    }
  } catch {
    return;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function firstSuffixIndex(value: string): number {
  const queryIndex = value.indexOf("?");
  const hashIndex = value.indexOf("#");
  if (queryIndex < 0) return hashIndex;
  if (hashIndex < 0) return queryIndex;
  return Math.min(queryIndex, hashIndex);
}

function estimateMinutes(guide: Guide): number {
  return Math.max(
    10,
    Math.min(
      60,
      Math.round((guide.intro.length + guide.title.length) / 20) * 5,
    ),
  );
}
