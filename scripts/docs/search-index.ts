import { projectApiBaseUri, projectPagesUri } from "../asciidoc/api-links.ts";
import { decodeHtml } from "../shared/html.ts";
import {
  configurationReferenceRows,
  type ConfigurationReferences,
} from "./configuration-references.ts";

const MAX_GENERATED_ITEMS_PER_PROJECT = 1200;

export interface SearchProject {
  slug: string;
  displayName: string;
  href?: string;
  shortName?: string;
  projectKey?: string;
  module?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  shortDescription?: string;
  longDescription?: string;
  publishedGuideUrl?: string;
  version?: string;
  searchTerms?: string[];
  sections?: SearchSection[];
}

export interface ReferenceLinkProject {
  slug?: string;
  repositoryName?: string;
  publishedGuideUrl?: string;
  docsSourceFile?: string;
  derivedFrom?: string;
  version?: string;
}

/**
 * The published `configurationreference.html` lives next to the project's
 * javadoc on its GitHub Pages site. Derived from the repository rather than
 * `publishedGuideUrl` because core's guide is served from docs.micronaut.io,
 * which does not carry the configuration reference (it 404s there).
 */
export function configurationReferenceUrl(
  project: ReferenceLinkProject,
): string | undefined {
  // A project documented as a single page publishes no guide, so there is no
  // configuration reference sitting next to one either.
  if (project.docsSourceFile) {
    return undefined;
  }
  // A project split out of another one shares that project's published
  // reference, which stays with the project that owns the repository rather
  // than being collected twice.
  if (project.derivedFrom) {
    return undefined;
  }
  if (project.repositoryName) {
    return `${projectPagesUri({ project })}/latest/guide/configurationreference.html`;
  }
  return project.publishedGuideUrl
    ? new URL("configurationreference.html", project.publishedGuideUrl).href
    : undefined;
}

/**
 * A project's API and configuration reference links.
 *
 * The configuration link appears only with `localConfigurationReference`, so
 * it always opens this site's own per-module page. Modules nothing was
 * collected for — Test, Test Resources, SourceGen and the other build-time
 * ones — used to link the upstream `configurationreference.html` instead, and
 * that page is the reason nothing was collected: it publishes no properties.
 * Shared by the docs pages' corner links and the search index.
 */
export function projectReferenceLinks(
  project: ReferenceLinkProject,
  { localConfigurationReference = false } = {},
) {
  return [
    // Derived from the repository the same way the `api:` macros resolve
    // javadoc links: the published guide is not always a sibling of the API
    // documentation, and for a single-page project there is no guide at all.
    { label: "API Reference", href: `${projectApiBaseUri({ project })}/` },
    ...(localConfigurationReference
      ? [
          {
            label: "Configuration Reference",
            href: `/docs/${project.slug}/configuration-reference/`,
          },
        ]
      : []),
  ];
}

interface SearchSection {
  id: string;
  number?: string;
  title: string;
  summary?: string;
}

export interface SearchItem {
  kind: string;
  title: string;
  description: string;
  href: string;
  terms: string;
  scope: string;
  weight?: number;
}

