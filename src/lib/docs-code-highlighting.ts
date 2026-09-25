import * as parse5 from "parse5";
import { codeToHtml } from "shiki";
import type { DefaultTreeAdapterMap } from "parse5";

import { normalizePropertiesAssignmentHighlighting } from "./properties-highlight-normalization.ts";

type HighlightableVariant = {
  bodyCode?: string;
  code: string;
  importsCode?: string;
  highlightedHtml?: string;
  highlighterLanguage?: string;
  language: string;
};

type HighlightableExample = {
  variants: HighlightableVariant[];
};

const shikiThemes = {
  light: "github-light-default",
  dark: "github-dark-default",
} as const;
const calloutMarkerPrefix = "__MICRONAUT_CALLOUT_";
const calloutMarkerSuffix = "__";

// Docs and guides language names that differ from the Shiki grammar name.
// HOCON has no Shiki grammar; the properties grammar is the closest match.
const shikiLanguageAliases: Record<string, string> = {
  bash: "shellscript",
  cmd: "shellscript",
  commandline: "shellscript",
  conf: "properties",
  console: "shellscript",
  gradle: "kotlin",
  "gradle-groovy": "groovy",
  "gradle-kotlin": "kotlin",
  graphqls: "graphql",
  "groovy-config": "groovy",
  hocon: "properties",
  "json-config": "json",
  maven: "xml",
  mysql: "sql",
  plaintext: "text",
  pom: "xml",
  properties: "properties",
  props: "properties",
  sh: "shellscript",
  shell: "shellscript",
  text: "text",
  toml: "toml",
  txt: "text",
  yaml: "yaml",
  yml: "yaml",
  zsh: "shellscript",
};

export async function highlightCodeSnippetHtml(code: string, language: string) {
  let highlighted: string;
  const markedCode = encodeCalloutMarkers(code.trimEnd());
  try {
    highlighted = await codeToHtml(markedCode, {
      lang: shikiLanguage(language),
      themes: shikiThemes,
    });
  } catch {
    highlighted = await codeToHtml(markedCode, {
      lang: "text",
      themes: shikiThemes,
    });
  }

  const codeHtml = extractCodeHtml(highlighted);
  return dropBaseColorTokenSpans(
    normalizePropertiesHighlighting(codeHtml, language),
    highlighted,
  )
    .replace(/&#x3C;(\d+)>/g, '<i class="conum" data-value="$1"></i>')
    .replace(
      new RegExp(`${calloutMarkerPrefix}(\\d+)${calloutMarkerSuffix}`, "g"),
      '<i class="conum" data-value="$1"></i>',
    );
}

export async function highlightCodeSnippetVariants<
  T extends HighlightableVariant,
>(variants: T[]) {
  return Promise.all(
    variants.map(async (variant) => {
      const language = variant.highlighterLanguage || variant.language;
      return {
        ...variant,
        highlightedHtml: await highlightCodeSnippetHtml(
          variant.bodyCode ?? variant.code,
          language,
        ),
        ...(variant.importsCode
          ? {
              highlightedImportsHtml: await highlightCodeSnippetHtml(
                variant.importsCode,
                language,
              ),
            }
          : {}),
      };
    }),
  );
}

export async function highlightCodeSnippetExamples<
  T extends HighlightableExample,
>(examples: T[]) {
  return Promise.all(
    examples.map(async (example) => ({
      ...example,
      variants: await highlightCodeSnippetVariants(example.variants),
    })),
  );
}

export function shikiLanguage(language: string) {
  const normalized = String(language || "text")
    .trim()
    .toLowerCase();
  return shikiLanguageAliases[normalized] || normalized || "text";
}

function normalizePropertiesHighlighting(
  highlightedHtml: string,
  language: string,
) {
  if (shikiLanguage(language) !== "properties") {
    return highlightedHtml;
  }
  return normalizePropertiesAssignmentHighlighting(highlightedHtml);
}

/**
 * Shiki wraps every token, including the ones it paints the block's own
 * foreground: on the Core guide that is 27,083 of 60,221 spans, a fifth of the
 * page's DOM, around text that already renders that way. The colours come from
 * the `<pre>` Shiki emits, so this stays right when the themes change, and the
 * unwrapped text inherits `--code-foreground` from `.docs-highlighted-pre`.
 */
function dropBaseColorTokenSpans(codeHtml: string, highlighted: string) {
  const base = styleDeclarations(
    /<pre\b[^>]*\sstyle="([^"]*)"/.exec(highlighted)?.[1] || "",
  );
  const baseColors = tokenColors(base);
  if (!baseColors) {
    return codeHtml;
  }
  return codeHtml.replace(
    /<span style="([^"]*)">([^<]*)<\/span>/g,
    (match: string, style: string, text: string) => {
      // Only a plain colour pair is dropped: an italic comment keeps its span
      // even when the theme paints it the base colour.
      const declarations = styleDeclarations(style);
      return declarations.size === 2 && tokenColors(declarations) === baseColors
        ? text
        : match;
    },
  );
}

function styleDeclarations(style: string) {
  return new Map(
    style
      .split(";")
      .map((declaration) => declaration.split(":"))
      .filter((parts) => parts.length === 2)
      .map(([name, value]) => [
        name.trim().toLowerCase(),
        value.trim().toLowerCase(),
      ]),
  );
}

function tokenColors(declarations: Map<string, string>) {
  const color = declarations.get("color");
  const dark = declarations.get("--shiki-dark");
  return color && dark ? `${color} ${dark}` : undefined;
}

function extractCodeHtml(source: string) {
  const fragment = parse5.parseFragment(source);
  const code = firstDescendant(
    fragment,
    (node): node is DefaultTreeAdapterMap["element"] =>
      "tagName" in node && node.tagName === "code",
  );
  if (!code) {
    return "";
  }
  return code.childNodes.map((child) => serializeNode(child)).join("");
}

// Callout markers are hidden from the grammar as plain identifiers and turned
// back into `<i class="conum">` after highlighting. XML sources write them as
// comments (`<!--1-->`) so the marker does not break the markup.
function encodeCalloutMarkers(source: string) {
  return source.replace(
    /<!--(\d+)-->|<(\d+)>/g,
    (_match, commentNumber: string, angleNumber: string) =>
      `${calloutMarkerPrefix}${commentNumber || angleNumber}${calloutMarkerSuffix}`,
  );
}

function firstDescendant<T extends DefaultTreeAdapterMap["node"]>(
  node: DefaultTreeAdapterMap["node"],
  predicate: (node: DefaultTreeAdapterMap["node"]) => node is T,
): T | undefined {
  if (predicate(node)) {
    return node;
  }
  if (!("childNodes" in node)) {
    return undefined;
  }
  for (const child of node.childNodes) {
    const found = firstDescendant(child, predicate);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function serializeNode(node: DefaultTreeAdapterMap["childNode"]) {
  return parse5.serialize({
    childNodes: [node],
    nodeName: "#document-fragment",
  });
}
