import {
  normalizeGuidePreference,
  readGuideVariantPreference,
  saveGuideVariantPreference,
} from "@/lib/guide-variant-preference";
import {
  isProgrammingLanguage,
  PROGRAMMING_LANGUAGE_EVENT,
  saveProgrammingLanguagePreference,
  type ProgrammingLanguage,
} from "@/lib/programming-language-preference";

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
