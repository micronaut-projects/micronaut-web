import { createHash } from "node:crypto";
import { existsSync, promises as fs } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Block, Reader, Section } from "@asciidoctor/core";
import type { OnResolveArgs, PluginBuild } from "esbuild";
import { build } from "esbuild";

import type { BlockBuilder } from "./define.ts";
import { docsSnippetLanguageLabel } from "../../../src/components/web/docs-snippet-icons.ts";
import { highlightCodeSnippetHtml } from "../../../src/lib/docs-code-highlighting.ts";
import { splitLeadingImports } from "../../../src/lib/leading-imports.ts";
import { html } from "../../shared/html.ts";
import {
  type CalloutItem,
  type CalloutReader,
  calloutNumberFromLine,
  isCalloutListItem,
  readCalloutListItems,
  readLeadingBlankLines,
} from "../callouts.ts";
import { record } from "./macro-attributes.ts";
import { documentRenderIdSeed } from "../../shared/render-id-seed.ts";
import { normalizeStandaloneCalloutLines } from "../../shared/highlight.ts";

const projectDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
);
const MANUAL_CALLOUTS_CLASS = "asciidoc-manual-callouts";

let componentRendererPromise: Promise<ComponentRenderer> | undefined;

export type SnippetPayload = Record<string, unknown> & {
  description?: unknown;
  footerSource?: unknown;
  kind?: unknown;
  samples?: unknown;
  title?: unknown;
};

type SnippetKind = "code" | "dependency";

export type SnippetSample = {
  language: string;
  source: string;
  group?: string;
  highlighterLanguage?: string;
};

type NormalizedSnippetSample = SnippetSample;

type SnippetVariant = {
  active: boolean;
  highlightedHtml: string;
  /** The leading package and imports, highlighted apart to render folded. */
  highlightedImportsHtml?: string;
  importsSource?: string;
  label: string;
  language: string;
  panelId: string;
  source: string;
  tabId: string;
};

type ComponentRenderer = {
  renderGeneratedSnippet(
    input: Record<string, unknown>,
  ): Promise<string> | string;
};

const MISSING_SNIPPET_MESSAGE = "micronautMissingSnippetMessage";

/**
 * Stands in for a snippet the guide sources do not contain. It renders as a
 * NOTE admonition: as a code card the placeholder was published as though the
 * unresolved text were the sample the guide meant to show, down to a copy
 * button and a "Text" language tab.
 */
export function missingNotePayload(message: string): SnippetPayload {
  return { [MISSING_SNIPPET_MESSAGE]: message };
}

function missingSnippetMessage(payload: SnippetPayload): string | undefined {
  const message = payload[MISSING_SNIPPET_MESSAGE];
  return typeof message === "string" ? message : undefined;
}

export type SnippetRenderOptions = {
  // Where callout lines that follow the block are read from. Defaults to the
  // document reader, which is where a block macro's following lines live; a
  // block processor whose body carries the callouts passes its own reader.
  reader?: Reader | CalloutReader;
  // Callout items that do not match a marker in the snippet source are either
  // rendered inline after the card ("inline") or pushed back into the reader
  // so the document parses them as an ordinary list ("reader").
  manualCallouts?: "inline" | "reader";
};

type ComponentBlockProcessor = BlockBuilder;

type ComponentBlockNode = {
  blocks?: ComponentBlockNode[];
  convert?: () => Promise<string> | string;
  context?: string;
  getItems?: () => ComponentListItemNode[];
  precomputeReftext?: () => Promise<void>;
  precomputeTitle?: () => Promise<void>;
};

type ComponentListItemNode = {
  blocks?: ComponentBlockNode[];
  precomputeText?: () => Promise<void>;
};

export async function renderSnippetBlock(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  payload: SnippetPayload,
  options: SnippetRenderOptions = {},
): Promise<Block> {
  const reader =
    options.reader || (parent.document as { reader?: Reader }).reader;
  const manualCalloutLines: string[] = [];
  const payloadWithCallouts = await absorbFollowingCalloutLines(
    reader as CalloutReader | undefined,
    payload,
    options.manualCallouts === "inline"
      ? (lines: string[]): void => {
          manualCalloutLines.push(...lines);
        }
      : undefined,
  );
  const missingMessage = missingSnippetMessage(payloadWithCallouts);
  const bodyHtml = missingMessage
    ? await missingSnippetNoteHtml(processor, parent, missingMessage)
    : (
        await renderSnippetPayloadCards({
          footerHtml: await snippetFooterHtml(
            processor,
            parent,
            payloadWithCallouts,
          ),
          idSeed: snippetIdSeed(parent, reader, payloadWithCallouts),
          payload: payloadWithCallouts,
        })
      ).html;
  const manualCalloutHtml = await manualCalloutsHtml(
    processor,
    parent,
    manualCalloutLines,
  );
  return processor.createBlock(parent, "pass", bodyHtml + manualCalloutHtml, {
    role: "docs-snippet",
    subs: null,
  });
}

