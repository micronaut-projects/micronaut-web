import { promises as fs } from "node:fs";
import path from "node:path";

import { isDirectory, isRegularFile } from "../shared/files.ts";
import { record } from "../asciidoc/extensions/macro-attributes.ts";

export interface GuideApp {
  name: string;
  applicationType: string;
  features: string[];
  invisibleFeatures?: string[];
  javaFeatures: string[];
  kotlinFeatures: string[];
  groovyFeatures: string[];
}

export interface Guide {
  slug: string;
  directory: string;
  title: string;
  intro: string;
  authors: string[];
  categories: string[];
  publicationDate: string;
  tags: string[];
  languages: string[];
  buildTools: string[];
  testFramework: string;
  cloud: string;
  publish: boolean;
  base: string;
  asciidoc: string;
  apps: GuideApp[];
  minimumJavaVersion: string | number;
  maximumJavaVersion?: string | number;
}

export interface GuideOption {
  id: string;
  label: string;
  buildTool: string;
  buildToolLabel: string;
  language: string;
  languageLabel: string;
  testFramework: string;
  file: string;
  sourceDir: string;
  zipUrl: string;
}

export interface GuideRenderContext {
  guidesDirectory: string;
  guide: Guide;
  option: GuideOption;
  version: string;
  // Versions by artifact id, substituted for `@<artifactId>Version@`.
  dependencyVersions: Record<string, string>;
}

export const DEFAULT_GUIDE_SLUGS = [
  "creating-your-first-micronaut-app",
  "micronaut-http-client",
  "micronaut-data-jdbc-repository",
];

const LANGUAGES = ["java", "kotlin", "groovy", "python"];
const DEFAULT_LANGUAGES = ["java", "kotlin", "groovy"];
const DEFAULT_BUILD_TOOLS = ["gradle", "maven"];
export const PYTHON_LANGUAGE = "python";
export const PYTHON_BUILD_TOOL = "pyronaut";

export async function readGuides(
  guidesRepositoryDirectory: string,
): Promise<Guide[]> {
  const guidesDirectory = path.join(guidesRepositoryDirectory, "guides");
  if (!(await isDirectory(guidesDirectory))) {
    return [];
  }

  const entries = await fs.readdir(guidesDirectory, { withFileTypes: true });
  const parsed: Guide[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const directory = path.join(guidesDirectory, entry.name);
    const metadataFile = path.join(directory, "metadata.json");
    if (!(await isRegularFile(metadataFile))) {
      continue;
    }
    const metadata = JSON.parse(await fs.readFile(metadataFile, "utf8"));
    parsed.push(normalizeGuideMetadata(metadata, directory, entry.name));
  }

  // A guide naming a `base` inherits its tags, and a base is often itself
  // unpublished, so the whole set has to be parsed before the published ones
  // are selected.
  const byName = new Map<string, Guide>();
  for (const guide of parsed) {
    byName.set(guide.slug, guide);
    byName.set(path.basename(guide.directory), guide);
  }
  const guides = parsed
    .filter((guide) => guide.publish)
    .map((guide) => {
      const base = guide.base ? byName.get(guide.base) : undefined;
      return base
        ? { ...guide, tags: [...new Set([...guide.tags, ...base.tags])] }
        : guide;
    });

  return guides.sort(
    (left, right) =>
      right.publicationDate.localeCompare(left.publicationDate) ||
      left.title.localeCompare(right.title),
  );
}

export function selectGuides(
  guides: Guide[],
  selectedSlugs: string[],
): Guide[] {
  if (!selectedSlugs.length) {
    return guides;
  }
  const selected = new Set(selectedSlugs);
  return guides.filter((guide) => selected.has(guide.slug));
}

