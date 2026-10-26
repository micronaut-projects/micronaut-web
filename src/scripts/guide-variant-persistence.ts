import { readCodePreferenceQuery } from "@/lib/code-preference-query";
import {
  GUIDE_VARIANT_PREFERENCE_EVENT,
  matchGuideVariant,
  normalizeGuidePreference,
  readGuideVariantPreference,
  saveGuideVariantPreference,
  type GuideVariantPreference,
} from "@/lib/guide-variant-preference";
import {
  isProgrammingLanguage,
  PROGRAMMING_LANGUAGE_EVENT,
  saveProgrammingLanguagePreference,
  type ProgrammingLanguage,
} from "@/lib/programming-language-preference";

function guideVariantLinks() {
  return Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      "a[data-guide-variant-language][data-guide-variant-build-tool]",
    ),
    (link) => ({
      link,
      language: link.dataset.guideVariantLanguage || "",
      buildTool: link.dataset.guideVariantBuildTool || "",
    }),
  );
}

// Opens this guide's variant for a preference, keeping the query and hash.
function openGuideVariant(preference: GuideVariantPreference | undefined) {
  const match =
    preference && matchGuideVariant(guideVariantLinks(), preference);
  if (match && match.link.getAttribute("aria-current") !== "page") {
    window.location.replace(
      match.link.pathname + window.location.search + window.location.hash,
    );
  }
}

// `?lang=`/`?build=` open the matching variant of this guide, keeping the
// query so the link still says what it asked for.
const query = readCodePreferenceQuery();
if (query.language || query.buildTool) {
  openGuideVariant(readGuideVariantPreference());
}

// Picking a language or build tool above the guide switches to that variant;
// a clicked variant link is already navigating there.
let followingVariantLink = false;
window.addEventListener(GUIDE_VARIANT_PREFERENCE_EVENT, (event) => {
  if (followingVariantLink) {
    return;
  }
  openGuideVariant((event as CustomEvent<GuideVariantPreference>).detail);
});

// Choosing a variant from the guide reader's "Different variants" list stores
// the same preference the guides index uses for its "Read" links.
document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }
  const link = target.closest<HTMLAnchorElement>(
    "a[data-guide-variant-language][data-guide-variant-build-tool]",
  );
  const language = link?.dataset.guideVariantLanguage;
  const buildTool = link?.dataset.guideVariantBuildTool;
  if (language && buildTool) {
    followingVariantLink = true;
    saveGuideVariantPreference({ language, buildTool });
    if (isProgrammingLanguage(language)) {
      saveProgrammingLanguagePreference(language);
    }
  }
});

// When the global language selector changes, update the guide language
// preference while preserving the existing build-tool choice.
// Python keeps its existing Pyronaut build-tool pairing through the same
// preference update path.
window.addEventListener(PROGRAMMING_LANGUAGE_EVENT, (event) => {
  const detail = (event as CustomEvent<{ language?: ProgrammingLanguage }>)
    .detail;
  if (!isProgrammingLanguage(detail?.language)) {
    return;
  }
  const existing = readGuideVariantPreference();
  const language = detail.language;
  const currentBuildTool = existing?.buildTool ?? "gradle";
  saveGuideVariantPreference(
    normalizeGuidePreference({
      language,
      buildTool: currentBuildTool,
    }),
  );
});

window.addEventListener("micronaut-web-build-tool-change", (event) => {
  const detail = (event as CustomEvent<{ buildTool?: string }>).detail;
  if (detail?.buildTool !== "gradle" && detail?.buildTool !== "maven") {
    return;
  }
  const existing = readGuideVariantPreference();
  // Saving a guide preference saves its build tool too, which fires this event.
  if (existing?.buildTool === detail.buildTool) {
    return;
  }
  const currentLanguage = existing?.language ?? "java";
  saveGuideVariantPreference(
    normalizeGuidePreference({
      language: currentLanguage,
      buildTool: detail.buildTool,
    }),
  );
});