async function missingSnippetNoteHtml(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  message: string,
): Promise<string> {
  const holder = processor.createBlock(parent, "open", "", {});
  await processor.parseContent(holder, ["[NOTE]", "====", message, "===="]);
  await precomputeGeneratedInlineText(holder);
  return (
    await Promise.all(
      (holder.blocks || []).map(
        async (block: ComponentBlockNode): Promise<string> =>
          block.convert ? String(await block.convert()) : "",
      ),
    )
  ).join("\n");
}

async function renderSnippetPayloadCards({
  footerHtml,
  idSeed,
  payload,
}: {
  footerHtml: string;
  idSeed: string;
  payload: SnippetPayload;
}): Promise<{ html: string }> {
  const kind = payload.kind === "dependency" ? "dependency" : "code";
  const sampleGroups = groupedSnippetSamples(payload.samples, kind);
  const snippets: string[] = [];
  const baseId = `generated-docs-snippet-${snippetIdHash(idSeed, payload)}`;

  for (const [index, samples] of sampleGroups.entries()) {
    snippets.push(
      await renderSnippetCard({
        description: index === 0 ? payload.description || "" : "",
        footerHtml: index === sampleGroups.length - 1 ? footerHtml : "",
        id: sampleGroups.length > 1 ? `${baseId}-${index}` : baseId,
        kind,
        optionsLabel:
          kind === "dependency" ? "Dependency format" : "Code language",
        samples,
        title: index === 0 ? payload.title || "" : "",
      }),
    );
  }

  return { html: snippets.join("") };
}

export async function renderGeneratedSnippet(
  input: Record<string, unknown>,
): Promise<string> {
  const renderer = await loadComponentRenderer();
  return renderer.renderGeneratedSnippet(input);
}

export async function renderSnippetVariant({
  active,
  language,
  panelId,
  sample,
  tabId,
}: {
  active: boolean;
  language: string;
  panelId: string;
  sample: NormalizedSnippetSample;
  tabId: string;
}): Promise<SnippetVariant> {
  const displayLanguage = String(language || "text")
    .trim()
    .toLowerCase();
  const highlighterLanguage = sample.highlighterLanguage || displayLanguage;
  const { importsCode, bodyCode } = splitLeadingImports(sample.source || "");
  return {
    active,
    highlightedHtml: await highlightedCodeInnerHtml(
      bodyCode ?? sample.source ?? "",
      highlighterLanguage,
      displayLanguage,
    ),
    ...(importsCode
      ? {
          highlightedImportsHtml: await highlightedCodeInnerHtml(
            importsCode,
            highlighterLanguage,
            displayLanguage,
          ),
          importsSource: importsCode,
        }
      : {}),
    label: docsSnippetLanguageLabel(displayLanguage),
    language: displayLanguage,
    panelId,
    source: String(sample.source || "").trimEnd(),
    tabId,
  };
}

function loadComponentRenderer(): Promise<ComponentRenderer> {
  if (!componentRendererPromise) {
    componentRendererPromise = bundleComponentRenderer();
  }
  return componentRendererPromise;
}

async function bundleComponentRenderer(): Promise<ComponentRenderer> {
  const tempDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "micronaut-direct-snippet-renderer-"),
  );
  const outfile = path.join(tempDirectory, "docs-generated-snippet.cjs");
  try {
    await build({
      entryPoints: [
        path.join(
          projectDirectory,
          "src",
          "components",
          "web",
          "docs-generated-snippet.tsx",
        ),
      ],
      outfile,
      bundle: true,
      format: "cjs",
      jsx: "automatic",
      platform: "node",
      logLevel: "silent",
      plugins: [
        {
          name: "micronaut-web-alias",
          setup(buildContext: PluginBuild): void {
            buildContext.onResolve(
              { filter: /^@\// },
              (args: OnResolveArgs) => ({
                path: resolveSourceImport(args.path),
              }),
            );
          },
        },
      ],
    });
    const requireRendererBundle = createRequire(import.meta.url);
    return requireRendererBundle(outfile) as ComponentRenderer;
  } finally {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  }
}