export function guideOptions(guide: Guide): GuideOption[] {
  const options: GuideOption[] = [];
  for (const buildTool of guide.buildTools) {
    for (const language of LANGUAGES) {
      if (
        !guide.languages.includes(language) ||
        !isSupportedOption(buildTool, language)
      ) {
        continue;
      }
      options.push({
        id: `${guide.slug}-${buildTool}-${language}`,
        label: `${languageLabel(language)} / ${buildToolLabel(buildTool)}`,
        buildTool,
        buildToolLabel: buildToolLabel(buildTool),
        language,
        languageLabel: languageLabel(language),
        testFramework: testFrameworkFor(guide, language),
        file: guideOptionFile(guide.slug, buildTool, language),
        sourceDir: `${guide.slug}-${buildTool}-${language}`,
        zipUrl: `${guide.slug}-${buildTool}-${language}.zip`,
      });
    }
  }
  return options;
}

/**
 * Mirrors `GuideUtils.isSupported` in the guides build: Python is generated
 * only for Pyronaut and Pyronaut only for Python, and a Maven/Kotlin project
 * is never generated. A combination the build skips has neither a sample
 * project to render snippets from nor a zip to download.
 */
function isSupportedOption(buildTool: string, language: string): boolean {
  if (buildTool === PYTHON_BUILD_TOOL || language === PYTHON_LANGUAGE) {
    return buildTool === PYTHON_BUILD_TOOL && language === PYTHON_LANGUAGE;
  }
  return !(buildTool === "maven" && language === "kotlin");
}

export function defaultGuideOption(guide: Guide): GuideOption | undefined {
  return (
    guideOptions(guide).find(
      (option) => option.buildTool === "gradle" && option.language === "java",
    ) ||
    guideOptions(guide).find((option) => option.language === "java") ||
    guideOptions(guide)[0]
  );
}

function guideOptionFile(
  slug: string,
  buildTool: string,
  language: string,
): string {
  return `${slug}-${buildTool}-${language}.html`;
}

export function languageExtension(language: string): string {
  return (
    {
      groovy: "groovy",
      kotlin: "kt",
      python: "py",
    }[language] || "java"
  );
}

export function languageSourceDirectory(
  language: string,
  sourceSet: string,
): string {
  if (language === "kotlin") {
    return sourceSet === "test" ? "src/test/kotlin" : "src/main/kotlin";
  }
  if (language === "groovy") {
    return sourceSet === "test" ? "src/test/groovy" : "src/main/groovy";
  }
  if (language === PYTHON_LANGUAGE) {
    return sourceSet === "test" ? "tests" : "src";
  }
  return sourceSet === "test" ? "src/test/java" : "src/main/java";
}

/**
 * Pyronaut projects keep configuration beside the sources rather than under a
 * `resources` source set, matching `sourceConventionFolder` in the guides
 * build. Guides also check in resources no variant rewrites — views, static
 * assets, migrations — once under the JVM layout and share them across every
 * option, so a Python lookup falls back to that shared copy.
 */
export function resourceSourceDirectories(
  language: string,
  sourceSet: string,
): string[] {
  const shared = `src/${sourceSet}/resources`;
  if (language === PYTHON_LANGUAGE) {
    return [sourceSet === "test" ? "tests-config" : "config", shared];
  }
  return [shared];
}

/**
 * The directories a guide keeps its per-language files under. JVM options
 * put sources, tests, and resources below `src`; a Pyronaut project makes
 * them siblings, so an include below any of them is language-specific.
 */
export function languageDirectoryRoots(language: string): string[] {
  return language === PYTHON_LANGUAGE
    ? ["src", "tests", "config", "tests-config"]
    : ["src"];
}

/**
 * A guide macro targets a class name even for Python, where the file it names
 * is a snake_case module: `HomeController` is `home_controller.py`. Mirrors
 * `MacroUtils.pythonModuleName` in the guides build.
 */
