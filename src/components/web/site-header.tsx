"use client";

import { Menu } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MicronautLogo } from "@/components/web/micronaut-logo";
import { SearchDialog } from "@/components/web/search-dialog";
import { ThemeModeSwitch } from "@/components/web/theme-toggle";
import {
  withConfiguredBasePath,
  withConfiguredSurfacePath,
  type SiteSurfaceUrls,
} from "@/lib/base-path";
import { mainSiteFooterGroups } from "@/lib/main-site-footer";
import { cn } from "@/lib/utils";

type SurfaceId = "main" | "docs" | "guides";
type MainSiteSearchPage = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
};

const primaryLinks: Array<{
  href: string;
  label: string;
  surface?: SurfaceId;
}> = [
  { href: "/docs/", label: "Docs", surface: "docs" },
  { href: "/guides/", label: "Guides", surface: "guides" },
  { href: "/blog/", label: "Blog", surface: "main" },
  {
    href: "/category/release-announcements/",
    label: "Releases",
    surface: "main",
  },
];

type MobileMenuLink = {
  href: string;
  label: string;
  surface?: SurfaceId;
};

const mobileGroups: Array<{ label: string; links: MobileMenuLink[] }> = [
  {
    label: "Browse",
    links: [
      { href: "/docs/", label: "Docs", surface: "docs" },
      { href: "/guides/", label: "Guides", surface: "guides" },
      { href: "/blog/", label: "Blog", surface: "main" },
      {
        href: "/category/release-announcements/",
        label: "Releases",
        surface: "main",
      },
      { href: "https://launch.micronaut.io", label: "Launch" },
    ],
  },
  ...mainSiteFooterGroups.map((group) => ({
    label: group.title,
    links: group.links,
  })),
];

function MobileColorModeSwitch() {
  return (
    <div className="flex items-center justify-between px-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Color mode
      </p>
      <ThemeModeSwitch />
    </div>
  );
}

function isActivePrimaryLink(
  link: { href: string; surface?: SurfaceId },
  surface: SurfaceId,
  isBlogRoute: boolean,
  isReleasesRoute: boolean,
) {
  if (link.surface === "main") {
    return (
      (link.href === "/blog/" && isBlogRoute) ||
      (link.href === "/category/release-announcements/" && isReleasesRoute)
    );
  }
  return link.surface === surface;
}

export function SiteHeader({
  docsSearchIndexUrl,
  guidesManifestUrl,
  siteSearchIndexUrl,
  surface = "main",
  isBlogRoute = false,
  isReleasesRoute = false,
  hideBrand = false,
  mainSitePages = [],
  navigationUrls,
}: {
  docsSearchIndexUrl?: string;
  guidesManifestUrl?: string;
  siteSearchIndexUrl?: string;
  surface?: SurfaceId;
  isBlogRoute?: boolean;
  isReleasesRoute?: boolean;
  hideBrand?: boolean;
  mainSitePages?: MainSiteSearchPage[];
  navigationUrls?: SiteSurfaceUrls;
}) {
  const surfaceHref = (targetSurface: SurfaceId, href: string) =>
    withConfiguredSurfacePath(targetSurface, href, navigationUrls);
  const mobileLinkHref = (link: MobileMenuLink) =>
    link.surface
      ? withConfiguredSurfacePath(link.surface, link.href, navigationUrls)
      : withConfiguredBasePath(link.href, navigationUrls);

  return (
    <header className="border-b bg-card/95 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[var(--page-max)] items-center gap-2 px-4 sm:px-6 lg:h-16 lg:gap-4 xl:px-0">
        {!hideBrand ? (
          <a
            href={surfaceHref("main", "/")}
            aria-label="Micronaut home"
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground no-underline"
          >
            <MicronautLogo
              assetBaseUrl={navigationUrls?.main}
              className="h-9 w-[156px] sm:h-11 sm:w-[192px] lg:h-[3.25rem]"
            />
          </a>
        ) : null}
        <NavigationMenu viewport={false} className="hidden lg:flex">
          <NavigationMenuList>
            {primaryLinks.map((link) => (
              <NavigationMenuItem key={link.href}>
                <NavigationMenuLink
                  href={
                    link.surface
                      ? surfaceHref(link.surface, link.href)
                      : link.href
                  }
                  active={isActivePrimaryLink(
                    link,
                    surface,
                    isBlogRoute,
                    isReleasesRoute,
                  )}
                  className={cn(
                    "h-8 rounded-md px-3 py-1.5 text-[0.88rem] transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isActivePrimaryLink(
                      link,
                      surface,
                      isBlogRoute,
                      isReleasesRoute,
                    ) && "bg-accent text-accent-foreground",
                  )}
                >
                  {link.label}
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
        <div className="ml-auto flex min-w-0 items-center gap-2">
          <SearchDialog
            className="h-9 w-9 justify-center px-0 text-sm sm:w-52 sm:justify-start sm:px-3 xl:w-[280px]"
            mainSitePages={mainSitePages}
            mode={surface === "docs" ? "docs" : "site"}
            navigationUrls={navigationUrls}
            docsSearchIndexUrl={docsSearchIndexUrl}
            guidesManifestUrl={guidesManifestUrl}
            siteSearchIndexUrl={siteSearchIndexUrl}
          />
          <Button
            variant="outline"
            size="sm"
            className="hidden h-9 lg:inline-flex"
            asChild
          >
            <a href="https://launch.micronaut.io">Launch</a>
          </Button>
          <ThemeModeSwitch className="hidden lg:inline-flex" />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[calc(100vw-1rem)] max-w-sm overflow-hidden">
              <SheetHeader>
                <SheetTitle>Micronaut</SheetTitle>
                <SheetDescription>
                  Navigate main-site pages, documentation, and guides.
                </SheetDescription>
              </SheetHeader>
              <nav
                className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 pb-6"
                data-mobile-navigation
              >
                {mobileGroups.map((group) => {
                  const isBrowseGroup = group.label === "Browse";
                  return (
                    <div
                      className="grid gap-2"
                      key={group.label}
                      data-mobile-navigation-group={group.label}
                    >
                      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      <div
                        className={cn(
                          "grid gap-2",
                          isBrowseGroup && "grid-cols-2",
                        )}
                      >
                        {group.links.map((link) => (
                          <SheetClose asChild key={link.href}>
                            <a
                              href={mobileLinkHref(link)}
                              aria-current={
                                isActivePrimaryLink(
                                  link,
                                  surface,
                                  isBlogRoute,
                                  isReleasesRoute,
                                )
                                  ? "page"
                                  : undefined
                              }
                              className={cn(
                                "rounded-md text-[0.92rem] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                                isBrowseGroup
                                  ? "flex min-h-14 items-center border bg-card px-3 py-3"
                                  : "px-3 py-2",
                                isActivePrimaryLink(
                                  link,
                                  surface,
                                  isBlogRoute,
                                  isReleasesRoute,
                                ) && "bg-accent",
                              )}
                            >
                              {link.label}
                            </a>
                          </SheetClose>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <MobileColorModeSwitch />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