function resolveSourceImport(specifier: string): string {
  const candidate = path.join(projectDirectory, "src", specifier.slice(2));
  for (const extension of ["", ".tsx", ".ts", ".jsx", ".js"]) {
    const resolved = `${candidate}${extension}`;
    if (existsSync(resolved)) {
      return resolved;
    }
  }
  return candidate;
}

function snippetIdHash(idSeed: string, payload: SnippetPayload): string {
  return createHash("sha1")
    .update(idSeed)
    .update("\0")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 12);
}

async function renderSnippetCard({
  description,
  footerHtml,
  id,
  kind,
  optionsLabel,
  samples,
  title,
}: {
  description: unknown;
  footerHtml: string;
  id: string;
  kind: SnippetKind;
  optionsLabel: string;
  samples: NormalizedSnippetSample[];
  title: unknown;
}): Promise<string> {
  return renderGeneratedSnippet({
    copyLabel: "Copy code",
    descriptionHtml: description ? inlineTitleHtml(description) : "",
    footerHtml,
    id,
    kind,
    optionsLabel,
    titleHtml: title ? inlineTitleHtml(title) : "",
    variants: await Promise.all(
      samples.map((sample, index) =>
        renderSnippetVariant({
          active: index === 0,
          language: sample.language || "text",
          panelId: `${id}-panel-${index}`,
          sample,
          tabId: `${id}-tab-${index}`,
        }),
      ),
    ),
  });
}

function groupedSnippetSamples(
  samples: unknown,
  kind: SnippetKind,
): NormalizedSnippetSample[][] {
  const normalizedSamples = normalizeSnippetSamples(samples);
  if (kind !== "code" || normalizedSamples.length < 2) {
    return [normalizedSamples];
  }

  if (normalizedSamples.every((sample) => sample.group)) {
    const groups = new Map<string, NormalizedSnippetSample[]>();
    for (const sample of normalizedSamples) {
      const group = sample.group || "";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)?.push(sample);
    }
    if (groups.size > 1) {
      return Array.from(groups.values());
    }
  }

  const languageCounts = new Map<string, number>();
  for (const sample of normalizedSamples) {
    const language = sample.language || "text";
    languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
  }
  if ([...languageCounts.values()].some((count) => count > 1)) {
    return normalizedSamples.map((sample) => [sample]);
  }
  return [normalizedSamples];
}

function normalizeSnippetSamples(samples: unknown): NormalizedSnippetSample[] {
  return (Array.isArray(samples) ? samples : []).map((value) => {
    const sample = record(value);
    return {
      language: String(sample.language || "text"),
      source: String(sample.source || "").trimEnd(),
      group: sample.group ? String(sample.group) : undefined,
      highlighterLanguage: sample.highlighterLanguage
        ? String(sample.highlighterLanguage)
        : undefined,
    };
  });
}

async function snippetFooterHtml(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  payload: SnippetPayload,
): Promise<string> {
  const footerLines = String(payload.footerSource || "")
    .split(/\r?\n/)
    .filter((line: string): boolean => Boolean(line.trim()));
  if (!footerLines.length) {
    return "";
  }

  const holder = processor.createBlock(parent, "open", "", {});
  const footerCalloutLines = footerLines.filter(isCalloutListItem);
  await processor.parseContent(holder, [
    "[source,text]",
    "----",
    ...footerCalloutLines.map((line: string): string => {
      const number = calloutNumberFromLine(line) || "1";
      return `callout ${number} <${number}>`;
    }),
    "----",
    ...footerLines,
  ]);
  const colist = holder.blocks?.find(isCalloutList);
  if (colist) {
    await precomputeGeneratedInlineText(colist);
  }
  return colist ? String(await colist.convert()) : "";
}

async function manualCalloutsHtml(
  processor: ComponentBlockProcessor,
  parent: Block | Section,
  lines: string[],
): Promise<string> {
  if (!lines.length) {
    return "";
  }
  const holder = processor.createBlock(parent, "open", "", {});
  await processor.parseContent(holder, lines);
  await precomputeGeneratedInlineText(holder);
  return (
    await Promise.all(
      (holder.blocks || []).map(
        async (block: ComponentBlockNode): Promise<string> =>
          block.convert ? String(await block.convert()) : "",
      ),
    )
  ).join("\n");
}

// The reader cursor is only unique within a single render. A docs page
// concatenates one render per table-of-contents node, so two sections that
// resolve the same snippet at the same cursor would otherwise hash to the same
// id; the per-render seed keeps them apart.
function snippetIdSeed(
  parent: Block | Section,
  reader: Reader | CalloutReader | undefined,
  payload: SnippetPayload,
): string {
  const cursor = (reader as { cursor?: Record<string, unknown> } | undefined)
    ?.cursor;
  return [
    documentRenderIdSeed(parent),
    cursor?.path || cursor?.file || "",
    cursor?.lineno || "",
    payload.kind || "",
    payload.title || "",
  ].join(":");
}

