export type ProgrammingLanguage = "java" | "kotlin" | "groovy" | "python";

export const PROGRAMMING_LANGUAGES: readonly ProgrammingLanguage[] = [
  "java",
  "kotlin",
  "groovy",
  "python",
];

export const PROGRAMMING_LANGUAGE_LABELS: Record<ProgrammingLanguage, string> =
  {
    java: "Java",
    kotlin: "Kotlin",
    groovy: "Groovy",
    python: "Python",
  };

export const DEFAULT_PROGRAMMING_LANGUAGE: ProgrammingLanguage = "java";
export const PROGRAMMING_LANGUAGE_COOKIE_NAME = "micronaut-code-language";
export const PROGRAMMING_LANGUAGE_EVENT = "micronaut-web-language-change";

export function isProgrammingLanguage(
  value: unknown,
): value is ProgrammingLanguage {
  return (
    value === "java" ||
    value === "kotlin" ||
    value === "groovy" ||
    value === "python"
  );
}

/**
 * localStorage is per origin, so a choice made on docs.micronaut.io never
 * reaches micronaut.io or guides.micronaut.io. A cookie on the registrable
 * parent domain is shared by all three; browsers refuse it on public-suffix
 * hosts such as github.io (and it is pointless on localhost), where the
 * host-only cookie keeps working on its own.
 */
export function programmingLanguageCookie(
  language: ProgrammingLanguage,
  hostname: string,
): string {
  const labels = hostname.split(".");
  const domain =
    labels.length > 1 && !/^\d+$/.test(labels[labels.length - 1])
      ? `; domain=.${labels.slice(-2).join(".")}`
      : "";
  return `${PROGRAMMING_LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; SameSite=Lax${domain}`;
}

export function readProgrammingLanguagePreference(): ProgrammingLanguage {
  return (
    readProgrammingLanguageCookiePreference() ?? DEFAULT_PROGRAMMING_LANGUAGE
  );
}

export function readProgrammingLanguageCookiePreference():
  ProgrammingLanguage | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${PROGRAMMING_LANGUAGE_COOKIE_NAME}=`)) {
      const value = trimmed.slice(PROGRAMMING_LANGUAGE_COOKIE_NAME.length + 1);
      if (isProgrammingLanguage(value)) {
        return value;
      }
    }
  }
  return undefined;
}

export function saveProgrammingLanguagePreference(
  language: ProgrammingLanguage,
): void {
  try {
    document.cookie = programmingLanguageCookie(
      language,
      window.location.hostname,
    );
  } catch {
    // Cookie failure is non-fatal; the event still notifies the current page.
  }
  window.dispatchEvent(
    new CustomEvent<{ language: ProgrammingLanguage }>(
      PROGRAMMING_LANGUAGE_EVENT,
      { detail: { language } },
    ),
  );
}
