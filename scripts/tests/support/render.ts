import * as asciidoctor from "@asciidoctor/core";

import { micronautExtensionRegistry } from "../../asciidoc/extensions/index.ts";
import { renderAsciiDoc } from "../../asciidoc/rendering.ts";
import type { MacroAttributes } from "../../asciidoc/extensions/macro-attributes.ts";
import type { SnippetSample } from "../../asciidoc/extensions/snippet-block-renderer.ts";
import { guideExtensionRegistry } from "../../guides/extensions/index.ts";
import type { GuideRenderContext } from "../../guides/model.ts";
import {
  asciidocFixtureDirectory,
  guideMacroFixtureDirectory,
} from "./paths.ts";
import path from "node:path";

const DEFAULT_ATTRIBUTES = {
  icons: "font",
  idprefix: "",
  idseparator: "-",
};

export type RenderDocsOptions = {
  attributes?: Record<string, unknown>;
  baseDir?: string;
  context?: Record<string, unknown>;
  diagnosticsLabel?: string;
  fatalDiagnostic?: (diagnostic: string) => boolean;
  ignoredDiagnostic?: (diagnostic: string) => boolean;
  samples?: (
    target: string,
    attrs: MacroAttributes,
    context: Record<string, unknown>,
  ) => SnippetSample[];
  strict?: boolean;
};

// Renders a docs fragment through the docs extension registry, with a
// fixture snippet resolver standing in for the checked-out project sources.
export function renderDocs(
  source: string,
  options: RenderDocsOptions = {},
): Promise<string> {
  const context = options.context || {
    attributes: { projectGroup: "io.micronaut" },
  };
  return renderAsciiDoc({
    asciidoctor,
    source,
    diagnosticsLabel: options.diagnosticsLabel,
    strict: options.strict,
    fatalDiagnostic: options.fatalDiagnostic,
    ignoredDiagnostic: options.ignoredDiagnostic,
    convertOptions: {
      attributes: { ...DEFAULT_ATTRIBUTES, ...options.attributes },
      base_dir: options.baseDir || asciidocFixtureDirectory,
      extension_registry: micronautExtensionRegistry(asciidoctor, context, {
        snippetSamples: options.samples || fixtureSnippetSamples,
      }),
    },
  });
}

export type RenderGuideOptions = {
  attributes?: Record<string, unknown>;
  context?: Partial<GuideRenderContext>;
  diagnosticsLabel?: string;
  fatalDiagnostic?: (diagnostic: string) => boolean;
  ignoredDiagnostic?: (diagnostic: string) => boolean;
  option?: Partial<GuideRenderContext["option"]>;
  strict?: boolean;
};

// Renders a guide fragment through the guide extension registry against the
// snippet-gallery guide fixture under scripts/tests/asciidoc/fixtures.
export function renderGuide(
  source: string,
  options: RenderGuideOptions = {},
): Promise<string> {
  const context: GuideRenderContext = {
    ...guideFixtureContext(),
    ...options.context,
  };
  context.option = { ...context.option, ...options.option };
  return renderAsciiDoc({
    asciidoctor,
    source,
    diagnosticsLabel: options.diagnosticsLabel || context.option.id,
    strict: options.strict,
    fatalDiagnostic: options.fatalDiagnostic,
    ignoredDiagnostic: options.ignoredDiagnostic,
    convertOptions: {
      attributes: { ...DEFAULT_ATTRIBUTES, ...options.attributes },
      base_dir: context.guide.directory,
      extension_registry: guideExtensionRegistry(asciidoctor, context),
    },
  });
}

export function guideFixtureContext(): GuideRenderContext {
  const guideDirectory = path.join(
    guideMacroFixtureDirectory,
    "guides",
    "snippet-gallery",
  );
  return {
    guide: {
      apps: [
        {
          applicationType: "DEFAULT",
          features: ["http-client"],
          groovyFeatures: [],
          javaFeatures: [],
          kotlinFeatures: [],
          name: "default",
        },
      ],
      asciidoc: "snippet-gallery.adoc",
      authors: ["Micronaut"],
      base: "",
      buildTools: ["gradle"],
      categories: ["Test"],
      cloud: "",
      directory: guideDirectory,
      intro: "Snippet gallery guide macro fixture.",
      languages: ["java"],
      minimumJavaVersion: "21",
      publicationDate: "2026-01-01",
      publish: true,
      slug: "snippet-gallery",
      tags: ["test"],
      testFramework: "junit",
      title: "Snippet Gallery",
    },
    guidesDirectory: guideMacroFixtureDirectory,
    option: {
      buildTool: "gradle",
      buildToolLabel: "Gradle",
      file: "snippet-gallery-gradle-java.html",
      id: "snippet-gallery-gradle-java",
      label: "Java / Gradle",
      language: "java",
      languageLabel: "Java",
      sourceDir: "snippet-gallery-gradle-java",
      testFramework: "junit",
      zipUrl: "snippet-gallery-gradle-java.zip",
    },
    version: "4.9.0",
    dependencyVersions: { awaitility: "4.3.0" },
  };
}

// Stands in for docsSnippetSamples: the targets the asciidoc tests use.
export function fixtureSnippetSamples(target: string): SnippetSample[] {
  switch (String(target).trim()) {
    case "controller":
      return [
        {
          language: "java",
          source: [
            "import io.micronaut.http.annotation.Controller;",
            "import io.micronaut.http.annotation.Get;",
            "",
            '@Controller("/hello") // <1>',
            "class HelloController {",
            "    @Get",
            "    String index() {",
            '        return "Hello World";',
            "    }",
            "}",
          ].join("\n"),
        },
        {
          language: "kotlin",
          source: [
            "import io.micronaut.http.annotation.Controller",
            "import io.micronaut.http.annotation.Get",
            "",
            '@Controller("/hello") // <1>',
            "class HelloController {",
            "    @Get",
            '    fun index(): String = "Hello World"',
            "}",
          ].join("\n"),
        },
        {
          language: "groovy",
          source: [
            "import io.micronaut.http.annotation.Controller",
            "import io.micronaut.http.annotation.Get",
            "",
            "@Controller('/hello') // <1>",
            "class HelloController {",
            "    @Get",
            "    String index() {",
            "        'Hello World'",
            "    }",
            "}",
          ].join("\n"),
        },
      ];
    case "callouts":
      return [
        {
          language: "java",
          source: [
            "class Example {",
            "    void one() {} // <2>",
            "    void two() {} // <4>",
            "}",
          ].join("\n"),
        },
      ];
    case "event-listener":
      return [
        {
          language: "java",
          source: [
            "import io.micronaut.context.event.ApplicationEventListener;",
            "",
            "class EventListenerFixture implements ApplicationEventListener<SampleEvent> {",
            "    @Override",
            "    public void onApplicationEvent(SampleEvent event) {",
            "    }",
            "}",
          ].join("\n"),
        },
      ];
    case "event-listener-spec":
      return [
        {
          language: "java",
          source: [
            "import io.micronaut.context.ApplicationContext;",
            "import org.junit.jupiter.api.Test;",
            "",
            "class EventListenerFixtureSpec {",
            "    @Test",
            "    void receivesEvents() {",
            "    }",
            "}",
          ].join("\n"),
        },
      ];
    default:
      return [];
  }
}
