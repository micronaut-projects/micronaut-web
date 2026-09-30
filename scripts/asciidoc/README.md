# AsciiDoc Rendering Pipeline

This directory contains the shared AsciiDoc rendering pipeline used by generated
Micronaut docs and guides. The build reads adoc sources, registers focused
Asciidoctor.js extensions, and emits static HTML fragments. Snippets,
dependencies, configuration examples, and source listings are rendered as shared
React component markup during conversion.

## Inputs

Docs rendering starts in `scripts/docs/renderer.ts`.

- The renderer reads a checked-out Micronaut project from `.docs/repos`.
- It reads each project's `src/main/docs/guide/toc.yml`.
- Each TOC node points at an adoc file under `src/main/docs/guide`.
- Project attributes are built from platform metadata, checked-in project
  metadata, and the project's `gradle.properties`.
- Raw adoc source is passed to Asciidoctor with `micronautExtensionRegistry(...)`.

Guides rendering starts in `scripts/guides/renderer.ts`.

- The renderer reads the selected guide adoc file directly.
- Guide metadata and the selected language/build/test option become a
  `GuideRenderContext`.
- Raw guide source is passed to Asciidoctor with `guideExtensionRegistry(...)`.

There is no separate source expansion step before Asciidoctor conversion. Source
shape fixes, guide macro expansion, and snippet rendering are extension
responsibilities.

## Docs Extensions

`scripts/asciidoc/extensions/index.ts` creates a registry with
`asciidoctor.Extensions.create()` and passes it to focused register functions.

The docs registry registers:

- `registerDocsSourcePreprocessor(...)`, which handles legacy docs source shapes
  that must be adjusted before parsing.
- inline API macros such as `api:`, `ann:`, `mnapi:`, `jdk:`, `rs:`, `rx:`, and
  `reactor:`
- the `pkg:` inline macro
- the `snippet::target[]` block macro
- the `dependency::target[]` block macro
- the shared component rendering extensions: the `[configuration]` listing
  block and the tree processor that attaches a following callout list to an
  ordinary listing

The old `normalizeAsciiDocSource(...)` function and the old pre-conversion
snippet/dependency expansion helpers are not used. Equivalent behavior now lives
in register files under `scripts/asciidoc/extensions/`.

## Shared Extension Helpers

The logic that several register files need lives in shared modules. New
processors should import from them rather than redefining it locally.

- `extensions/macro-attributes.ts` owns `macroAttribute(...)`, which reads a
  macro attribute from Asciidoctor's parsed map or falls back to scanning the
  raw attribute text, `macroText(...)` for inline link text,
  `parseAttributeList(...)` for attribute text the preprocessor sees before
  Asciidoctor does, and the `MacroPayload` shape the guide processors use.
- `callouts.ts` owns the callout-list scanner that snippet processors use to
  absorb the `<1>` lines that follow a block, with an array-backed reader for
  tests.
- `api-links.ts`, `configuration-formats.ts` and `docs-source-rewrites.ts`
  hold the pure logic behind the API macros, the `[configuration]` block and
  the docs preprocessor, so it can be unit tested without Asciidoctor.
- `scripts/shared/dependency-coordinates.ts` owns the dependency model, the
  Gradle and Maven scope tables and the rendered build-tool text for both the
  docs and the guides dependency macros.
- `scripts/shared/tagged-source.ts` owns tag selection, snippet de-indentation
  and the diagnostic message for missing or empty tags.

## Guide Extensions

`scripts/guides/extensions/index.ts` creates the guide registry and registers all
guide-specific Asciidoctor behavior.

The guide registry registers:

- `registerGuidePreprocessor(...)`, which replaces guide placeholders, appends
  the license include, rewrites include targets, expands `common::`,
  `external::`, the `-template` variants and `callout::` in place, rewrites
  legacy exclude directives such as `:exclude-for-languages:groovy` and its
  inverse `:only-for-languages:java,kotlin` into
  `ifeval::[]`/`endif::[]` conditionals, and wraps `:dependencies:` groups in
  a `[guide-dependencies]` open block whose body lists the `dependency::`
  macros. The in-place expansions must happen before parsing because the
  included source may itself contain `include::` directives and callout lists
  that the snippet macros absorb from the document reader. There is no other
  preprocessor contract: block processors read their input from the block
  body and the document reader, never from an encoded attribute.
- `registerGuideSnippetBlocks(...)`, which registers `source::`, `test::`,
  `rawTest::`, `resource::`, `testResource::`, and `zipInclude::` block macros
  and renders them as snippet cards.
- `registerGuideDependenciesBlock(...)`, which registers the `dependency::`
  block macro and renders grouped `:dependencies:` blocks as Gradle or Maven
  snippets.
