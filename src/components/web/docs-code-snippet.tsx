"use client";

import { ChevronRight } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import {
  CopyIcon,
  DocsSnippetCard,
  DocsSnippetCodeLanguageIcon,
  DocsSnippetCopyButton,
  type DocsSnippetKind,
  DocsSnippetLanguageButton,
  DocsSnippetStaticLanguage,
} from "@/components/web/docs-snippet-card";

export type CodeSnippetLanguage =
  | "java"
  | "kotlin"
  | "groovy"
  | "bash"
  | "gradle"
  | "maven"
  | "text"
  | (string & {});

export type CodeSnippetVariant = {
  language: CodeSnippetLanguage;
  label: string;
  /** Full sample; this is what the copy button copies. */
  code: string;
  /** Leading import block, rendered folded above `bodyCode`. */
  importsCode?: string;
  bodyCode?: string;
  highlightedImportsHtml?: string;
  active?: boolean;
  fileName?: string;
  highlightedHtml?: string;
  highlighterLanguage?: string;
  panelId?: string;
  tabId?: string;
};

export type CodeSnippetExample = {
  id: string;
  label: string;
  title?: string;
  description?: string;
  callouts?: ReactNode[];
  variants: CodeSnippetVariant[];
};

function FoldedImports({
  code,
  highlightedHtml,
  language,
}: {
  code: string;
  highlightedHtml?: string;
  language: string;
}) {
  return (
    <details className="group/imports bg-code [&_.docs-highlighted-pre]:!pt-1 [&_.docs-highlighted-pre]:!pb-0">
      <summary className="group/fold flex w-fit cursor-pointer list-none items-center gap-2 px-6 pt-4 font-mono text-[0.85rem] leading-6 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 shrink-0 transition-transform group-open/imports:rotate-90 motion-reduce:transition-none"
        />
        <span className="rounded border border-border bg-muted/50 px-1.5 leading-[1.35] transition-colors group-hover/fold:border-brand/60 group-focus-visible/fold:border-brand/60">
          imports
        </span>
      </summary>
      <HighlightedCodeBlock
        code={code}
        highlightedHtml={highlightedHtml}
        language={language}
      />
    </details>
  );
}

export function HighlightedCodeBlock({
  code,
  highlightedHtml,
  language,
}: {
  code: string;
  highlightedHtml?: string;
  language: string;
}) {
  const normalizedLanguage = language.trim().toLowerCase() || "text";

  return (
    <pre className="docs-highlighted-pre" tabIndex={0}>
      {highlightedHtml ? (
        <code
          className={`language-${normalizedLanguage} docs-highlighted-code`}
          data-lang={normalizedLanguage}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <code
          className={`language-${normalizedLanguage} docs-highlighted-code`}
          data-lang={normalizedLanguage}
        >
          {code}
        </code>
      )}
    </pre>
  );
}

type DocsCodeSnippetProps = {
  example: CodeSnippetExample;
  activeLanguage?: CodeSnippetLanguage;
  className?: string;
  copyLabel?: string;
  description?: ReactNode;
  externalHeader?: boolean;
  footer?: ReactNode;
  kind?: DocsSnippetKind;
  onLanguageChange?: (language: CodeSnippetLanguage) => void;
  optionsLabel?: string;
  showSingleVariantAsTabs?: boolean;
  staticEnhancement?: boolean;
  title?: ReactNode;
};