export function pythonModuleName(target: string): string {
  if (target.includes("_") || target === target.toLowerCase()) {
    return target;
  }
  return target
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** A Python test module trades the JVM `Test` suffix for a `test_` prefix. */
export function pythonTestModuleName(target: string): string {
  const name = pythonModuleName(
    target.endsWith("Test") ? target.slice(0, -"Test".length) : target,
  );
  return name.startsWith("test_") ? name : `test_${name}`;
}

export function appFeatures(
  guide: Guide,
  option: GuideOption,
  appName = "default",
): string[] {
  const app =
    guide.apps.find((candidate) => candidate.name === appName) || guide.apps[0];
  if (!app) {
    return [];
  }

  const languageSpecific =
    {
      groovy: app.groovyFeatures,
      java: app.javaFeatures,
      kotlin: app.kotlinFeatures,
    }[option.language] || [];
  return [...new Set([...app.features, ...languageSpecific].filter(Boolean))];
}

export function featuresWords(features: string[]): string {
  const formatted = features.map((feature) => `\`${feature}\``);
  if (formatted.length <= 1) {
    return formatted[0] || "";
  }
  return `${formatted.slice(0, -1).join(", ")}, and ${formatted.at(-1)}`;
}

export function cliCommandForApp(app?: GuideApp): string {
  return (
    {
      CLI: "create-cli-app",
      FUNCTION: "create-function-app",
      GRPC: "create-grpc-app",
      MESSAGING: "create-messaging-app",
    }[String(app?.applicationType || "").toUpperCase()] || "create-app"
  );
}

function normalizeGuideMetadata(
  metadata: Record<string, unknown>,
  directory: string,
  fallbackSlug: string,
): Guide {
  const slug = string(metadata.slug, fallbackSlug);
  const apps = normalizeApps(metadata.apps);
  const categories = strings(metadata.categories);
  return {
    slug,
    directory,
    title: string(metadata.title, slug),
    intro: string(metadata.intro, ""),
    authors: strings(metadata.authors),
    categories,
    publicationDate: string(metadata.publicationDate, "1970-01-01"),
    tags: guideTags(strings(metadata.tags), apps, categories),
    languages: withPythonVariant(
      lowerList(metadata.languages, DEFAULT_LANGUAGES),
      PYTHON_LANGUAGE,
      metadata.python === true,
    ),
    buildTools: withPythonVariant(
      lowerList(metadata.buildTools, DEFAULT_BUILD_TOOLS),
      PYTHON_BUILD_TOOL,
      metadata.python === true,
    ),
    testFramework: string(metadata.testFramework, ""),
    cloud: string(metadata.cloud, ""),
    publish: metadata.publish !== false,
    base: string(metadata.base, ""),
    asciidoc: string(metadata.asciidoctor, `${slug}.adoc`),
    apps: apps.length
      ? apps
      : [
          {
            name: "default",
            applicationType: "DEFAULT",
            features: [],
            invisibleFeatures: [],
            javaFeatures: [],
            kotlinFeatures: [],
            groovyFeatures: [],
          },
        ],
    minimumJavaVersion: stringOrNumber(
      metadata.minimumJavaVersion || metadata.minJdk,
      21,
    ),
    maximumJavaVersion: optionalStringOrNumber(metadata.maximumJavaVersion),
  };
}

/**
 * Mirrors `GuideUtils.getTags` in the guides build: a guide is tagged by its
 * own `tags`, by every Starter feature its apps request (minus the prefixes
 * that name the framework rather than the subject), and by its categories.
 *
 * The union — not the `tags` array alone — is what the upstream index turned
 * into `tag-*.html` pages, so it is also the set of tag pages the published
 * site has to keep serving. Tags stay in their metadata spelling here;
 * `tagSlug` decides the URL form.
 */
function guideTags(
  tags: string[],
  apps: GuideApp[],
  categories: string[],
): string[] {
  const derived = new Set(tags);
  for (const app of apps) {
    for (const feature of [
      ...app.features,
      ...app.javaFeatures,
      ...app.kotlinFeatures,
      ...app.groovyFeatures,
    ]) {
      derived.add(featureTag(feature));
    }
  }
  for (const category of categories) {
    derived.add(category.toLowerCase().replaceAll(" ", "-"));
  }
  return [...derived].filter(Boolean);
}

const FEATURE_TAG_PREFIXES = ["micronaut-", "views-"];

function featureTag(feature: string): string {
  let tag = feature;
  for (const prefix of FEATURE_TAG_PREFIXES) {
    if (tag.startsWith(prefix)) {
      tag = tag.slice(prefix.length);
    }
  }
  return tag;
}

function normalizeApps(value: unknown): GuideApp[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const app = record(item);
    return {
      name: string(app?.name, "default"),
      applicationType: string(app?.applicationType, "DEFAULT"),
      features: strings(app?.features),
      invisibleFeatures: strings(app?.invisibleFeatures),
      javaFeatures: strings(app?.javaFeatures),
      kotlinFeatures: strings(app?.kotlinFeatures),
      groovyFeatures: strings(app?.groovyFeatures),
    };
  });
}

