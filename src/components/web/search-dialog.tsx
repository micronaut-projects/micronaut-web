"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  FileCode2,
  FileText,
  FolderGit2,
  Package,
  Rocket,
  Search,
  SlidersHorizontal,
  Tag,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { bestScore, rankSearchItems } from "@/lib/search-ranking";
import {
  withConfiguredBasePath,
  withBasePath,
  type SiteSurfaceUrls,
} from "@/lib/base-path";
import { guideSearchItems, type SearchItem } from "@/lib/content-catalog";
import type { GeneratedGuide } from "@/lib/generated-guide-routing";

type MainSiteSearchPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
};

type SiteGroup =
  | { key: string; badge: string; kind: "page"; items: MainSiteSearchPage[] }
  | { key: string; badge: string; kind: "item"; items: SearchItem[] };

function ResultIcon({ kind }: { kind: SearchItem["kind"] }) {
  if (kind === "Guide") return <BookOpen />;
  if (kind === "Tag") return <Tag />;
  if (kind === "Class") return <FileCode2 />;
  if (kind === "Property") return <SlidersHorizontal />;
  if (kind === "Repo") return <FolderGit2 />;
  if (kind === "Project") return <Package />;
  return <FileText />;
}

/**
 * Every result row in both modes renders the same icon / title / description /
 * badge layout; only the badge and the source of the row differ.
 */
function ResultItem({
  badge,
  description,
  icon,
  onSelect,
  title,
  value,
}: {
  badge: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
  title: string;
  value: string;
}) {
  return (
    <CommandItem value={value} onSelect={onSelect}>
      {icon}
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate font-medium">{title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[0.68rem] text-muted-foreground">
        {badge}
      </span>
    </CommandItem>
  );
}

function SearchItemResults({
  badge,
  items,
  onSelect,
}: {
  badge: string;
  items: SearchItem[];
  onSelect: (href: string) => void;
}) {
  return items.map((item) => (
    <ResultItem
      key={`${item.scope ?? ""}-${item.kind}-${item.href}-${item.title}`}
      badge={badge}
      description={item.description}
      icon={<ResultIcon kind={item.kind} />}
      onSelect={() => onSelect(item.href)}
      title={item.title}
      value={`${item.kind} ${item.title} ${item.description} ${item.terms}`}
    />
  ));
}

/** A catalog fetch never fails the dialog; a dead source just adds no rows. */
async function fetchJson(url: string): Promise<unknown> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : undefined;
  } catch {
    return undefined;
  }
}

async function fetchIndexItems(url: string): Promise<SearchItem[]> {
  const payload = (await fetchJson(url)) as { items?: SearchItem[] };
  return Array.isArray(payload?.items) ? payload.items : [];
}

async function fetchGuideItems(url: string): Promise<SearchItem[]> {
  const manifest = (await fetchJson(url)) as { guides?: GeneratedGuide[] };
  return Array.isArray(manifest?.guides)
    ? guideSearchItems(manifest.guides)
    : [];
}

const docsScopes = [
  "All",
  "Projects",
  "Docs",
  "Properties",
  "Classes",
  "Repos",
] as const;
type DocsScope = (typeof docsScopes)[number];

function scopeForItem(item: SearchItem): Exclude<DocsScope, "All"> {
  if (item.scope) return item.scope;
  if (item.kind === "Project") return "Projects";
  if (item.kind === "Property") return "Properties";
  if (item.kind === "Class") return "Classes";
  if (item.kind === "Repo") return "Repos";
  return "Docs";
}

