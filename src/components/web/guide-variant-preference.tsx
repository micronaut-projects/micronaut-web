import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DEFAULT_GUIDE_VARIANT_PREFERENCE,
  GUIDE_VARIANT_PREFERENCE_EVENT,
  isGuideLanguage,
  normalizeGuidePreference,
  readGuideVariantPreference,
  saveGuideVariantPreference,
  type GuideVariantPreference,
} from "@/lib/guide-variant-preference";
import {
  isProgrammingLanguage,
  PROGRAMMING_LANGUAGE_EVENT,
  saveProgrammingLanguagePreference,
} from "@/lib/programming-language-preference";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "groovy", label: "Groovy" },
];
const BUILD_TOOLS = [
  { value: "gradle", label: "Gradle" },
  { value: "maven", label: "Maven" },
];

/**
 * Site-wide language/build preference for guide links. Persisted, so "Read"
 * on every card opens the preferred variant instead of the Java/Gradle
 * default; guides without an exact match fall back per `matchGuideVariant`.
 *
 * Guides support Java, Kotlin, and Groovy variants. A global Python preference
 * remains valid for the navbar and Docs, but falls back to Java/Gradle here.
 */
export function GuideVariantPreferencePicker({
  initialLanguage = DEFAULT_GUIDE_VARIANT_PREFERENCE.language,
}: {
  initialLanguage?: string;
}) {
  const [preference, setPreference] = useState<GuideVariantPreference>({
    ...DEFAULT_GUIDE_VARIANT_PREFERENCE,
    language: isGuideLanguage(initialLanguage)
      ? initialLanguage
      : DEFAULT_GUIDE_VARIANT_PREFERENCE.language,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readGuideVariantPreference();
    if (stored) {
      setPreference(normalizeGuidePreference(stored));
    }
    setHydrated(true);

    function onPreferenceChange(event: Event) {
      const detail = (event as CustomEvent<GuideVariantPreference>).detail;
      if (detail) {
        setPreference(detail);
      }
    }

    // When the navbar language selector changes, update the guide picker to
    // match. We listen here (inside the component) rather than relying on the
    // guide-variant-persistence.ts bridge script because that script is only
    // bundled into the guide reader page ([slug].astro), NOT the catalog page
    // (index.astro) where this picker is rendered.
    function onGlobalLanguageChange(event: Event) {
      const detail = (event as CustomEvent<{ language?: string }>).detail;
      const language = detail?.language;
      if (!language || !isProgrammingLanguage(language)) {
        return;
      }
      const guideLanguage = isGuideLanguage(language) ? language : "java";
      setPreference((current) => {
        // Guard: if the guide picker itself fired this event (selectLanguage
        // also calls saveProgrammingLanguagePreference), the preference is
        // already correct — skip the redundant write.
        if (current.language === guideLanguage) {
          return current;
        }
        const buildTool = BUILD_TOOLS.some(
          (bt) => bt.value === current.buildTool,
        )
          ? current.buildTool
          : BUILD_TOOLS[0].value;
        const next = { language: guideLanguage, buildTool };
        // Persist outside the updater to avoid double-call in Strict Mode.
        // schedule as a microtask so the state update completes first.
        Promise.resolve().then(() => saveGuideVariantPreference(next));
        return next;
      });
    }

    function onGlobalBuildToolChange(event: Event) {
      const detail = (event as CustomEvent<{ buildTool?: string }>).detail;
      const buildTool = detail?.buildTool;
      if (buildTool !== "gradle" && buildTool !== "maven") {
        return;
      }
      setPreference((current) => {
        if (current.buildTool === buildTool) {
          return current;
        }
        const next = { language: current.language, buildTool };
        Promise.resolve().then(() => saveGuideVariantPreference(next));
        return next;
      });
    }

    window.addEventListener(GUIDE_VARIANT_PREFERENCE_EVENT, onPreferenceChange);
    window.addEventListener(PROGRAMMING_LANGUAGE_EVENT, onGlobalLanguageChange);
    window.addEventListener(
      "micronaut-web-build-tool-change",
      onGlobalBuildToolChange,
    );
    return () => {
      window.removeEventListener(
        GUIDE_VARIANT_PREFERENCE_EVENT,
        onPreferenceChange,
      );
      window.removeEventListener(
        PROGRAMMING_LANGUAGE_EVENT,
        onGlobalLanguageChange,
      );
      window.removeEventListener(
        "micronaut-web-build-tool-change",
        onGlobalBuildToolChange,
      );
    };
  }, []);

  function update(next: Partial<GuideVariantPreference>) {
    saveGuideVariantPreference({ ...preference, ...next });
  }

  function selectLanguage(language: string) {
    update({
      language,
      buildTool: BUILD_TOOLS.some(
        (buildTool) => buildTool.value === preference.buildTool,
      )
        ? preference.buildTool
        : BUILD_TOOLS[0].value,
    });
    // Keep the global language cookie in sync so the navbar selector and the
    // docs snippet enhancer both reflect this choice.
    if (isProgrammingLanguage(language)) {
      saveProgrammingLanguagePreference(language);
    }
  }

  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap",
        !hydrated && "invisible",
      )}
    >
      <ButtonGroup aria-label="Preferred guide language">
        {LANGUAGES.map((language) => (
          <Button
            key={language.value}
            size="sm"
            variant={
              preference.language === language.value ? "default" : "outline"
            }
            aria-pressed={preference.language === language.value}
            onClick={() => selectLanguage(language.value)}
          >
            {language.label}
          </Button>
        ))}
      </ButtonGroup>
      <ButtonGroup aria-label="Preferred guide build tool">
        {BUILD_TOOLS.map((buildTool) => (
          <Button
            key={buildTool.value}
            size="sm"
            variant={
              preference.buildTool === buildTool.value ? "default" : "outline"
            }
            aria-pressed={preference.buildTool === buildTool.value}
            onClick={() => update({ buildTool: buildTool.value })}
          >
            {buildTool.label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}
