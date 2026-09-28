import assert from "node:assert/strict";

import * as parse5 from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import { escapeRegExp } from "../../shared/html.ts";

type Node = DefaultTreeAdapterMap["node"];
type Element = DefaultTreeAdapterMap["element"];

export type SnippetCallout = { number: string; text: string };

export type SnippetPanel = { language: string; code: string };

// The semantic view of one rendered snippet card, so tests can assert on what
// a reader sees (title, tabs, code, callouts) instead of on markup.
export type SnippetCard = {
  id: string;
  kind: string;
  title: string;
  description: string;
  tabs: string[];
  panels: SnippetPanel[];
  activeCode: string;
  callouts: SnippetCallout[];
};

export function snippetCards(html: string): SnippetCard[] {
  const fragment = parse5.parseFragment(html);
  return elements(fragment)
    .filter((element) => attribute(element, "data-snippet-kind") !== undefined)
    .map((card) => {
      const header = externalHeader(card);
      const externalTitle =
        header && hasClass(header, "docs-snippet-external-title")
          ? text(header).trim()
          : "";
      const panels = elements(card)
        .filter((element) => attribute(element, "role") === "tabpanel")
        .map((panel) => {
          // Folded imports are a code block of their own ahead of the body.
          const codes = elements(panel).filter(
            (element) => element.tagName === "code",
          );
          return {
            language: (codes[0] && attribute(codes[0], "data-lang")) || "",
            code: codes
              .map((code) => text(code).trimEnd())
              .join("\n")
              .trimEnd(),
          };
        });
      const activePanel = elements(card).find(
        (element) =>
          attribute(element, "role") === "tabpanel" &&
          attribute(element, "aria-hidden") === "false",
      );
      return {
        id: attribute(card, "id") || "",
        kind: attribute(card, "data-snippet-kind") || "",
        title:
          externalTitle ||
          headerText(header, "docs-snippet-external-header-title") ||
          classText(card, "docs-snippet-heading"),
        description:
          headerText(header, "docs-snippet-external-header-description") ||
          classText(card, "docs-snippet-description"),
        tabs: elements(card)
          .filter((element) => attribute(element, "role") === "tab")
          .map((tab) => classText(tab, "docs-code-language-text")),
        panels,
        activeCode: activePanel
          ? (panels[
              elements(card)
                .filter((element) => attribute(element, "role") === "tabpanel")
                .indexOf(activePanel)
            ]?.code ?? "")
          : "",
        callouts: elements(card)
          .filter((element) => hasClass(element, "docs-code-callouts"))
          .flatMap(calloutItems),
      };
    });
}

// Manual callouts that the guide pipeline renders inline after a card.
export function manualCallouts(html: string): string[] {
  const fragment = parse5.parseFragment(html);
  return elements(fragment)
    .filter((element) => hasClass(element, "asciidoc-manual-callouts"))
    .flatMap((list) =>
      elements(list)
        .filter((element) => element.tagName === "li")
        .map((item) => text(item).trim()),
    );
}

/** The text of each admonition block, in document order. */
export function admonitions(html: string): string[] {
  const fragment = parse5.parseFragment(html);
  return elements(fragment)
    .filter((element) => hasClass(element, "admonitionblock"))
    .map((element) =>
      elements(element)
        .filter((child) => hasClass(child, "content"))
        .map((content) => text(content).replace(/\s+/g, " ").trim())
        .join(" "),
    );
}

export function textOnly(value: string): string {
  return text(parse5.parseFragment(value)).replace(/\s+/g, " ").trim();
}

export function count(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length || 0;
}

// One entry per highlighted source line, with callout markers rendered as
// `<N>` so tests can assert their position.
export function highlightedLines(html: string): string[] {
  const fragment = parse5.parseFragment(html);
  return elements(fragment)
    .filter((element) => hasClass(element, "line"))
    .map((line) => text(line));
}

