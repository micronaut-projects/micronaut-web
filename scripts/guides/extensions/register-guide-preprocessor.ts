import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import type { Registry } from "@asciidoctor/core";

import {
  definePreprocessor,
  replaceReaderLines,
} from "../../asciidoc/extensions/define.ts";
import { coreApiBaseUri } from "../../asciidoc/api-links.ts";
import { parseAttributeList } from "../../asciidoc/extensions/macro-attributes.ts";
import { splitList } from "../../shared/cli.ts";
import {
  appFeatures,
  cliCommandForApp,
  featuresWords,
  guideSourceRoots,
  languageDirectoryRoots,
  languageExtension,
  type GuideRenderContext,
} from "../model.ts";

export const GUIDE_DEPENDENCIES_BLOCK = "guide-dependencies";
const CALLOUT_LINE_MACRO = /^callout:{1,2}([^\[]+)\[([^\]]*)]\s*$/;
const EXCLUDE_DIRECTIVE_LINE =
  /^:(exclude-for-languages|only-for-languages|exclude-for-build|exclude-for-jdk-lower-than):(.*)$/;
const DEFAULT_MIN_JDK = 21;
const LICENSE_INCLUDE = "common::license.adoc[]";
const EXPANDED_CONTENT_MACRO_LINE =
  /^(common|common-template|external|external-template):{1,2}([^\[]+)\[([^\]]*)]\s*$/;
const LEGACY_LINE_BLOCK_MACROS = new Set([
  "callout",
  "common",
  "common-template",
  "dependency",
  "diffLink",
  "external",
  "external-template",
  "rawTest",
  "resource",
  "rocker",
  "source",
  "test",
  "testResource",
  "zipInclude",
]);

type ExcludeMacroName =
  | "exclude-for-languages"
  | "only-for-languages"
  | "exclude-for-build"
  | "exclude-for-jdk-lower-than";

type ExcludeDirective = {
  name: ExcludeMacroName;
  values: string[];
};

type PrepareOptions = {
  appendLicense?: boolean;
  // Files being expanded up the call chain, so an include cycle becomes a
  // note in the output rather than unbounded recursion.
  includeStack?: ReadonlySet<string>;
};

// The guide preprocessor turns guide source into plain AsciiDoc before
// parsing: placeholders are substituted, `common::`/`external::`/`callout::`
// macros are expanded in place (their includes and callout lists must reach
// the document reader), legacy exclude directives become Asciidoctor
// conditionals, single-colon macros become block macros and `:dependencies:`
// groups become a `[guide-dependencies]` block whose body lists the macros.
export function registerGuidePreprocessor(
  registry: Registry,
  context: GuideRenderContext,
): void {
  definePreprocessor(registry, (document, reader) =>
    replaceReaderLines(
      document,
      reader,
      prepareGuideSourceForExtensions(
        reader.getLines().join("\n"),
        context,
      ).split(/\r?\n/),
    ),
  );
}

export function prepareGuideSourceForExtensions(
  source: string,
  context: GuideRenderContext,
  options: PrepareOptions = {},
): string {
  const withLicense =
    options.appendLicense === false
      ? source
      : `${source.replace(/\s+$/, "")}\n\n${LICENSE_INCLUDE}\n`;
  return rewriteGuideLines(
    replacePlaceholders(withLicense, context).split(/\r?\n/),
    context,
    options.includeStack || new Set(),
  ).join("\n");
}

function rewriteGuideLines(
  lines: string[],
  context: GuideRenderContext,
  includeStack: ReadonlySet<string>,
): string[] {
  const output: string[] = [];
  const excludes = new ExcludeConditionals(context);
  let dependencyGroup: string[] | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    // Grouping runs before the single-colon macro rewrite: guide sources write
    // `dependency:x[]` inside `:dependencies:` and a rewritten line would
    // otherwise escape the group as a standalone macro.
    if (line === ":dependencies:") {
      if (dependencyGroup) {
        output.push(...dependencyGroupBlockLines(dependencyGroup));
        dependencyGroup = undefined;
      } else {
        dependencyGroup = [];
      }
      continue;
    }
    if (dependencyGroup && line.startsWith("dependency:")) {
      dependencyGroup.push(line.replace(/^dependency:(?!:)/, "dependency::"));
      continue;
    }
    const expandedContent = expandedGuideContentLines(
      line,
      context,
      includeStack,
    );
    if (expandedContent) {
      output.push(...expandedContent);
      continue;
    }
    const expandedCallout = expandedGuideCalloutLines(
      line,
      context,
      includeStack,
    );
    if (expandedCallout) {
      output.push(...expandedCallout);
      continue;
    }
    const legacyBlockMacro = legacyLineBlockMacroLines(line);
    if (legacyBlockMacro) {
      output.push(...legacyBlockMacro);
      continue;
    }
    const directive = parseExcludeDirective(line);
    if (directive) {
      const adjacent = adjacentExcludeDirectives(lines, index, directive);
      output.push(...excludes.directive(directive, adjacent.values));
      index = adjacent.nextIndex - 1;
      continue;
    }
    output.push(line);
  }

  if (dependencyGroup) {
    output.push(...dependencyGroupBlockLines(dependencyGroup));
  }
  output.push(...excludes.closeAll());
  return output;
}

