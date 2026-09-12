import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GUIDE_VARIANT_PREFERENCE_EVENT,
  matchGuideVariant,
  readGuideVariantPreference,
  saveGuideVariantPreference,
  type GuideVariantPreference,
} from "@/lib/guide-variant-preference";
import {
  isProgrammingLanguage,
  saveProgrammingLanguagePreference,
} from "@/lib/programming-language-preference";

export type GuideVariantLink = {
  id: string;
  language: string;
  languageLabel: string;
  buildTool: string;
  buildToolLabel: string;
  href: string;
  active: boolean;
};

/**
 * The only interactive part of a guide card. The card itself is static markup,
 * so this island carries just the variant links instead of re-serializing the
 * whole guide. It also applies the persisted language/build preference to the
 * card's static links, so "Read" opens the reader's preferred variant.
 */
export function GuideVariantMenu({
  title,
  variants,
}: {
  title: string;
  variants: GuideVariantLink[];
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [preference, setPreference] = useState<
    GuideVariantPreference | undefined
  >(undefined);

  useEffect(() => {
    setPreference(readGuideVariantPreference());

    function onPreferenceChange(event: Event) {
      setPreference(
        (event as CustomEvent<GuideVariantPreference>).detail ??
          readGuideVariantPreference(),
      );
    }

    window.addEventListener(GUIDE_VARIANT_PREFERENCE_EVENT, onPreferenceChange);
    return () => {
      window.removeEventListener(
        GUIDE_VARIANT_PREFERENCE_EVENT,
        onPreferenceChange,
      );
    };
  }, []);

  const preferredVariant = preference
    ? matchGuideVariant(variants, preference)
    : undefined;
  const activeVariant =
    preferredVariant ?? variants.find((variant) => variant.active);

  useEffect(() => {
    if (!preferredVariant) {
      return;
    }
    // The static links (title and "Read") are prerendered with the
    // build-time default; re-point them at the preferred variant.
    const card = triggerRef.current?.closest("[data-guide-link-scope]");
    for (const link of card?.querySelectorAll<HTMLAnchorElement>(
      "a[data-guide-link]",
    ) ?? []) {
      link.href = preferredVariant.href;
    }
  }, [preferredVariant]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          size="icon-sm"
          variant="outline"
          className="rounded-l-none border-l-0"
          aria-label={`Choose variant for ${title}`}
        >
          <ChevronDownIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Variants</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {variants.map((variant) => (
          <DropdownMenuItem key={variant.id} asChild>
            <a
              href={variant.href}
              aria-current={
                variant.id === activeVariant?.id ? "page" : undefined
              }
              onClick={() =>
                (() => {
                  saveGuideVariantPreference({
                    language: variant.language,
                    buildTool: variant.buildTool,
                  });
                  if (isProgrammingLanguage(variant.language)) {
                    saveProgrammingLanguagePreference(variant.language);
                  }
                })()
              }
            >
              <span>{variant.languageLabel}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {variant.buildToolLabel}
              </span>
              {variant.id === activeVariant?.id ? (
                <CheckIcon className="ml-1 size-4" />
              ) : null}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
