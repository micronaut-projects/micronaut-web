import { renderToStaticMarkup } from "react-dom/server";

import { DocsCodeSnippet } from "./docs-code-snippet";

type GeneratedSnippetKind = "code" | "dependency";

type GeneratedSnippetVariant = {
  active: boolean;
  highlightedHtml: string;
  highlightedImportsHtml?: string;
  importsSource?: string;
  label: string;
  language: string;
  panelId: string;
  source: string;
  tabId: string;
};

type GeneratedSnippetInput = {
  copyLabel: string;
  descriptionHtml?: string;
  footerHtml?: string;
  id: string;
  kind: GeneratedSnippetKind;
  optionsLabel: string;
  titleHtml?: string;
  variants: GeneratedSnippetVariant[];
};

export function renderGeneratedSnippet(input: GeneratedSnippetInput) {
  const {
    copyLabel,
    descriptionHtml = "",
    footerHtml = "",
    id,
    kind,
    optionsLabel,
    titleHtml = "",
    variants,
  } = input;

  return `${renderToStaticMarkup(
    <DocsCodeSnippet
      example={{
        id,
        label: optionsLabel,
        variants: variants.map((variant) => ({
          active: variant.active,
          code: variant.source,
          fileName: variant.label,
          highlightedHtml: variant.highlightedHtml,
          highlightedImportsHtml: variant.highlightedImportsHtml,
          importsCode: variant.importsSource,
          label: variant.label,
          language: variant.language,
          panelId: variant.panelId,
          tabId: variant.tabId,
        })),
      }}
      kind={kind}
      copyLabel={copyLabel}
      description={htmlInline(descriptionHtml)}
      externalHeader={kind === "code"}
      footer={footerHtml ? htmlBlock(footerHtml) : undefined}
      optionsLabel={optionsLabel}
      showSingleVariantAsTabs
      staticEnhancement
      title={htmlInline(titleHtml)}
    />,
  )}\n`;
}

function htmlInline(value: string) {
  return value ? <span dangerouslySetInnerHTML={{ __html: value }} /> : null;
}

function htmlBlock(value: string) {
  return <div dangerouslySetInnerHTML={{ __html: value }} />;
}