// Legacy exclude directives are rewritten to Asciidoctor's own conditionals:
// `:exclude-for-languages:groovy,kotlin` opens one `ifeval` per value (all
// must hold for the body to render) and the bare directive closes them.
// `:only-for-languages:java,kotlin` is the inverse and opens a single
// `ifeval` that holds when the rendered language is one of the values. The
// rules that guide sources rely on are kept: directives written on adjacent
// lines merge into one group, a closing directive with no open group is a
// no-op, closing an outer group also closes groups nested inside it, and a
// group left open runs to the end of the file.
class ExcludeConditionals {
  private readonly open: Array<{ name: ExcludeMacroName; count: number }> = [];

  private readonly context: GuideRenderContext;

  constructor(context: GuideRenderContext) {
    this.context = context;
  }

  directive(directive: ExcludeDirective, values: string[]): string[] {
    if (!values.length) {
      return this.close(directive.name);
    }
    const conditions =
      directive.name === "only-for-languages"
        ? [this.onlyForLanguagesCondition(values)]
        : values
            .map((value) => this.condition(directive.name, value))
            .filter((condition): condition is string => Boolean(condition));
    this.open.push({ name: directive.name, count: conditions.length });
    // Asciidoctor drops the directive lines without separating blocks, so a
    // blank line keeps the body from joining the paragraph before it.
    return ["", ...conditions.map((condition) => `ifeval::[${condition}]`)];
  }

  closeAll(): string[] {
    const lines: string[] = [];
    while (this.open.length) {
      lines.push(...endifLines(this.open.pop()!.count));
    }
    return lines.length ? [...lines, ""] : lines;
  }

  private close(name: ExcludeMacroName): string[] {
    const matching = this.open.findLastIndex((entry) => entry.name === name);
    if (matching < 0) {
      return [];
    }
    const lines: string[] = [];
    while (this.open.length > matching) {
      lines.push(...endifLines(this.open.pop()!.count));
    }
    return [...lines, ""];
  }

  // `ifeval` has no "or", so the match is decided here and written as a
  // comparison against the matching value, or against the whole list if none.
  private onlyForLanguagesCondition(values: string[]): string {
    const language = this.context.option.language.toLowerCase();
    const languages = values.map((value) => value.toLowerCase());
    const expected = languages.includes(language)
      ? language
      : languages.join(",");
    return `"${language}" == "${expected}"`;
  }

  private condition(name: ExcludeMacroName, value: string): string | undefined {
    const { guide, option } = this.context;
    if (name === "exclude-for-languages") {
      return `"${option.language.toLowerCase()}" != "${value.toLowerCase()}"`;
    }
    if (name === "exclude-for-build") {
      return `"${option.buildTool.toLowerCase()}" != "${value.toLowerCase()}"`;
    }
    const threshold = Number.parseInt(value, 10);
    if (!Number.isFinite(threshold)) {
      return undefined;
    }
    const guideMinJdk = Number.parseInt(
      String(guide.minimumJavaVersion || DEFAULT_MIN_JDK),
      10,
    );
    return `${guideMinJdk} < ${threshold}`;
  }
}

function endifLines(count: number): string[] {
  return Array.from({ length: count }, () => "endif::[]");
}

function adjacentExcludeDirectives(
  lines: string[],
  startIndex: number,
  directive: ExcludeDirective,
): { values: string[]; nextIndex: number } {
  const values = [...directive.values];
  let index = startIndex + 1;
  while (values.length && index < lines.length) {
    const next = parseExcludeDirective(lines[index]);
    if (!next || next.name !== directive.name || !next.values.length) {
      break;
    }
    values.push(...next.values);
    index += 1;
  }
  return { values, nextIndex: index };
}

function parseExcludeDirective(line: string): ExcludeDirective | undefined {
  const match = EXCLUDE_DIRECTIVE_LINE.exec(line);
  if (!match) {
    return undefined;
  }
  return {
    name: match[1] as ExcludeMacroName,
    values: splitList(match[2]),
  };
}

