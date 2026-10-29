import type { DocsProject } from "./project-manifest.ts";

/**
 * The prototype's one special case: Micronaut Core publishes the HTTP server
 * and client documentation inside its own guide, and the framework is moving
 * that documentation into a module of its own. Until it does, the site renders
 * the single upstream guide as two docs projects — `core` and `http` — so both
 * read, link, and are searched exactly like the separate projects they are
 * about to become.
 *
 * Nothing upstream changes: the derived project shares the source project's
 * repository, branch, module coordinates and version, and only the guide's
 * top-level table-of-contents sections are divided between the two pages.
 */
export type DocsProjectSplit = {
  /** The project whose guide sources both pages are rendered from. */
  sourceSlug: string;
  /** The project the listed sections are rendered as instead. */
  derived: Pick<DocsProject, "slug" | "displayName" | "projectKey">;
  /** Top-level TOC section ids the derived project takes over. */
  sections: readonly string[];
  /**
   * Sections of the derived project whose subsections it lists as top-level
   * sections of their own, keeping the section itself as an introduction.
   */
  promoteChildren?: readonly string[];
};

export const DOCS_PROJECT_SPLITS: readonly DocsProjectSplit[] = [
  {
    sourceSlug: "core",
    derived: {
      slug: "http",
      displayName: "Micronaut HTTP",
      projectKey: "http",
    },
    sections: ["httpServer", "httpClient", "certificates"],
    promoteChildren: ["httpServer", "httpClient"],
  },
];

/** How a project selects its share of a guide's top-level TOC sections. */
export type GuideSectionSelection = {
  mode: "include" | "exclude";
  sections: string[];
  /** Selected sections whose subsections move up to the top level. */
  promoteChildren?: string[];
};

/**
 * Expands the split projects into the project list: the source project is
 * narrowed to the sections it keeps, and the derived project is appended
 * beside it. Idempotent, so a project list that already contains a derived
 * project — a catalog read back from disk, for instance — is re-derived from
 * the split definition rather than doubled.
 */
export function splitDocsProjects(
  projects: DocsProject[],
  splits: readonly DocsProjectSplit[] = DOCS_PROJECT_SPLITS,
): DocsProject[] {
  const derivedSlugs = new Set(splits.map((split) => split.derived.slug));
  const expanded: DocsProject[] = [];
  for (const project of projects) {
    if (derivedSlugs.has(project.slug) || project.derivedFrom) {
      continue;
    }
    const split = splits.find(
      (candidate) => candidate.sourceSlug === project.slug,
    );
    if (!split) {
      expanded.push(project);
      continue;
    }
    expanded.push(
      {
        ...project,
        guideSections: { mode: "exclude", sections: [...split.sections] },
      },
      derivedProject(project, split),
    );
  }
  return expanded;
}

/** The slugs one split renders onto separate pages, source project first. */
export function splitProjectSlugs(
  splits: readonly DocsProjectSplit[] = DOCS_PROJECT_SPLITS,
): string[][] {
  return splits.map((split) => [split.sourceSlug, split.derived.slug]);
}

function derivedProject(
  source: DocsProject,
  split: DocsProjectSplit,
): DocsProject {
  return {
    ...source,
    slug: split.derived.slug,
    displayName: split.derived.displayName,
    projectKey: split.derived.projectKey,
    derivedFrom: source.slug,
    guideSections: {
      mode: "include",
      sections: [...split.sections],
      ...(split.promoteChildren
        ? { promoteChildren: [...split.promoteChildren] }
        : {}),
    },
  };
}

/**
 * Rewrites the cross-references the two pages of a split make to each other.
 * A guide written as one document links its HTTP sections with plain fragment
 * links; once those sections are rendered as their own page, an id the page
 * does not define but its sibling does becomes a link to the sibling page.
 */
export function crossLinkSplitPages(
  pagesBySlug: Record<string, string>,
): Record<string, string> {
  const slugs = Object.keys(pagesBySlug);
  const idsBySlug = new Map(
    slugs.map((slug): [string, Set<string>] => [
      slug,
      pageIds(pagesBySlug[slug]),
    ]),
  );
  const linked: Record<string, string> = {};
  for (const slug of slugs) {
    const ownIds = idsBySlug.get(slug)!;
    linked[slug] = pagesBySlug[slug].replace(
      /href="#([^"]+)"/g,
      (match: string, id: string): string => {
        if (ownIds.has(id) || !id.startsWith(`${slug}-`)) {
          return match;
        }
        const bareId = id.slice(slug.length + 1);
        for (const siblingSlug of slugs) {
          if (siblingSlug === slug) {
            continue;
          }
          const siblingId = `${siblingSlug}-${bareId}`;
          if (idsBySlug.get(siblingSlug)?.has(siblingId)) {
            return `href="../${siblingSlug}/#${siblingId}"`;
          }
        }
        return match;
      },
    );
  }
  return linked;
}

function pageIds(page: string): Set<string> {
  const ids = new Set<string>();
  for (const match of page.matchAll(/(?<![-\w])id="([^"]+)"/g)) {
    ids.add(match[1]);
  }
  return ids;
}
