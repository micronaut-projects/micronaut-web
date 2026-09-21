const generatedDocsSelector = "[data-generated-docs]";

const currentHashId = () => {
  if (!window.location.hash) {
    return undefined;
  }
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
};

/**
 * Section ids carry the project slug (`core-java`), while every link written
 * against the old site used the bare Asciidoctor id (`#java`). Those links
 * still arrive here — the redirect stubs carry the fragment across — so the
 * prefixed id answers for the bare one, and the address bar is corrected to
 * the id that will keep working.
 */
const hashTarget = (id: string) => {
  const direct = document.getElementById(id);
  if (direct) {
    return direct;
  }
  const slug = document
    .querySelector(generatedDocsSelector)
    ?.getAttribute("data-generated-docs");
  const prefixed = slug ? document.getElementById(`${slug}-${id}`) : null;
  if (prefixed) {
    window.history.replaceState(null, "", `#${prefixed.id}`);
    return prefixed;
  }
  forwardMovedSection(id);
  return null;
};

/**
 * A section split out into another project (Core's HTTP chapters) is still
 * linked on this page by its old id; send the reader to where it lives now.
 */
const forwardMovedSection = (id: string) => {
  const moved = document
    .querySelector(generatedDocsSelector)
    ?.getAttribute("data-generated-docs-moved");
  const destination =
    moved &&
    (JSON.parse(moved) as Array<{ href: string; ids: string[] }>).find(
      (candidate) => candidate.ids.includes(id),
    );
  if (destination) {
    window.location.replace(`${destination.href}#${encodeURIComponent(id)}`);
  }
};

const alignGeneratedDocsHash = () => {
  const id = currentHashId();
  if (!id) {
    return;
  }
  const target = hashTarget(id);
  if (!target || !target.closest(generatedDocsSelector)) {
    return;
  }
  const scrollPaddingTop =
    Number.parseFloat(
      window.getComputedStyle(document.documentElement).scrollPaddingTop,
    ) || 80;
  const top =
    target.getBoundingClientRect().top + window.scrollY - scrollPaddingTop;
  window.scrollTo({ top: Math.max(0, top) });
};

const scheduleGeneratedDocsHashAlignment = () => {
  window.requestAnimationFrame(alignGeneratedDocsHash);
  window.setTimeout(alignGeneratedDocsHash, 50);
  window.setTimeout(alignGeneratedDocsHash, 250);
};

const initGeneratedDocsHashAligner = () => {
  if (!document.querySelector(generatedDocsSelector)) {
    return;
  }
  scheduleGeneratedDocsHashAlignment();
  window.addEventListener("load", scheduleGeneratedDocsHashAlignment, {
    once: true,
  });
  window.addEventListener("astro:hydrate", scheduleGeneratedDocsHashAlignment);
  window.addEventListener("hashchange", scheduleGeneratedDocsHashAlignment);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGeneratedDocsHashAligner, {
    once: true,
  });
} else {
  initGeneratedDocsHashAligner();
}
