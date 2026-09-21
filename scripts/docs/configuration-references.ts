import { cleanSearchText } from "./search-index.ts";

/**
 * Every module's build publishes a `configurationreference.html` next to its
 * guide: one page of Asciidoctor sections, each holding "Configuration
 * Properties for <Owner>" tables with Property / Type / Description /
 * Default value columns. These types are that page, parsed.
 */
export interface ConfigurationReferenceRow {
  property: string;
  type: string;
  typeHref?: string;
  description: string;
  defaultValue: string;
}

export interface ConfigurationReferenceTable {
  /** The upstream table anchor, the owner's binary name old links target. */
  id?: string;
  owner?: string;
  ownerHref?: string;
  rows: ConfigurationReferenceRow[];
}

export interface ConfigurationReferenceSection {
  id: string;
  title: string;
  tables: ConfigurationReferenceTable[];
}

export interface ProjectConfigurationReference {
  sourceUrl: string;
  sections: ConfigurationReferenceSection[];
}

export type ConfigurationReferences = Record<
  string,
  ProjectConfigurationReference
>;

export function configurationReferenceRows(
  reference: ProjectConfigurationReference,
): ConfigurationReferenceRow[] {
  return reference.sections.flatMap((section) =>
    section.tables.flatMap((table) => table.rows),
  );
}

/**
 * The published page each module derives from `configurationreference.adoc`:
 * an h1, then h2/h3 sections per sub-module, each with configuration tables.
 * Tables ahead of any section heading land in a default section.
 */
export function parseConfigurationReference(
  html: string,
  baseUrl: string,
): ConfigurationReferenceSection[] {
  const sections: ConfigurationReferenceSection[] = [];
  const claimedIds = new Set<string>();
  let current: ConfigurationReferenceSection | undefined;
  let anchor: string | undefined;
  const partPattern =
    /<h([23])[^>]*>([\s\S]*?)<\/h\1>|<a id="([^"]+)"|<table\b[\s\S]*?<\/table>/g;
  for (const match of html.matchAll(partPattern)) {
    if (match[3]) {
      anchor = match[3];
      continue;
    }
    if (match[1]) {
      const title = cleanSearchText(match[2]);
      if (!title) {
        continue;
      }
      current = { id: sectionId(title, claimedIds), title, tables: [] };
      sections.push(current);
      continue;
    }
    const table = parseConfigurationTable(match[0], baseUrl, anchor);
    anchor = undefined;
    if (!table) {
      continue;
    }
    if (!current) {
      current = {
        id: sectionId("Configuration Properties", claimedIds),
        title: "Configuration Properties",
        tables: [],
      };
      sections.push(current);
    }
    current.tables.push(table);
  }
  return sections.filter((section) => section.tables.length > 0);
}

function parseConfigurationTable(
  tableHtml: string,
  baseUrl: string,
  id: string | undefined,
): ConfigurationReferenceTable | undefined {
  const caption = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(tableHtml)?.[1];
  if (caption && !/configuration properties/i.test(cleanSearchText(caption))) {
    return undefined;
  }
  const ownerLink = caption
    ? /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/.exec(caption)
    : undefined;
  const headerCells = cellsOf(
    /<thead\b[\s\S]*?<\/thead>/.exec(tableHtml)?.[0] || "",
    "th",
  ).map((cell) => cleanSearchText(cell).toLowerCase());
  const columnFor = (label: string, fallback: number) => {
    const index = headerCells.findIndex((cell) => cell.startsWith(label));
    return index >= 0 ? index : fallback;
  };
  const propertyColumn = columnFor("property", 0);
  const typeColumn = columnFor("type", 1);
  const descriptionColumn = columnFor("description", 2);
  const defaultColumn = columnFor("default", 3);

  const rows: ConfigurationReferenceRow[] = [];
  const body = /<tbody\b[\s\S]*?<\/tbody>/.exec(tableHtml)?.[0] || tableHtml;
  for (const row of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = cellsOf(row[1], "td");
    const property = cleanSearchText(cells[propertyColumn] || "");
    if (!property) {
      continue;
    }
    const typeCell = cells[typeColumn] || "";
    const typeHref = /<a\b[^>]*href="([^"]*)"/.exec(typeCell)?.[1];
    rows.push({
      property,
      type: cleanSearchText(typeCell),
      ...(typeHref ? { typeHref: absoluteUrl(typeHref, baseUrl) } : {}),
      description: cleanSearchText(cells[descriptionColumn] || ""),
      defaultValue: cleanSearchText(cells[defaultColumn] || ""),
    });
  }
  if (!rows.length) {
    return undefined;
  }
  return {
    ...(id ? { id } : {}),
    ...(ownerLink
      ? {
          owner: cleanSearchText(ownerLink[2]),
          ownerHref: absoluteUrl(ownerLink[1], baseUrl),
        }
      : {}),
    rows,
  };
}

function cellsOf(rowHtml: string, tag: "td" | "th"): string[] {
  return Array.from(
    rowHtml.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "g")),
    (cell) => cell[1],
  );
}

function absoluteUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

function sectionId(title: string, claimedIds: Set<string>): string {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  let id = base;
  let suffix = 2;
  while (claimedIds.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  claimedIds.add(id);
  return id;
}
