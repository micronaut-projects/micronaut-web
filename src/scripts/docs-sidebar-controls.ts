const sidebar = document.querySelector<HTMLElement>("[data-docs-sidebar]");
const sidebarToggle = document.querySelector<HTMLButtonElement>(
  "[data-docs-sidebar-toggle]",
);
const mobileNavigation = document.querySelector<HTMLDialogElement>(
  "[data-docs-mobile-nav]",
);
const mobileNavigationTrigger = document.querySelector<HTMLButtonElement>(
  "[data-docs-mobile-nav-trigger]",
);
const mobileNavigationClose = document.querySelector<HTMLButtonElement>(
  "[data-docs-mobile-nav-close]",
);
const sidebarCookieName = "sidebar_state";
const sidebarCookieMaxAge = 60 * 60 * 24 * 7;

function sidebarIsOpen() {
  return !document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .includes(`${sidebarCookieName}=false`);
}

function setSidebarOpen(open: boolean) {
  if (!sidebar || !sidebarToggle) return;
  sidebar.dataset.state = open ? "expanded" : "collapsed";
  sidebar.dataset.collapsible = open ? "" : "icon";
  sidebarToggle.setAttribute("aria-expanded", String(open));
  document.cookie = `${sidebarCookieName}=${open}; path=/; max-age=${sidebarCookieMaxAge}`;
}

setSidebarOpen(sidebarIsOpen());
sidebarToggle?.addEventListener("click", () => {
  setSidebarOpen(!sidebarIsOpen());
});
document.addEventListener("keydown", (event) => {
  if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    setSidebarOpen(!sidebarIsOpen());
  }
});
mobileNavigationTrigger?.addEventListener("click", () =>
  mobileNavigation?.showModal(),
);
mobileNavigationClose?.addEventListener("click", () =>
  mobileNavigation?.close(),
);
mobileNavigation?.addEventListener("click", (event) => {
  if (event.target === mobileNavigation) mobileNavigation.close();
  if (!(event.target instanceof Element)) return;
  const link = event.target.closest("a[href]");
  if (link && !event.target.closest("[data-docs-project-section-toggle]")) {
    mobileNavigation.close();
  }
});

// The section menu in the docs bar is a `details`, which stays open after a
// jump inside the same page and has no dismissal of its own.
const sectionMenu = document.querySelector<HTMLDetailsElement>(
  "[data-docs-section-menu]",
);
if (sectionMenu) {
  const closeSectionMenu = () => {
    sectionMenu.open = false;
  };
  sectionMenu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      closeSectionMenu();
    }
  });
  document.addEventListener("click", (event) => {
    if (
      sectionMenu.open &&
      event.target instanceof Node &&
      !sectionMenu.contains(event.target)
    ) {
      closeSectionMenu();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sectionMenu.open) {
      closeSectionMenu();
    }
  });
}

// The reference row starts in the flow at the top of the page and docks in
// the bottom-right corner once the reader scrolls it under the topbar. The
// observer root starts below the topbar, so the row counts as scrolled past as
// soon as the topbar covers it; a row below the viewport has not been.
const referenceLinks = document.querySelector<HTMLElement>(
  "[data-docs-reference-links]",
);
if (referenceLinks) {
  const topbarHeight =
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--topbar-height",
      ),
    ) || 0;
  new IntersectionObserver(
    ([entry]) => {
      referenceLinks.dataset.stuck = String(
        !entry.isIntersecting && entry.boundingClientRect.top < topbarHeight,
      );
    },
    { rootMargin: `-${topbarHeight}px 0px 0px 0px` },
  ).observe(referenceLinks);
}