export function buttonHtmlForLanguage(value: string, language: string): string {
  const dataLangIndex = value.indexOf(`data-lang="${language}"`);
  if (dataLangIndex < 0) {
    return "";
  }
  const buttonStart = value.lastIndexOf("<button", dataLangIndex);
  const buttonEnd = value.indexOf("</button>", dataLangIndex);
  if (buttonStart < 0 || buttonEnd < 0) {
    return "";
  }
  return value.slice(buttonStart, buttonEnd + "</button>".length);
}

export function assertSnippetLanguageIcon(
  source: string,
  language: string,
  icon: string,
): void {
  assert.match(
    buttonHtmlForLanguage(source, language),
    new RegExp(`docs-code-language-icon-${escapeRegExp(icon)}`),
    `${language} snippets should use the ${icon} icon`,
  );
}

export function assertNoRuntimeGeneratedRendering(
  label: string,
  source: string,
): void {
  assert.doesNotMatch(
    source,
    /renderSharedSnippetCard|renderSharedPropertiesCard|enhanceCodeSnippets|enhanceStandaloneCodeBlocks|docsSnippetTemplates|renderDocsSnippetTemplates/,
    `${label} must not render generated snippet or properties cards at runtime`,
  );
  assert.doesNotMatch(
    source,
    /codeToHtml|createHighlighter|getHighlighter|codeToTokens|from ["'](?:shiki|@shikijs\/[^"']+)["']|import\(["'](?:shiki|@shikijs\/[^"']+)["']\)/,
    `${label} must not highlight generated code at runtime`,
  );
}

// Asciidoctor renders a callout list as a table when `icons` is `font` and as
// an ordered list otherwise; the docs renderer uses the latter.
function calloutItems(footer: Element): SnippetCallout[] {
  const rows = elements(footer).filter((element) => element.tagName === "tr");
  if (rows.length) {
    return rows.map((row) => {
      const cells = row.childNodes.filter(
        (child): child is Element =>
          "tagName" in child && child.tagName === "td",
      );
      const marker = cells[0] && elements(cells[0]).find(isConum);
      return {
        number: marker ? attribute(marker, "data-value") || "" : "",
        text: collapse(cells[1] ? text(cells[1]) : ""),
      };
    });
  }
  return elements(footer)
    .filter((element) => element.tagName === "li")
    .map((item, index) => ({
      number: String(index + 1),
      text: collapse(text(item)),
    }));
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function externalHeader(card: Element): Element | undefined {
  const siblings = card.parentNode?.childNodes || [];
  for (let index = siblings.indexOf(card) - 1; index >= 0; index -= 1) {
    const sibling = siblings[index];
    if (!("tagName" in sibling)) {
      continue;
    }
    // A card with a title and a description gets a header block; a bare
    // title renders as a single title element.
    return hasClass(sibling, "docs-snippet-external-header") ||
      hasClass(sibling, "docs-snippet-external-title")
      ? sibling
      : undefined;
  }
  return undefined;
}

function headerText(header: Element | undefined, className: string): string {
  return header ? classText(header, className) : "";
}

function classText(root: Element, className: string): string {
  const element = elements(root).find((candidate) =>
    hasClass(candidate, className),
  );
  return element ? text(element).trim() : "";
}

function isConum(element: Element): boolean {
  return element.tagName === "i" && hasClass(element, "conum");
}

function text(node: Node): string {
  if ("value" in node && node.nodeName === "#text") {
    return node.value;
  }
  if ("tagName" in node && isConum(node)) {
    return `<${attribute(node, "data-value") || ""}>`;
  }
  return "childNodes" in node ? node.childNodes.map(text).join("") : "";
}

function elements(node: Node): Element[] {
  if (!("childNodes" in node)) {
    return [];
  }
  return node.childNodes.flatMap((child) =>
    "tagName" in child ? [child, ...elements(child)] : [],
  );
}

function attribute(element: Element, name: string): string | undefined {
  return element.attrs.find((candidate) => candidate.name === name)?.value;
}

function hasClass(element: Element, className: string): boolean {
  return (attribute(element, "class") || "").split(/\s+/).includes(className);
}
