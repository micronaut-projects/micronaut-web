import * as yaml from "js-yaml";
import { promises as fs } from "node:fs";
import path from "node:path";

import { isRegularFile } from "../shared/files.ts";
import type { GuideSectionSelection } from "./project-splits.ts";

type TocMap = Record<string, unknown>;

export type GuideToc = {
  title: string;
  children: TocNode[];
};

export async function readGuideToc(
  guideSourceDirectory: string,
  sections?: GuideSectionSelection,
): Promise<GuideToc> {
  const tocFile = path.join(guideSourceDirectory, "toc.yml");
  const parsed = yaml.load(await fs.readFile(tocFile, "utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`TOC YAML must be a map: ${tocFile}`);
  }
  const toc = selectTocSections(parsed as TocMap, sections, tocFile);

  const children: TocNode[] = [];
  await appendTocNodes(children, guideSourceDirectory, [], toc, 0, "");
  return {
    title: typeof toc.title === "string" ? toc.title : "",
    children: promoteChildren(children, sections?.promoteChildren),
  };
}

/**
 * Lifts the subsections of the named top-level sections to the top level,
 * right after the section they came from, and renumbers the result. Source
 * files are resolved before this, so a lifted section still reads from its
 * original directory.
 */
function promoteChildren(
  nodes: TocNode[],
  promoted: readonly string[] | undefined,
): TocNode[] {
  if (!promoted?.length) {
    return nodes;
  }
  const ids = new Set(promoted);
  const lifted = nodes.flatMap((node) =>
    ids.has(node.id) ? [{ ...node, children: [] }, ...node.children] : [node],
  );
  return lifted.map((node, index) => renumber(node, 0, String(index + 1)));
}

function renumber(node: TocNode, level: number, number: string): TocNode {
  return {
    ...node,
    level,
    number,
    children: node.children.map((child, index) =>
      renumber(child, level + 1, `${number}.${index + 1}`),
    ),
  };
}

/**
 * Raised when a guide has none of the sections a project selects from it. A
 * project split out of another one is a special case this site applies to
 * documentation it does not own, so its share of a guide can disappear
 * upstream without that being a broken render.
 */
export class MissingGuideSectionsError extends Error {}

/**
 * The top-level sections one project renders from a guide that is split
 * across projects. Numbering follows the selection, so each page reads like
 * the standalone guide it stands in for. Sections named by a selection but
 * missing from the guide are reported and skipped: upstream renames a section
 * without knowing this site divides the guide at all.
 */
function selectTocSections(
  toc: TocMap,
  sections: GuideSectionSelection | undefined,
  tocFile: string,
): TocMap {
  if (!sections) {
    return toc;
  }
  const selected = new Set(sections.sections);
  for (const id of selected) {
    if (!(id in toc)) {
      console.warn(`TOC section '${id}' is not in ${tocFile}`);
    }
  }
  const filtered = Object.fromEntries(
    Object.entries(toc).filter(
      ([id]) =>
        id === "title" || selected.has(id) === (sections.mode === "include"),
    ),
  );
  if (!Object.keys(filtered).some((id) => id !== "title")) {
    throw new MissingGuideSectionsError(
      `No TOC section of ${tocFile} matches ${sections.mode} ${[...selected].join(", ")}`,
    );
  }
  return filtered;
}

export type TocNode = {
  level: number;
  number: string;
  id: string;
  title: string;
  file: string;
  children: TocNode[];
};

async function appendTocNodes(
  target: TocNode[],
  guideSourceDirectory: string,
  parentIds: string[],
  toc: TocMap,
  level: number,
  numberPrefix: string,
): Promise<void> {
  let index = 1;
  for (const [rawId, value] of Object.entries(toc)) {
    const id = tocKey(rawId);
    if (id === "title") {
      continue;
    }

    const number = numberPrefix ? `${numberPrefix}.${index}` : String(index);
    const title = tocTitle(id, value);
    const file = await determineFilePath(guideSourceDirectory, parentIds, id);
    const pathIds = [...parentIds, id];
    const children: TocNode[] = [];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const childSections = { ...(value as TocMap) };
      delete childSections.title;
      await appendTocNodes(
        children,
        guideSourceDirectory,
        pathIds,
        childSections,
        level + 1,
        number,
      );
    }

    target.push({ level, number, id, title, file, children });
    index += 1;
  }
}

function tocKey(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  throw new Error("TOC section keys must be non-blank strings.");
}

function tocTitle(id: string, value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const map = value as TocMap;
    if (typeof map.title === "string" && map.title.trim()) {
      return map.title.trim();
    }
    throw new Error(`TOC section '${id}' must define a non-blank title.`);
  }
  throw new Error(`TOC section '${id}' must be a string or map.`);
}

async function determineFilePath(
  guideSourceDirectory: string,
  parentIds: string[],
  id: string,
): Promise<string> {
  let filePath = `${id}.adoc`;
  if (await isRegularFile(path.join(guideSourceDirectory, filePath))) {
    return filePath;
  }
  for (let depth = 1; depth <= parentIds.length; depth += 1) {
    filePath = path.join(...parentIds.slice(0, depth), `${id}.adoc`);
    if (await isRegularFile(path.join(guideSourceDirectory, filePath))) {
      return filePath;
    }
  }
  throw new Error(
    `Missing guide source file for TOC section '${id}' under ${guideSourceDirectory}`,
  );
}