/**
 * `python: true` is how a guide's metadata opts into a Pyronaut variant. The
 * guides build's parser adds the language and its build tool to the lists the
 * option matrix is built from, so the site has to as well; a guide that spells
 * either out itself already carries it.
 */
function withPythonVariant(
  values: string[],
  value: string,
  python: boolean,
): string[] {
  return python && !values.includes(value) ? [...values, value] : values;
}

function testFrameworkFor(guide: Guide, language: string): string {
  // Pyronaut projects are always generated with pytest, whatever test
  // framework the guide names for its JVM variants.
  if (language === PYTHON_LANGUAGE) {
    return "pytest";
  }
  if (guide.testFramework) {
    return guide.testFramework.toLowerCase();
  }
  return language === "groovy" ? "spock" : "junit";
}

function languageLabel(language: string): string {
  return (
    {
      groovy: "Groovy",
      java: "Java",
      kotlin: "Kotlin",
      python: "Python",
    }[language] || language
  );
}

function buildToolLabel(buildTool: string): string {
  return (
    {
      gradle: "Gradle",
      maven: "Maven",
      pyronaut: "Pyronaut",
    }[buildTool] || buildTool
  );
}

function lowerList(value: unknown, fallback: string[]): string[] {
  const values = strings(value);
  if (!values.length) {
    return fallback;
  }
  return values.map((item) => item.toLowerCase().replaceAll("_", "-"));
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is NonNullable<unknown> =>
        item !== undefined && item !== null,
    )
    .map(String);
}

function string(value: unknown, fallback: string): string {
  return value === undefined || value === null ? fallback : String(value);
}

function stringOrNumber(
  value: unknown,
  fallback: string | number,
): string | number {
  return typeof value === "string" || typeof value === "number"
    ? value
    : fallback;
}

function optionalStringOrNumber(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * Where snippet and include lookups search beyond the guide's own directory.
 *
 * `./gradlew generateCodeZip` in the guides repository writes one Micronaut
 * Starter project per option under `build/code`, which is the `sourcedir` the
 * upstream Asciidoctor build resolves every include against. A guide's own
 * files are copied into that project verbatim, so the generated project is a
 * superset: it also holds the Starter files (`Application`, generated
 * `application.properties`, build scripts) that live in no guide directory.
 * Without a generated project the guide directory alone still resolves every
 * file a guide checks in.
 *
 * A guide may also build on another guide's sources (`base` in metadata.json).
 */
export function guideSourceRoots(context: GuideRenderContext): string[] {
  const roots = [
    path.join(
      context.guidesDirectory,
      "build",
      "code",
      context.guide.slug,
      context.option.sourceDir,
    ),
  ];
  if (context.guide.base) {
    roots.push(
      path.join(context.guidesDirectory, "guides", context.guide.base),
    );
  }
  return roots;
}