export function DocsCodeSnippet({
  example,
  activeLanguage,
  className,
  copyLabel = "Copy code",
  description,
  externalHeader = false,
  footer,
  kind = "code",
  onLanguageChange,
  optionsLabel,
  showSingleVariantAsTabs = false,
  staticEnhancement = false,
  title,
}: DocsCodeSnippetProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const defaultActiveIndex = Math.max(
    0,
    example.variants.findIndex((variant) => variant.active),
  );
  const [internalActiveLanguage, setInternalActiveLanguage] =
    useState<CodeSnippetLanguage>(
      example.variants[defaultActiveIndex]?.language ||
        example.variants[0]?.language ||
        "text",
    );
  const [copied, setCopied] = useState(false);
  const currentLanguage = activeLanguage || internalActiveLanguage;
  const activeIndex = staticEnhancement
    ? defaultActiveIndex
    : Math.max(
        0,
        example.variants.findIndex(
          (variant) => variant.language === currentLanguage,
        ),
      );
  const activeVariant = example.variants[activeIndex] || example.variants[0];
  const hasLanguageOptions =
    showSingleVariantAsTabs || example.variants.length > 1;
  const renderedFooter =
    footer ||
    (example.callouts?.length ? (
      <ol>
        {example.callouts.map((callout, index) => (
          <li key={index}>
            <p>{callout}</p>
          </li>
        ))}
      </ol>
    ) : undefined);

  function activate(index: number, focus = false) {
    const variant = example.variants[index];
    if (!variant) {
      return;
    }
    if (!activeLanguage) {
      setInternalActiveLanguage(variant.language);
    }
    onLanguageChange?.(variant.language);
    setCopied(false);
    if (focus) {
      window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
    }
  }

  async function copyActiveSnippet() {
    if (!activeVariant) {
      return;
    }
    try {
      await navigator.clipboard.writeText(activeVariant.code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = activeVariant.code;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!activeVariant) {
    return null;
  }

  const card = (
    <DocsSnippetCard
      id={example.id}
      className={className}
      kind={kind}
      title={externalHeader ? undefined : title}
      description={externalHeader ? undefined : description}
      controls={
        hasLanguageOptions ? (
          <div
            className="docs-snippet-tabs docs-code-tabs docs-code-tabs-multi"
            role="tablist"
            aria-label={optionsLabel || `${example.label} language`}
          >
            {example.variants.map((variant, index) => {
              const active = index === activeIndex;
              const tabId = snippetTabId(example.id, variant);
              const panelId = snippetPanelId(example.id, variant);
              return (
                <DocsSnippetLanguageButton
                  key={`${variant.language}-${index}`}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  active={active}
                  id={tabId}
                  type="button"
                  role="tab"
                  aria-controls={panelId}
                  aria-selected={active}
                  data-lang={variant.language}
                  tabIndex={active ? 0 : -1}
                  onClick={
                    staticEnhancement ? undefined : () => activate(index)
                  }
                  onKeyDown={
                    staticEnhancement
                      ? undefined
                      : (event) => {
                          if (
                            event.key !== "ArrowRight" &&
                            event.key !== "ArrowLeft"
                          ) {
                            return;
                          }
                          event.preventDefault();
                          const offset = event.key === "ArrowRight" ? 1 : -1;
                          const nextIndex =
                            (index + offset + example.variants.length) %
                            example.variants.length;
                          activate(nextIndex, true);
                        }
                  }
                >
                  <DocsSnippetCodeLanguageIcon language={variant.language} />
                  <span className="docs-code-language-text">
                    {variant.label}
                  </span>
                </DocsSnippetLanguageButton>
              );
            })}
          </div>
        ) : (
          <DocsSnippetStaticLanguage
            aria-label={`${activeVariant.label} snippet`}
          >
            <DocsSnippetCodeLanguageIcon language={activeVariant.language} />
            <span className="docs-code-language-text">
              {activeVariant.label}
            </span>
          </DocsSnippetStaticLanguage>
        )
      }
      action={
        <DocsSnippetCopyButton
          aria-label={
            copied ? "Copied" : `Copy ${activeVariant.fileName || copyLabel}`
          }
          title={
            copied ? "Copied" : `Copy ${activeVariant.fileName || copyLabel}`
          }
          onClick={staticEnhancement ? undefined : copyActiveSnippet}
          {...(staticEnhancement ? { "data-copy-active-snippet": "" } : {})}
        >
          <CopyIcon />
          <span className="sr-only" aria-live="polite">
            {copied ? "Copied" : copyLabel}
          </span>
        </DocsSnippetCopyButton>
      }
      footer={renderedFooter}
    >
      {example.variants.map((variant, index) => {
        const active = index === activeIndex;
        const tabId = snippetTabId(example.id, variant);
        const panelId = snippetPanelId(example.id, variant);
        return (
          <div
            key={`${variant.language}-${index}`}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            aria-hidden={!active}
            hidden={!active}
            className="docs-code-content docs-snippet-card-content"
          >
            {variant.importsCode ? (
              <FoldedImports
                code={variant.importsCode}
                highlightedHtml={variant.highlightedImportsHtml}
                language={variant.language}
              />
            ) : null}
            <HighlightedCodeBlock
              code={variant.bodyCode ?? variant.code}
              highlightedHtml={variant.highlightedHtml}
              language={variant.language}
            />
          </div>
        );
      })}
    </DocsSnippetCard>
  );

  if (externalHeader) {
    return (
      <>
        {renderSnippetExternalHeader(title, description)}
        {card}
      </>
    );
  }

  return card;
}

function renderSnippetExternalHeader(
  title?: ReactNode,
  description?: ReactNode,
) {
  if (!title && !description) {
    return null;
  }
  if (description) {
    return (
      <div className="docs-snippet-external-header">
        {title ? (
          <div className="docs-snippet-external-header-title">{title}</div>
        ) : null}
        <div className="docs-snippet-external-header-description">
          {description}
        </div>
      </div>
    );
  }
  return <div className="title docs-snippet-external-title">{title}</div>;
}

function snippetTabId(exampleId: string, variant: CodeSnippetVariant) {
  return variant.tabId || `${exampleId}-${variant.language}-tab`;
}

function snippetPanelId(exampleId: string, variant: CodeSnippetVariant) {
  return variant.panelId || `${exampleId}-${variant.language}-panel`;
}