function expandedGuideContentLines(
  line: string,
  context: GuideRenderContext,
  includeStack: ReadonlySet<string>,
): string[] | undefined {
  const match = EXPANDED_CONTENT_MACRO_LINE.exec(line);
  if (!match) {
    return undefined;
  }

  const [, macroName, target, rawAttributes] = match;
  if (macroName === "common" && target.trim() === "header-top.adoc") {
    return [];
  }

  const file =
    macroName === "common" || macroName === "common-template"
      ? commonSnippetPath(context.guidesDirectory, target)
      : externalPath(context.guidesDirectory, target);
  return expandGuideInclude(file, context, includeStack, (source) =>
    macroName.endsWith("-template")
      ? replaceGuideTemplateArguments(
          source,
          parseAttributeList(rawAttributes).attributes,
        )
      : source,
  );
}

function expandedGuideCalloutLines(
  line: string,
  context: GuideRenderContext,
  includeStack: ReadonlySet<string>,
): string[] | undefined {
  const match = CALLOUT_LINE_MACRO.exec(line);
  if (!match) {
    return undefined;
  }

  const [, target, rawAttributes] = match;
  const parsed = parseAttributeList(rawAttributes);
  const file = path.join(
    context.guidesDirectory,
    "src",
    "docs",
    "common",
    "callouts",
    `callout-${ensureSuffix(target.trim(), ".adoc")}`,
  );
  const explicitNumber = calloutNumber(parsed.attributes, parsed.positional);
  return expandGuideInclude(file, context, includeStack, (source) =>
    replaceGuideTemplateArguments(source, parsed.attributes),
  ).map((sourceLine) =>
    explicitNumber
      ? sourceLine.replace(/^<\.>/, `<${explicitNumber}>`)
      : sourceLine,
  );
}

// Reads an included guide source, applies the macro's own substitution and
// expands it like the guide itself so nested macros resolve too.
function expandGuideInclude(
  file: string,
  context: GuideRenderContext,
  includeStack: ReadonlySet<string>,
  substitute: (source: string) => string,
): string[] {
  const normalized = path.resolve(file);
  if (includeStack.has(normalized)) {
    return [`NOTE: Skipped recursive include \`${path.basename(file)}\`.`];
  }
  let source: string;
  try {
    source = readFileSync(normalized, "utf8");
  } catch {
    return [`NOTE: Missing include \`${path.basename(file)}\`.`];
  }
  return prepareGuideSourceForExtensions(substitute(source), context, {
    appendLicense: false,
    includeStack: new Set([...includeStack, normalized]),
  }).split(/\r?\n/);
}

function legacyLineBlockMacroLines(line: string): string[] | undefined {
  const match = /^([A-Za-z][\w-]*):([^:]*\[[^\]]*])\s*$/.exec(line);
  return match && LEGACY_LINE_BLOCK_MACROS.has(match[1])
    ? ["", `${match[1]}::${match[2]}`, ""]
    : undefined;
}

// Callouts that follow the closing delimiter stay in the document reader,
// where the block processor reads them like any snippet macro does.
function dependencyGroupBlockLines(macroLines: string[]): string[] {
  if (!macroLines.length) {
    return [];
  }
  return ["", `[${GUIDE_DEPENDENCIES_BLOCK}]`, "--", ...macroLines, "--"];
}

function replaceGuideTemplateArguments(
  source: string,
  attributes: Record<string, string>,
): string {
  return source.replace(
    /\{(\d+)(?:_([UL]))?}/g,
    (match: string, index: string, transform: string | undefined): string => {
      const value = attributes[`arg${index}`];
      if (value === undefined) {
        return match;
      }
      if (transform === "U") {
        return value.toUpperCase();
      }
      if (transform === "L") {
        return value.toLowerCase();
      }
      return value;
    },
  );
}

function calloutNumber(
  attributes: Record<string, string>,
  positional: string[],
): string {
  const number =
    attributes.number ||
    attributes.callout ||
    positional[1] ||
    positional[0] ||
    "";
  return /^\d+$/.test(number) ? number : "";
}

function commonSnippetPath(guidesDirectory: string, target: string): string {
  return path.join(
    guidesDirectory,
    "src",
    "docs",
    "common",
    "snippets",
    `common-${ensureSuffix(target.trim(), ".adoc")}`,
  );
}

function externalPath(guidesDirectory: string, target: string): string {
  return path.join(
    guidesDirectory,
    "guides",
    ensureSuffix(target.trim(), ".adoc"),
  );
}

function ensureSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value : `${value}${suffix}`;
}