- `registerGuideContentBlocks(...)`, which registers the `rocker::` and
  `diffLink::` block macros.
- `registerGuideLinkMacro(...)`, which handles guide links.

There is no `scripts/guides/preprocessor.ts` or `scripts/guides/guide-blocks.ts`
path. The guide renderer does not expand snippets before Asciidoctor runs.

## Snippet Rendering

Snippet-like output is rendered by block processors, not by HTML postprocessing.

Docs snippets and dependencies are registered from
`scripts/asciidoc/extensions/register-snippet-block.ts` and
`scripts/asciidoc/extensions/register-dependency-block.ts`. Guide snippets and
dependencies are registered from guide extension files.

All of these processors build a payload and call the shared snippet renderer in
`scripts/asciidoc/extensions/snippet-block-renderer.ts`. That renderer creates
pass blocks containing static HTML from `renderSnippetBlock(...)`.

The active Asciidoctor `Reader` is used while a snippet block is processed to
absorb an immediately following callout list. Matching callouts are rendered in
the snippet footer. Unmatched callout lines are pushed back into the reader so
AsciiDoc can still parse them as normal callout content.

This keeps callout handling inside the AsciiDoc pipeline. Generated HTML should
not contain carrier blocks, marker elements, or unconsumed guide macro syntax.

## Conversion

`scripts/asciidoc/rendering.ts` owns the final conversion call.

It creates an Asciidoctor memory logger, installs component rendering
extensions, and calls `asciidoctor.convert(...)` with:

- `header_footer: false`
- `safe: "unsafe"`
- the caller's attributes and `base_dir`
- `MicronautComponentHtmlConverter` as the default converter
- the prepared extension registry

Diagnostics are collected from the memory logger. In strict mode,
caller-supplied fatal diagnostic filters decide which Asciidoctor warnings fail
the render.

## Component Converter

`MicronautComponentHtmlConverter` only handles ordinary listing blocks, with any
`tag::`/`end::` directives stripped from the source, since Asciidoctor only
removes them when an include selects a tag. Generated configuration property
tables are not rendered: the preprocessor drops their includes.

Snippet and dependency macro output is handled by block processors. The
converter should not own guide macro expansion, snippet payload resolution, or
dependency snippet generation.

## Syntax Highlighting

Shiki highlighting runs during build/server-side rendering.

- Snippet panels are highlighted while rendering the generated snippet card.
- Ordinary listing blocks are highlighted through the component converter.

The browser enhancer does not perform syntax highlighting.

## Browser Enhancement

Generated fragments are usable as static HTML. The browser script in
`src/components/web/generated-docs-static-enhancer.astro` progressively adds:

- snippet language or dependency-format tab switching
- active-panel copy buttons
- generated image loading stabilization

The enhancement script expects the static markup shape emitted by the AsciiDoc
pipeline. It does not render snippets, wrap configuration property tables, or
act as a fallback for raw Asciidoctor HTML.

## Removed Legacy Paths

The current pipeline does not use:

- `<micronaut-snippet>` marker elements
- `static-snippets.ts`
- `generated-docs-enhancer.astro`
- `generated-docs-properties-fallback.astro`
- `micronaut-snippet` wrapper parsing
- `normalizeAsciiDocSource(...)`
- `scripts/guides/preprocessor.ts`
- `scripts/guides/guide-blocks.ts`
- pre-conversion snippet or dependency expansion outside Asciidoctor extensions
- AsciiDoc HTML postprocessing for snippets or callouts, including the
  `highlightListingBlocks(...)` post-processing highlighter
- `[snippet,payload=...]`, `[dependency,payload=...]` and
  `[guide-dependencies,payload=...]` blocks carrying base64 JSON; block
  processors read their body and the document reader instead
- `docs-snippet-callout-validation` listings
- `[guide-*]` open-block forms of the guide macros and block-processor copies
  of `common::`, `external::`, `callout::` and the exclude directives
- `@ts-nocheck` register files; extensions are registered through the typed
  helpers in `extensions/define.ts`

All snippet, dependency, callout, guide macro, and configuration rendering must
stay inside the AsciiDoc rendering pipeline.

## Output

Docs rendering writes generated fragments under `src/content/generated-docs`.
Guides rendering writes generated fragments under
`src/content/generated-guides`. Those generated HTML files and copied assets are
ignored by Git and rebuilt by dev, build, and surface build commands.

## Useful Checks

Run the shared AsciiDoc tests after changing this directory:

```bash
npm run test:asciidoc
```

Run guide tests after changing guide extensions:

```bash
npm run test:guides
```

Run script typechecking when changing Extension API types or renderer contracts:

```bash
npm run typecheck:scripts
```

Run the full repository check before merging broader rendering changes:

```bash
npm run check
```