export function buildDocsSearchIndex(
  projects: SearchProject[],
  generatedHtmlBySlug: Record<string, string> = {},
  configurationReferences: ConfigurationReferences = {},
): SearchItem[] {
  const items: SearchItem[] = [];
  const seen = new Set<string>();

  pushItem(items, seen, {
    kind: "Docs",
    title: "Configuration Reference",
    description:
      "Every documented configuration property across Micronaut modules, unified into one searchable reference.",
    href: "/docs/configuration-reference/",
    terms:
      "configuration reference properties settings options unified all modules",
    scope: "Docs",
    weight: 2,
  });

  for (const project of projects) {
    pushItem(items, seen, {
      kind: "Project",
      title: project.displayName,
      description:
        project.shortDescription ||
        project.longDescription ||
        project.module ||
        "Micronaut project documentation.",
      href: project.href || `/docs/${project.slug}/`,
      terms: [
        project.displayName,
        project.shortName,
        project.projectKey,
        project.module,
        project.repositoryName,
        project.shortDescription,
        project.longDescription,
        ...(project.searchTerms || []),
      ]
        .filter(Boolean)
        .join(" "),
      scope: "Projects",
    });

    for (const section of project.sections || []) {
      pushItem(items, seen, {
        kind: "Docs",
        title: `${project.displayName}: ${section.title}`,
        description:
          section.summary || `${project.displayName} documentation section.`,
        href: `${project.href || `/docs/${project.slug}/`}#${section.id}`,
        terms: [
          project.displayName,
          section.number,
          section.title,
          section.summary,
        ]
          .filter(Boolean)
          .join(" "),
        scope: "Docs",
      });
    }

    if (project.repositoryUrl) {
      pushItem(items, seen, {
        kind: "Repo",
        title: project.repositoryName || `${project.displayName} repository`,
        description: `Source repository for ${project.displayName}.`,
        href: project.repositoryUrl,
        terms: [
          project.displayName,
          project.repositoryName,
          project.repositoryUrl,
          project.module,
        ]
          .filter(Boolean)
          .join(" "),
        scope: "Repos",
      });
    }

    const configurationReference = configurationReferences[project.slug];
    for (const reference of projectReferenceLinks(project, {
      localConfigurationReference: Boolean(configurationReference),
    })) {
      pushItem(items, seen, {
        kind: "Docs",
        title: `${project.displayName}: ${reference.label}`,
        description:
          reference.label === "API Reference"
            ? `Published API documentation for ${project.displayName}.`
            : `Every documented configuration property of ${project.displayName}.`,
        href: reference.href,
        terms: [
          project.displayName,
          project.projectKey,
          project.module,
          reference.label,
          "javadoc api configuration reference",
        ]
          .filter(Boolean)
          .join(" "),
        scope: "Docs",
      });
    }

    // The collected configuration reference lists every property of the
    // module; the guide tables only mention a few in passing, so they serve
    // as property items only for projects with nothing collected.
    if (configurationReference) {
      for (const row of configurationReferenceRows(configurationReference)) {
        pushItem(items, seen, {
          kind: "Property",
          title: row.property,
          description:
            [row.type, row.description].filter(Boolean).join(" - ") ||
            `${project.displayName} configuration property.`,
          href: `/docs/${project.slug}/configuration-reference/`,
          terms: [
            project.displayName,
            project.projectKey,
            project.module,
            row.property,
            row.type,
            row.description,
          ]
            .filter(Boolean)
            .join(" "),
          scope: "Properties",
        });
      }
    }

    const generatedItems = extractGeneratedDocSearchItems(
      project,
      generatedHtmlBySlug[project.slug] || "",
    ).filter((item) => !configurationReference || item.scope !== "Properties");
    for (const item of generatedItems.slice(
      0,
      MAX_GENERATED_ITEMS_PER_PROJECT,
    )) {
      pushItem(items, seen, item);
    }
  }

  return items;
}

export function extractGeneratedDocSearchItems(
  project: SearchProject,
  html: string,
): SearchItem[] {
  if (!html) {
    return [];
  }

  return [
    ...extractHeadingItems(project, html),
    ...extractPropertyItems(project, html),
    ...extractClassItems(project, html),
  ];
}

function extractHeadingItems(
  project: SearchProject,
  html: string,
): SearchItem[] {
  const items: SearchItem[] = [];
  const headingPattern =
    /<div class="guide-section-heading">\s*<h([12]) id="([^"]+)"><a class="anchor" href="#[^"]+"><\/a>([\s\S]*?)<\/h\1>/g;
  for (const match of html.matchAll(headingPattern)) {
    const label = cleanText(match[3]);
    if (!label) {
      continue;
    }
    items.push({
      kind: "Docs",
      title: `${project.displayName}: ${label}`,
      description:
        match[1] === "1"
          ? "Top-level generated documentation section."
          : "Generated documentation subsection.",
      href: `${project.href || `/docs/${project.slug}/`}#${match[2]}`,
      terms: [project.displayName, project.projectKey, project.module, label]
        .filter(Boolean)
        .join(" "),
      scope: "Docs",
      weight: match[1] === "1" ? 2 : 1,
    });
  }
  return items;
}