function replacePlaceholders(
  source: string,
  context: GuideRenderContext,
): string {
  let text = source
    .replaceAll("{githubSlug}", context.guide.slug)
    .replaceAll("@guideTitle@", context.guide.title)
    .replaceAll("@guideIntro@", context.guide.intro)
    .replaceAll("@micronaut@", context.version)
    .replaceAll("@micronautVersion@", context.version)
    .replaceAll("@language@", context.option.languageLabel)
    .replaceAll("@lang@", context.option.language)
    .replaceAll("@build@", context.option.buildTool)
    .replaceAll("@testFramework@", context.option.testFramework)
    .replaceAll("@authors@", context.guide.authors.join(", "))
    .replaceAll(
      "@languageextension@",
      languageExtension(context.option.language),
    )
    .replaceAll(
      "@testsuffix@",
      context.option.testFramework === "spock" ? "Spec" : "Test",
    )
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll(
      "@minJdk@",
      String(context.guide.minimumJavaVersion || DEFAULT_MIN_JDK),
    )
    .replaceAll("@api@", coreApiBaseUri);
  for (const [artifactId, version] of Object.entries(
    context.dependencyVersions,
  )) {
    text = text.replaceAll(`@${artifactId}Version@`, version);
  }

  text = rewriteIncludeTargets(text, context);
  text = text.replace(
    /@([\w-]*):?cli-command@/g,
    (_match: string, appName: string): string =>
      cliCommandForApp(findApp(context.guide, appName || "default")),
  );
  text = text.replace(
    /@([\w-]*):?features@/g,
    (_match: string, appName: string): string =>
      appFeatures(context.guide, context.option, appName || "default").join(
        ",",
      ),
  );
  text = text.replace(
    /@([\w-]*):?features-words@/g,
    (_match: string, appName: string): string =>
      featuresWords(
        appFeatures(context.guide, context.option, appName || "default"),
      ),
  );
  return text;
}

function rewriteIncludeTargets(
  source: string,
  context: GuideRenderContext,
): string {
  return source.replace(
    /^include::([^\[]+)\[([^\]]*)]/gm,
    (match: string, target: string, attributes: string): string => {
      const resolved = resolveGuideIncludeTarget(target, context);
      return resolved ? `include::${resolved}[${attributes}]` : match;
    },
  );
}

function resolveGuideIncludeTarget(
  target: string,
  context: GuideRenderContext,
): string {
  const normalized = target
    .replaceAll("\\", "/")
    .replaceAll("@sourceDir@", context.option.sourceDir)
    .replaceAll("@lang@", context.option.language)
    .replaceAll(
      "@languageextension@",
      languageExtension(context.option.language),
    );
  for (const candidate of includeTargetCandidates(normalized, context)) {
    const found = findExistingIncludeTarget(candidate, context);
    if (found) {
      return found;
    }
  }
  return "";
}

function includeTargetCandidates(
  target: string,
  context: GuideRenderContext,
): string[] {
  const candidates = [target];
  const withoutAttributeRoot = target.replace(/^\{sourceDir}\//, "");
  candidates.push(withoutAttributeRoot);

  const prefixedOption = `${context.guide.slug}/${context.option.sourceDir}/`;
  if (withoutAttributeRoot.startsWith(prefixedOption)) {
    candidates.push(withoutAttributeRoot.slice(prefixedOption.length));
  }

  const prefixedSlug = `${context.guide.slug}/`;
  if (withoutAttributeRoot.startsWith(prefixedSlug)) {
    candidates.push(withoutAttributeRoot.slice(prefixedSlug.length));
  }

  const languageRoots = languageDirectoryRoots(context.option.language);
  for (const candidate of [...candidates]) {
    if (languageRoots.some((root) => candidate.startsWith(`${root}/`))) {
      candidates.push(`${context.option.language}/${candidate}`);
    }
  }

  return [...new Set(candidates.filter(Boolean))];
}

function findExistingIncludeTarget(
  candidate: string,
  context: GuideRenderContext,
): string {
  if (path.isAbsolute(candidate) && existsSync(candidate)) {
    return candidate.replaceAll(path.sep, "/");
  }
  for (const root of [context.guide.directory, ...guideSourceRoots(context)]) {
    const file = path.join(root, candidate);
    if (existsSync(file)) {
      return path
        .relative(context.guide.directory, file)
        .replaceAll(path.sep, "/");
    }
  }
  return "";
}

function findApp(
  guide: GuideRenderContext["guide"],
  appName: string,
): GuideRenderContext["guide"]["apps"][number] | undefined {
  return guide.apps.find((app) => app.name === appName) || guide.apps[0];
}
