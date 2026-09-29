import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  extractTaggedSourceWithDiagnostics,
  normalizeSnippetIndent,
  taggedSourceDiagnosticMessage,
} from "../shared/tagged-source.ts";
import type { Properties } from "./project-manifest.ts";
import {
  type MacroAttributes,
  macroAttribute,
} from "../asciidoc/extensions/macro-attributes.ts";

type SnippetContext = {
  submoduleDirectory: string;
  attributes: Properties;
};

type SnippetLanguage = [language: string, extension: string];

type SnippetSample = {
  group?: string;
  language: string;
  source: string;
};

export function docsSnippetSamples(
  target: string,
  attrs: MacroAttributes,
  context: SnippetContext,
): SnippetSample[] {
  const baseDirectories = snippetBaseDirectoriesSync(attrs, context);
  const dedupeProjectBaseLanguages =
    Boolean(macroAttribute(attrs, "project-base")) &&
    baseDirectories.length > 1;
  const source = macroAttribute(attrs, "source");
  const sources = source ? [source] : ["test", "main"];
  const explicit = explicitSnippetLanguage(target);
  const languages = explicit ? [explicit] : languagesToRender(context);
  const samples: SnippetSample[] = [];
  const matchedProjectBaseLanguages = new Set<string>();
  let matchedFiles = 0;
  for (const baseDirectory of baseDirectories) {
    for (const sourceSet of sources) {
      for (const [language, extension] of languages) {
        if (
          dedupeProjectBaseLanguages &&
          matchedProjectBaseLanguages.has(language)
        ) {
          continue;
        }
        const file = path.join(
          baseDirectory,
          "src",
          sourceSet,
          language,
          `${snippetPathTarget(target, extension)}.${extension}`,
        );
        if (!existsSync(file) || !statSync(file).isFile()) {
          continue;
        }
        matchedFiles += 1;
        let source = readFileSync(file, "utf8");
        const taggedSource = extractTaggedSourceWithDiagnostics(
          source,
          macroAttribute(attrs, "tags") || macroAttribute(attrs, "tag") || "",
        );
        // Upstream sometimes asks for a tag one language's file lacks, such as
        // `imports`; the tags that did resolve still make a useful snippet.
        if (taggedSource.diagnostics.length && !taggedSource.source.trim()) {
          samples.push({
            language,
            source: `NOTE: ${taggedSourceDiagnosticMessage(
              taggedSource.diagnostics,
              relativeSnippetFile(file, context),
            )}`,
          });
          if (dedupeProjectBaseLanguages) {
            matchedProjectBaseLanguages.add(language);
          }
          continue;
        }
        source = taggedSource.source;
        source = normalizeSnippetIndent(
          source,
          macroAttribute(attrs, "indent"),
        );
        if (source.trim()) {
          samples.push({
            language,
            source,
          });
          if (dedupeProjectBaseLanguages) {
            matchedProjectBaseLanguages.add(language);
          }
        }
      }
    }
  }
  if (!matchedFiles) {
    samples.push({
      language: "text",
      source: `NOTE: Missing snippet source \`${target.trim()}\`.`,
    });
  }
  return samples;
}

function relativeSnippetFile(file: string, context: SnippetContext): string {
  return path
    .relative(context.submoduleDirectory, file)
    .replaceAll(path.sep, "/");
}

function languagesToRender(context: SnippetContext): SnippetLanguage[] {
  const defaultLanguage = context.attributes["default-language"];
  const languages: SnippetLanguage[] = [
    ["java", "java"],
    ["python", "py"],
    ["kotlin", "kt"],
    ["groovy", "groovy"],
  ];
  return defaultLanguage
    ? languages.filter(([language]) => language === defaultLanguage)
    : languages;
}

function explicitSnippetLanguage(target: string): SnippetLanguage | undefined {
  if (target.endsWith(".java")) return ["java", "java"];
  if (target.endsWith(".py")) return ["python", "py"];
  if (target.endsWith(".kt")) return ["kotlin", "kt"];
  if (target.endsWith(".groovy")) return ["groovy", "groovy"];
  return undefined;
}

// Python sources drop the leading `io` package: `io.micronaut.docs.X` lives
// at `micronaut/docs/X.py`, matching the upstream SnippetSourceResolver.
function snippetPathTarget(target: string, extension: string): string {
  const suffix = `.${extension}`;
  let normalized = target.endsWith(suffix)
    ? target.slice(0, -suffix.length)
    : target;
  if (extension === "py" && normalized.startsWith("io.")) {
    normalized = normalized.slice("io.".length);
  }
  return normalized.replaceAll(".", path.sep);
}

function snippetBaseDirectoriesSync(
  attrs: MacroAttributes,
  context: SnippetContext,
): string[] {
  const project = macroAttribute(attrs, "project");
  if (project) {
    return projectSnippetDirectories(project, context);
  }
  const projectBase = macroAttribute(attrs, "project-base");
  if (projectBase) {
    const requested = path.join(context.submoduleDirectory, projectBase);
    const directories: string[] = [];
    if (existsSync(requested) && statSync(requested).isDirectory()) {
      directories.push(requested);
    }
    const parent = path.dirname(requested);
    const baseName = path.basename(requested);
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(`${baseName}-`)) {
        directories.push(path.join(parent, entry.name));
      }
    }
    return sortSnippetDirectories([...new Set(directories)]);
  }
  return [
    path.join(context.submoduleDirectory, "test-suite"),
    path.join(context.submoduleDirectory, "test-suite-python"),
    path.join(context.submoduleDirectory, "test-suite-kotlin"),
    path.join(context.submoduleDirectory, "test-suite-groovy"),
    context.submoduleDirectory,
  ];
}

function projectSnippetDirectories(
  project: string,
  context: SnippetContext,
): string[] {
  const requested = path.join(context.submoduleDirectory, project);
  if (existsSync(requested) && statSync(requested).isDirectory()) {
    return [requested];
  }
  const fallback = exampleProjectAliasDirectory(project, context);
  return fallback ? [requested, fallback] : [requested];
}

function exampleProjectAliasDirectory(
  project: string,
  context: SnippetContext,
): string | undefined {
  const segments = project.split(/[\\/]+/);
  const baseName = segments.at(-1) || "";
  if (!baseName.startsWith("micronaut-")) {
    return undefined;
  }
  segments[segments.length - 1] = `example-${baseName.slice(
    "micronaut-".length,
  )}`;
  const candidate = path.join(context.submoduleDirectory, ...segments);
  return existsSync(candidate) && statSync(candidate).isDirectory()
    ? candidate
    : undefined;
}

function sortSnippetDirectories(directories: string[]): string[] {
  const rank = (value: string): number => {
    if (value.endsWith("-java")) return 0;
    if (value.endsWith("-python")) return 1;
    if (value.endsWith("-kotlin")) return 2;
    if (value.endsWith("-kotlin-ksp")) return 3;
    if (value.endsWith("-groovy")) return 4;
    return 5;
  };
  return directories.sort(
    (left, right) => rank(left) - rank(right) || left.localeCompare(right),
  );
}