/**
 * Table rows of a generated module guide whose first cell reads as a
 * configuration property name, e.g. `micronaut.server.port`.
 */
export function extractConfigurationPropertyRows(
  html: string,
): { property: string; details: string[] }[] {
  const rows: { property: string; details: string[] }[] = [];
  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/g;

  for (const match of html.matchAll(rowPattern)) {
    const cells = Array.from(
      match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g),
      (cell: RegExpMatchArray): string => cleanText(cell[1]),
    );
    if (cells.length < 2) {
      continue;
    }
    const property = cells[0];
    if (!isConfigurationPropertyName(property)) {
      continue;
    }
    rows.push({ property, details: cells.slice(1).filter(Boolean) });
  }

  return rows;
}

function extractPropertyItems(
  project: SearchProject,
  html: string,
): SearchItem[] {
  return extractConfigurationPropertyRows(html).map(
    ({ property, details }) => ({
      kind: "Property",
      title: property,
      description:
        details.join(" - ") || `${project.displayName} configuration property.`,
      // The unified reference guarantees this anchor; the module page does not.
      href: `/docs/configuration-reference/#${project.slug}-configuration-reference`,
      terms: [
        project.displayName,
        project.projectKey,
        project.module,
        property,
        ...details,
      ]
        .filter(Boolean)
        .join(" "),
      scope: "Properties",
    }),
  );
}

function extractClassItems(project: SearchProject, html: string): SearchItem[] {
  const items: SearchItem[] = [];
  const linkPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  for (const match of html.matchAll(linkPattern)) {
    const href = attributeValue(match[1], "href");
    if (!href || !/\/api\/.+\.html(?:[#?][^"]*)?$/.test(href)) {
      continue;
    }
    const label = cleanText(match[2]);
    const className = classNameFromApiHref(href, label);
    if (!className) {
      continue;
    }
    items.push({
      kind: "Class",
      title: className,
      description: `${project.displayName} API reference.`,
      href: absoluteDocsHref(project, href),
      terms: [
        project.displayName,
        project.projectKey,
        project.module,
        className,
        label,
      ]
        .filter(Boolean)
        .join(" "),
      scope: "Classes",
    });
  }
  return items;
}

function pushItem(
  items: SearchItem[],
  seen: Set<string>,
  item: SearchItem,
): void {
  const key = `${item.scope}:${item.href}:${item.title}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  items.push(item);
}

function absoluteDocsHref(project: SearchProject, href: string): string {
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(href) || href.startsWith("//")) {
    return href;
  }
  const resolved = new URL(
    href,
    `https://example.test${project.href || `/docs/${project.slug}/`}`,
  );
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

function classNameFromApiHref(href: string, label: string): string {
  if (looksLikeClassName(label)) {
    return label;
  }
  const withoutHash = href.split(/[?#]/)[0];
  const file = withoutHash
    .slice(withoutHash.lastIndexOf("/") + 1)
    .replace(/\.html$/, "");
  return looksLikeClassName(file) ? file : "";
}

function looksLikeClassName(value: string): boolean {
  return /^[A-Z_$][\w$]*(?:\.[\w$]+)?(?:\([^)]*\))?$/.test(
    String(value || "").trim(),
  );
}

/**
 * Configuration keys are lowercase kebab-case segments joined by dots, e.g.
 * `micronaut.server.cors.configurations.*.allowed-origins`. Case-sensitive
 * and dot-required on purpose: the guides' tables also list Java class names
 * (`java.util.Optional`), camelCase examples (`myApp.myStuff`), and CLI
 * commands (`create-app`), none of which are properties.
 */
function isConfigurationPropertyName(value: string): boolean {
  return /^[a-z][a-z0-9-]*(?:\.[a-z0-9*[\]-]+)+$/.test(
    String(value || "").trim(),
  );
}

function attributeValue(source: string, name: string): string {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`);
  return pattern.exec(source)?.[1] || "";
}

/** Tag-stripped, entity-decoded, whitespace-collapsed element text. */
export function cleanSearchText(value: string): string {
  return decodeHtml(
    String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

const cleanText = cleanSearchText;