export function SearchDialog({
  className,
  docsSearchIndexUrl,
  guidesManifestUrl,
  siteSearchIndexUrl,
  mainSitePages = [],
  mode = "site",
  navigationUrls,
  buttonLabel,
}: {
  className?: string;
  docsSearchIndexUrl?: string;
  guidesManifestUrl?: string;
  siteSearchIndexUrl?: string;
  mainSitePages?: MainSiteSearchPage[];
  mode?: "site" | "docs";
  navigationUrls?: SiteSurfaceUrls;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [docsScope, setDocsScope] = useState<DocsScope>("All");
  // Both modes load their catalog from a static JSON route when the dialog is
  // first opened. Importing it instead put the docs and guides fixtures in the
  // header bundle, which every page hydrates.
  const [items, setItems] = useState<SearchItem[]>([]);
  // Without this the empty state claimed "No results found." while the catalog
  // was still in flight, so every fast typist was told their query had failed.
  const [loadingItems, setLoadingItems] = useState(false);
  // Rank against the query first: these lists used to be truncated before any
  // query ran, so a match outside the first 80 entries could never surface.
  const docs = useMemo(
    () =>
      rankSearchItems(
        // References live on the modules' own published sites, so they are
        // the one external kind the "Docs and APIs" group carries.
        items.filter(
          (item) => item.href.startsWith("/docs/") || item.kind === "Reference",
        ),
        searchQuery,
      ).slice(0, 40),
    [items, searchQuery],
  );
  const guides = useMemo(
    () =>
      rankSearchItems(
        items.filter((item) => item.kind === "Guide"),
        searchQuery,
      ).slice(0, 40),
    [items, searchQuery],
  );
  const posts = useMemo(
    () =>
      rankSearchItems(
        items.filter((item) => item.kind === "Post"),
        searchQuery,
      ).slice(0, 40),
    [items, searchQuery],
  );
  const tags = useMemo(
    () =>
      rankSearchItems(
        items.filter((item) => item.kind === "Tag"),
        searchQuery,
      ).slice(0, 20),
    [items, searchQuery],
  );
  const pages = useMemo(
    () => rankSearchItems(mainSitePages, searchQuery).slice(0, 40),
    [mainSitePages, searchQuery],
  );
  const docsModeItems = useMemo(
    () =>
      rankSearchItems(
        items.filter(
          (item) => docsScope === "All" || scopeForItem(item) === docsScope,
        ),
        searchQuery,
      ).slice(0, 240),
    [docsScope, items, searchQuery],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        (event.key === "k" || event.key === "K") &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || items.length) {
      return;
    }
    let cancelled = false;
    // Site mode reads two catalogs: the surface's own index, and the guide
    // manifest the guides deployment publishes. Guides are not in the index
    // because the artifact that serves it is built without guide content, so
    // an index-only search knew 4 of the 177 published guides.
    const sources: Array<Promise<SearchItem[]>> =
      mode === "docs"
        ? [
            fetchIndexItems(
              docsSearchIndexUrl || withBasePath("/docs/search-index.json"),
            ),
          ]
        : [
            fetchIndexItems(
              siteSearchIndexUrl || withBasePath("/search-index.json"),
            ),
            fetchGuideItems(
              guidesManifestUrl || withBasePath("/guides/manifest.json"),
            ),
          ];
    setLoadingItems(true);
    Promise.all(sources).then((loaded) => {
      const merged = loaded.flat();
      if (cancelled) {
        return;
      }
      if (merged.length) {
        setItems(merged);
      }
      setLoadingItems(false);
    });
    return () => {
      cancelled = true;
    };
  }, [
    docsSearchIndexUrl,
    guidesManifestUrl,
    items.length,
    mode,
    open,
    siteSearchIndexUrl,
  ]);

  // cmdk's own filter is disabled, so the static action has to be matched by
  // hand; otherwise "Launch a project" answered every query.
  const showLaunchAction = useMemo(
    () =>
      rankSearchItems(
        [
          {
            title: "Launch a project",
            description:
              "Choose features and generate a Micronaut application.",
            terms: "launch starter create new project application generate",
          },
        ],
        searchQuery,
      ).length > 0,
    [searchQuery],
  );

  // Docs groups follow relevance too: an exact class match used to sit under
  // "Classes" below whichever projects merely mentioned the term.
  const docsGroups = useMemo(() => {
    const groups = docsScopes
      .filter((scope) => scope !== "All")
      .map((scope) => ({
        scope,
        items: docsModeItems.filter((item) => scopeForItem(item) === scope),
      }))
      .filter((group) => group.items.length > 0);
    if (!searchQuery.trim()) {
      return groups;
    }
    return groups
      .map((group) => ({ group, score: bestScore(group.items, searchQuery) }))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.group);
  }, [docsModeItems, searchQuery]);

  // Group order follows relevance instead of a fixed list, so a query that
  // clearly targets docs or guides no longer sits under "Main site". Tags are
  // navigational refinements rather than primary content, so keep them last.
  const siteGroups = useMemo(() => {
    const groups: SiteGroup[] = [
      { key: "Main site", badge: "Page", kind: "page" as const, items: pages },
      {
        key: "Docs and APIs",
        badge: "Docs",
        kind: "item" as const,
        items: docs,
      },
      { key: "Guides", badge: "Guide", kind: "item" as const, items: guides },
      { key: "Blog", badge: "Post", kind: "item" as const, items: posts },
      { key: "Tags", badge: "Tag", kind: "item" as const, items: tags },
    ].filter((group) => group.items.length > 0);
    if (!searchQuery.trim()) {
      return groups;
    }
    const rankedGroups = groups
      .filter((group) => group.key !== "Tags")
      .map((group) => ({ group, score: bestScore(group.items, searchQuery) }))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.group);
    const tagGroup = groups.find((group) => group.key === "Tags");
    return tagGroup ? [...rankedGroups, tagGroup] : rankedGroups;
  }, [docs, guides, pages, posts, searchQuery, tags]);

  const navigateTo = (href: string) => {
    // The docs index sits at the root of the release line it was built for
    // (`/5.2.x/search-index.json`), while the header bundle is shared from the
    // main site and only knows the default docs root, so `/docs/` entries
    // resolve against the index instead.
    window.location.href =
      mode === "docs" && docsSearchIndexUrl && href.startsWith("/docs/")
        ? new URL(
            href.slice("/docs/".length),
            new URL(docsSearchIndexUrl, window.location.href),
          ).toString()
        : withConfiguredBasePath(href, navigationUrls);
    setOpen(false);
  };

  const dialogTitle =
    mode === "docs" ? "Search Micronaut Docs" : "Search Micronaut";
  const dialogDescription =
    mode === "docs"
      ? "Search projects, classes, properties, docs, and repositories."
      : "Search projects, guides, sections, and tags.";
  const placeholder =
    mode === "docs"
      ? "Search projects, classes, properties, docs..."
      : "Search projects, guides, sections, and tags...";
  const resolvedButtonLabel =
    buttonLabel || (mode === "docs" ? "Search docs..." : "Search Micronaut...");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        aria-label="Search Micronaut"
        onClick={() => setOpen(true)}
      >
        <Search />
        <span className="hidden min-w-32 text-left text-muted-foreground sm:inline">
          {resolvedButtonLabel}
        </span>
        <kbd
          className={cn(
            "ml-auto hidden rounded border px-1.5 py-0.5 text-[0.7rem] text-muted-foreground md:inline",
            buttonLabel ? "border-mn-border bg-mn-surface-raised" : "bg-muted",
          )}
        >
          ⌘K
        </kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={dialogTitle}
        description={dialogDescription}
        className="max-w-2xl"
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          placeholder={placeholder}
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList className="max-h-[28rem]">
          <CommandEmpty>
            {loadingItems ? (
              <span className="font-medium" aria-live="polite">
                Loading search results…
              </span>
            ) : (
              <span className="grid gap-1">
                <span className="font-medium">No results found.</span>
                <span className="text-xs text-muted-foreground">
                  Try fewer words, or drop punctuation such as @ and ().
                </span>
              </span>
            )}
          </CommandEmpty>
          {mode === "docs" ? (
            <>
              <div className="flex flex-wrap gap-1 border-b p-2">
                {docsScopes.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
                      docsScope === scope && "bg-accent text-accent-foreground",
                    )}
                    aria-pressed={docsScope === scope}
                    onClick={() => setDocsScope(scope)}
                  >
                    {scope}
                  </button>
                ))}
              </div>
              {docsGroups.map(({ scope, items: scopedItems }) => {
                return (
                  <CommandGroup key={scope} heading={scope}>
                    <SearchItemResults
                      badge={scope}
                      items={scopedItems}
                      onSelect={navigateTo}
                    />
                  </CommandGroup>
                );
              })}
            </>
          ) : (
            <>
              {showLaunchAction && (
                <>
                  <CommandGroup heading="Actions">
                    <CommandItem
                      value="Launch create project application starter"
                      onSelect={() => navigateTo("https://launch.micronaut.io")}
                    >
                      <Rocket />
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate font-medium">
                          Launch a project
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          Choose features and generate a Micronaut application.
                        </span>
                      </span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}
              {siteGroups.map((group, index) => (
                <Fragment key={group.key}>
                  {index > 0 ? <CommandSeparator /> : null}
                  <CommandGroup heading={group.key}>
                    {group.kind === "page"
                      ? group.items.map((page) => (
                          <ResultItem
                            key={page.slug}
                            badge="Page"
                            description={page.description}
                            icon={<FileText />}
                            onSelect={() => navigateTo(`/${page.slug}/`)}
                            title={page.title}
                            value={`Page ${page.title} ${page.eyebrow} ${page.description}`}
                          />
                        ))
                      : null}
                    {group.kind === "item" ? (
                      <SearchItemResults
                        badge={group.badge}
                        items={group.items}
                        onSelect={navigateTo}
                      />
                    ) : null}
                  </CommandGroup>
                </Fragment>
              ))}
            </>
          )}
        </CommandList>
        <div className="flex items-center gap-3 border-t px-3 py-2 text-[0.7rem] text-muted-foreground">
          <span>
            <kbd className="rounded border px-1">↑</kbd>
            <kbd className="ml-0.5 rounded border px-1">↓</kbd> to navigate
          </span>
          <span>
            <kbd className="rounded border px-1">↵</kbd> to open
          </span>
          <span>
            <kbd className="rounded border px-1">esc</kbd> to close
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