// Highlights with the same Shiki setup the main site uses; the display
// language decides whether standalone callout markers move onto the next
// property line before highlighting.
function highlightedCodeInnerHtml(
  source: unknown,
  highlighterLanguage: string,
  displayLanguage: string,
): Promise<string> {
  return highlightCodeSnippetHtml(
    normalizeStandaloneCalloutLines(
      String(source || "").trimEnd(),
      displayLanguage,
    ),
    highlighterLanguage,
  );
}

export async function precomputeGeneratedInlineText(
  node: ComponentBlockNode,
): Promise<void> {
  await node.precomputeTitle?.();
  await node.precomputeReftext?.();

  for (const item of node.getItems?.() || []) {
    await item.precomputeText?.();
    for (const block of item.blocks || []) {
      await precomputeGeneratedInlineText(block);
    }
  }

  for (const block of node.blocks || []) {
    await precomputeGeneratedInlineText(block);
  }
}

async function absorbFollowingCalloutLines(
  reader: CalloutReader | undefined,
  payload: SnippetPayload,
  collectManualCallouts: ((lines: string[]) => void) | undefined,
): Promise<SnippetPayload> {
  if (!reader) {
    return payload;
  }
  const leadingBlankLines = await readLeadingBlankLines(reader);
  const items = await readCalloutListItems(reader);

  if (!items.length) {
    reader.unshiftLines(leadingBlankLines);
    return payload;
  }

  const sourceNumbers = payloadCalloutNumbers(payload);
  const snippetItems = items.filter((item) => sourceNumbers.has(item.number));
  const manualItems = items.filter((item) => !sourceNumbers.has(item.number));
  if (manualItems.length) {
    const lines = manualCalloutBlockLines(manualItems);
    if (collectManualCallouts) {
      collectManualCallouts(lines);
    } else {
      reader.unshiftLines(lines);
    }
  }
  if (!snippetItems.length) {
    return payload;
  }

  const numberMap = new Map<string, string>();
  for (const item of snippetItems) {
    if (!numberMap.has(item.number)) {
      numberMap.set(item.number, String(numberMap.size + 1));
    }
  }

  return {
    ...payload,
    samples: renumberPayloadSamples(payload.samples, numberMap),
    footerSource: snippetItems
      .map((item) => replaceSourceCalloutNumbers(item.line, numberMap))
      .join("\n"),
  };
}

function payloadCalloutNumbers(payload: SnippetPayload): Set<string> {
  const numbers = new Set<string>();
  for (const sample of normalizeSnippetSamples(payload.samples)) {
    for (const match of sample.source.matchAll(/<(\d+)>|<!--(\d+)-->/g)) {
      numbers.add(match[1] || match[2]);
    }
  }
  return numbers;
}

function renumberPayloadSamples(
  samples: unknown,
  numberMap: Map<string, string>,
): NormalizedSnippetSample[] {
  return normalizeSnippetSamples(samples).map((sample) => ({
    ...sample,
    source: replaceSourceCalloutNumbers(sample.source || "", numberMap),
  }));
}

function replaceSourceCalloutNumbers(
  source: unknown,
  numberMap: Map<string, string>,
): string {
  return String(source).replace(
    /<(\d+)>|<!--(\d+)-->/g,
    (match: string, xmlNumber: string, commentNumber: string): string => {
      const nextNumber = numberMap.get(xmlNumber || commentNumber);
      if (!nextNumber) {
        return match;
      }
      return xmlNumber ? `<${nextNumber}>` : `<!--${nextNumber}-->`;
    },
  );
}

function manualCalloutBlockLines(items: CalloutItem[]): string[] {
  const lines = [`[.${MANUAL_CALLOUTS_CLASS}]`];
  for (const item of items) {
    const [firstLine = "", ...continuationLines] = item.text.split(/\r?\n/);
    lines.push(`. ${firstLine}`);
    lines.push(...continuationLines.map((line) => `  ${line}`));
  }
  lines.push("");
  return lines;
}

function isCalloutList(node: unknown): node is ComponentBlockNode {
  const candidate = node as ComponentBlockNode;
  return Boolean(
    node && typeof node === "object" && candidate.context === "colist",
  );
}

function inlineTitleHtml(value: unknown): string {
  return html(value).replace(
    /`([^`\r\n]+)`/g,
    (_match: string, code: string): string => `<code>${code}</code>`,
  );
}
