import { readProgrammingLanguageCookiePreference } from "@/lib/programming-language-preference";
import {
  readBuildToolCookiePreference,
  saveBuildToolPreference,
} from "@/lib/build-tool-preference";

export type GuideVariantPreference = {
  language: string;
  buildTool: string;
};

export const GUIDE_VARIANT_PREFERENCE_STORAGE_KEY =
  "micronaut-guides-variant-preference";
export const GUIDE_VARIANT_PREFERENCE_EVENT =
  "micronaut-guides-variant-preference-change";

/** Matches `preferredGuideOption`, so stored and server defaults agree. */
export const DEFAULT_GUIDE_VARIANT_PREFERENCE: GuideVariantPreference = {
  language: "java",
  buildTool: "gradle",
};

export function isGuideVariantPreference(
  value: unknown,
): value is GuideVariantPreference {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as GuideVariantPreference).language === "string" &&
    typeof (value as GuideVariantPreference).buildTool === "string"
  );
}

export function isGuideLanguage(
  language: string,
): language is "java" | "kotlin" | "groovy" {
  return language === "java" || language === "kotlin" || language === "groovy";
}

export function isGuideBuildTool(
  buildTool: string,
): buildTool is "gradle" | "maven" {
  return buildTool === "gradle" || buildTool === "maven";
}

export function normalizeGuidePreference(
  preference: GuideVariantPreference,
): GuideVariantPreference {
  return {
    language: isGuideLanguage(preference.language)
      ? preference.language
      : DEFAULT_GUIDE_VARIANT_PREFERENCE.language,
    buildTool: isGuideBuildTool(preference.buildTool)
      ? preference.buildTool
      : DEFAULT_GUIDE_VARIANT_PREFERENCE.buildTool,
  };
}

export function readGuideVariantPreference():
  GuideVariantPreference | undefined {
  let stored: GuideVariantPreference | undefined;
  try {
    const serialized = localStorage.getItem(
      GUIDE_VARIANT_PREFERENCE_STORAGE_KEY,
    );
    if (serialized) {
      const parsed: unknown = JSON.parse(serialized);
      if (isGuideVariantPreference(parsed)) {
        stored = parsed;
      }
    }
  } catch {
    stored = undefined;
  }

  const globalLanguage = readProgrammingLanguageCookiePreference();
  const globalBuildTool = readBuildToolCookiePreference();

  if (globalLanguage || globalBuildTool) {
    return normalizeGuidePreference({
      language:
        globalLanguage ??
        stored?.language ??
        DEFAULT_GUIDE_VARIANT_PREFERENCE.language,
      buildTool:
        globalBuildTool ??
        stored?.buildTool ??
        DEFAULT_GUIDE_VARIANT_PREFERENCE.buildTool,
    });
  }
  return stored ? normalizeGuidePreference(stored) : undefined;
}

export function saveGuideVariantPreference(preference: GuideVariantPreference) {
  try {
    localStorage.setItem(
      GUIDE_VARIANT_PREFERENCE_STORAGE_KEY,
      JSON.stringify(preference),
    );
  } catch {
    // The change event still updates the current page without storage.
  }

  if (isGuideBuildTool(preference.buildTool)) {
    saveBuildToolPreference(preference.buildTool);
  }

  window.dispatchEvent(
    new CustomEvent<GuideVariantPreference>(GUIDE_VARIANT_PREFERENCE_EVENT, {
      detail: preference,
    }),
  );
}

/**
 * Best variant for a preference: exact language and build tool match, then
 * language-only, mirroring the server-side `preferredGuideOption` fallbacks.
 */
export function matchGuideVariant<
  Variant extends { language: string; buildTool: string },
>(variants: Variant[], preference: GuideVariantPreference) {
  return (
    variants.find(
      (variant) =>
        variant.language === preference.language &&
        variant.buildTool === preference.buildTool,
    ) || variants.find((variant) => variant.language === preference.language)
  );
}
