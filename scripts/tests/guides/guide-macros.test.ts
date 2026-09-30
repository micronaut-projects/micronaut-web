import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

import { normalizeSourceCalloutMarkers } from "../../guides/extensions/register-guide-snippet-blocks.ts";
import {
  isFatalGuideDiagnostic,
  isIgnoredGuideDiagnostic,
} from "../../guides/renderer.ts";
import {
  admonitions,
  highlightedLines,
  manualCallouts,
  snippetCards,
  textOnly,
} from "../support/html.ts";
import { asciidocFixtureDirectory } from "../support/paths.ts";
import { renderGuide } from "../support/render.ts";

describe("the guide macro gallery", () => {
  test("expands every guide macro through the extension registry", async () => {
    const html = await renderGuide(
      await fs.readFile(
        path.join(asciidocFixtureDirectory, "snippet-gallery.adoc"),
        "utf8",
      ),
      { attributes: { "guide-macro-gallery": "" } },
    );
    const text = textOnly(html);
    const cards = snippetCards(html);
    const titles = cards.map((card) => card.title);

    assert.match(text, /Common guide snippet content/);
    assert.match(text, /Common template value: COMMON/);
    assert.match(text, /External guide include content/);
    assert.match(text, /External template value: external/);
    assert.match(text, /Rocker template include content/);
    assert.match(html, /href="gallery-linked\.html"/);
    assert.match(html, /https:\/\/launch\.micronaut\.io\?/);

    assert.deepEqual(titles, [
      "java/src/main/java/example/micronaut/GalleryController.java",
      "java/src/test/java/example/micronaut/GalleryControllerTest.java",
      "java/src/test/java/example/micronaut/GalleryRawTest.java",
      "src/main/resources/application.yml",
      "src/test/resources/application-test.yml",
      "build.gradle",
      "build.gradle",
      "build.gradle",
    ]);
    assert.deepEqual(cards[0].callouts, [
      {
        number: "1",
        text: "Source callout loaded from a guide callout macro.",
      },
    ]);
    assert.match(cards[3].activeCode, /name: guide-gallery/);
    assert.match(cards[4].activeCode, /enabled: true/);
    assert.equal(
      cards[6].activeCode,
      'implementation("io.micronaut.serde:micronaut-serde-jackson") // <1>',
    );
    assert.deepEqual(cards[6].callouts, [
      { number: "1", text: "Single dependency callout." },
    ]);
    assert.equal(
      cards[7].activeCode,
      [
        'implementation("io.micronaut:micronaut-http-client") // <1>',
        'implementation("io.micronaut.validation:micronaut-validation") // <2>',
      ].join("\n"),
    );
    assert.deepEqual(cards[7].callouts, [
      { number: "1", text: "Grouped HTTP client dependency." },
      { number: "2", text: "Grouped validation dependency." },
    ]);

    assert.match(text, /Visible after exclude directives/);
    assert.match(text, /Kotlin-only excluded text should render for Java/);
    assert.match(text, /Maven-only excluded text should render for Gradle/);
    assert.doesNotMatch(text, /should not render/);
    assert.doesNotMatch(
      html,
      /source:{1,2}|test:{1,2}|rawTest:{1,2}|resource:{1,2}|testResource:{1,2}|zipInclude:{1,2}|common-template:{1,2}|external-template:{1,2}|rocker:{1,2}|diffLink:{1,2}|callout:{1,2}|exclude-for-languages:{1,2}|only-for-languages:{1,2}|exclude-for-build:{1,2}|exclude-for-jdk-lower-than:{1,2}/,
    );
  });
});

describe("content macro expansion", () => {
  test("stops at an include cycle with a note instead of recursing", async () => {
    const text = textOnly(await renderGuide("common::gallery-cycle.adoc[]\n"));

    assert.equal(
      text,
      "Cycle start. Skipped recursive include common-gallery-cycle.adoc.",
    );
  });
});

test("dependency version placeholders resolve from the guides pom", async () => {
  assert.equal(
    textOnly(
      await renderGuide("Awaitility @awaitilityVersion@, @unknownVersion@."),
    ),
    "Awaitility 4.3.0, @unknownVersion@.",
  );
});

describe("legacy exclude directives", () => {
  const source = [
    ":exclude-for-languages:groovy",
    "Groovy excluded text.",
    ":exclude-for-languages:",
    ":exclude-for-languages:java,groovy",
    "Java and Groovy excluded text.",
    ":exclude-for-languages:",
    ":exclude-for-languages:kotlin",
    "Kotlin excluded text.",
    ":exclude-for-languages:",
    ":exclude-for-languages:java",
    ":exclude-for-languages:kotlin",
    "Adjacent Java and Kotlin excluded text.",
    ":exclude-for-languages:",
    ":exclude-for-languages:groovy,kotlin",
    "Groovy and Kotlin excluded text.",
    ":exclude-for-languages:",
    ":exclude-for-build:maven",
    "Maven excluded text.",
    ":exclude-for-build:",
    ":exclude-for-build:gradle",
    "Gradle excluded text.",
    ":exclude-for-build:",
    ":exclude-for-jdk-lower-than:21",
    "JDK excluded text.",
    ":exclude-for-jdk-lower-than:",
    "Always visible text.",
  ].join("\n");

  const paragraphs = async (option: {
    buildTool: string;
    language: string;
  }): Promise<string[]> =>
    textOnly(await renderGuide(source, { option }))
      .split(/(?<=\.)\s+/)
      .filter((paragraph) => paragraph.endsWith("text."));

  test("hide content for the rendered language and build tool", async () => {
    assert.deepEqual(
      await paragraphs({ buildTool: "gradle", language: "java" }),
      [
        "Groovy excluded text.",
        "Kotlin excluded text.",
        "Groovy and Kotlin excluded text.",
        "Maven excluded text.",
        "Always visible text.",
      ],
    );
    assert.deepEqual(
      await paragraphs({ buildTool: "maven", language: "groovy" }),
      [
        "Kotlin excluded text.",
        "Adjacent Java and Kotlin excluded text.",
        "Gradle excluded text.",
        "Always visible text.",
      ],
    );
  });

  test("show only-for-languages content for the listed languages", async () => {
    const only = [
      ":only-for-languages:groovy",
      "Groovy only text.",
      ":only-for-languages:",
      ":only-for-languages:java,kotlin",
      "Java and Kotlin only text.",
      ":only-for-languages:",
      ":only-for-languages:java",
      ":only-for-languages:groovy",
      "Adjacent Java and Groovy only text.",
      ":only-for-languages:",
      "Always visible text.",
    ].join("\n");
    const render = async (language: string): Promise<string> =>
      textOnly(
        await renderGuide(only, { option: { buildTool: "gradle", language } }),
      );

    assert.equal(
      await render("java"),
      "Java and Kotlin only text. Adjacent Java and Groovy only text. Always visible text.",
    );
    assert.equal(
      await render("groovy"),
      "Groovy only text. Adjacent Java and Groovy only text. Always visible text.",
    );
    assert.equal(
      await render("kotlin"),
      "Java and Kotlin only text. Always visible text.",
    );
  });

  test("nest", async () => {
    const nested = [
      ":exclude-for-languages:groovy",
      "Native intro text.",
      ":exclude-for-build:maven",
      "Gradle native text.",
      ":exclude-for-build:",
      ":exclude-for-build:gradle",
      "Maven native text.",
      ":exclude-for-build:",
      ":exclude-for-languages:",
      "After native text.",
    ].join("\n");
    const render = async (option: {
      buildTool: string;
      language: string;
    }): Promise<string> => textOnly(await renderGuide(nested, { option }));

    assert.equal(
      await render({ buildTool: "gradle", language: "java" }),
      "Native intro text. Gradle native text. After native text.",
    );
    assert.equal(
      await render({ buildTool: "maven", language: "java" }),
      "Native intro text. Maven native text. After native text.",
    );
    assert.equal(
      await render({ buildTool: "gradle", language: "groovy" }),
      "After native text.",
    );
  });

  test("treat an unmatched reset as a no-op and an unterminated directive as open to the end", async () => {
    const unmatched = [
      ":exclude-for-build:",
      "Visible after unmatched build reset.",
      ":exclude-for-languages:groovy",
      "First Groovy-gated text.",
      ":exclude-for-languages:groovy",
      "Second Groovy-gated text.",
    ].join("\n");

    assert.equal(
      textOnly(
        await renderGuide(unmatched, {
          option: { buildTool: "gradle", language: "java" },
        }),
      ),
      "Visible after unmatched build reset. First Groovy-gated text. Second Groovy-gated text.",
    );
    assert.equal(
      textOnly(
        await renderGuide(unmatched, {
          option: { buildTool: "gradle", language: "groovy" },
        }),
      ),
      "Visible after unmatched build reset.",
    );
  });
});

describe("dependency groups", () => {
  const source = [
    ":dependencies:",
    "dependency::micronaut-http-client[groupId=io.micronaut,callout=1]",
    "dependency::micronaut-validation[groupId=io.micronaut.validation,scope=test,callout=2]",
    "dependency::micronaut-bom[groupId=io.micronaut.platform,pom=true,version=4.9.0]",
    "dependency::micronaut-inject-java[groupId=io.micronaut,scope=annotationProcessor,versionProperty=${micronaut.version}]",
    ":dependencies:",
    "<1> Adds HTTP client dependency.",
    "<2> Adds validation dependency.",
  ].join("\n");

  test("render one Gradle card for the group", async () => {
    const [card] = snippetCards(
      await renderGuide(source, { option: { buildTool: "gradle" } }),
    );

    assert.equal(card.title, "build.gradle");
    assert.deepEqual(card.tabs, ["Gradle"]);
    assert.equal(
      card.activeCode,
      [
        'implementation("io.micronaut:micronaut-http-client") // <1>',
        'testImplementation("io.micronaut.validation:micronaut-validation") // <2>',
        'implementation platform("io.micronaut.platform:micronaut-bom:4.9.0")',
        'annotationProcessor("io.micronaut:micronaut-inject-java")',
      ].join("\n"),
    );
    assert.deepEqual(card.callouts, [
      { number: "1", text: "Adds HTTP client dependency." },
      { number: "2", text: "Adds validation dependency." },
    ]);
  });

  test("render one Maven card for the group", async () => {
    const html = await renderGuide(source, { option: { buildTool: "maven" } });
    const [card] = snippetCards(html);

    assert.equal(card.title, "pom.xml");
    assert.deepEqual(card.tabs, ["Maven"]);
    assert.equal(
      card.activeCode,
      [
        "<dependency> // <1>",
        "    <groupId>io.micronaut</groupId>",
        "    <artifactId>micronaut-http-client</artifactId>",
        "    <scope>compile</scope>",
        "</dependency>",
        "<dependency> // <2>",
        "    <groupId>io.micronaut.validation</groupId>",
        "    <artifactId>micronaut-validation</artifactId>",
        "    <scope>test</scope>",
        "</dependency>",
        "<!-- Add the following to your dependencyManagement element -->",
        "<dependency>",
        "    <groupId>io.micronaut.platform</groupId>",
        "    <artifactId>micronaut-bom</artifactId>",
        "    <version>4.9.0</version>",
        "    <type>pom</type>",
        "    <scope>import</scope>",
        "</dependency>",
        "",
        "<!-- Add the following to your annotationProcessorPaths element -->",
        "<path>",
        "    <groupId>io.micronaut</groupId>",
        "    <artifactId>micronaut-inject-java</artifactId>",
        "    <version>${micronaut.version}</version>",
        "</path>",
      ].join("\n"),
    );
    assert.deepEqual(
      card.callouts.map((callout) => callout.number),
      ["1", "2"],
    );
    assert.doesNotMatch(html, /:dependencies:|dependency:{1,2}micronaut/);
  });

  test("group the single-colon form that guide sources use", async () => {
    const html = await renderGuide(
      [
        ":dependencies:",
        "dependency:micronaut-validation[groupId=io.micronaut.validation,callout=1]",
        "dependency:micronaut-http-client[groupId=io.micronaut,callout=2]",
        ":dependencies:",
        "<1> Validation.",
        "<2> HTTP client.",
      ].join("\n"),
      { option: { buildTool: "gradle" } },
    );
    const cards = snippetCards(html);

    assert.equal(cards.length, 1);
    assert.equal(
      cards[0].activeCode,
      [
        'implementation("io.micronaut.validation:micronaut-validation") // <1>',
        'implementation("io.micronaut:micronaut-http-client") // <2>',
      ].join("\n"),
    );
    assert.deepEqual(
      cards[0].callouts.map((callout) => callout.text),
      ["Validation.", "HTTP client."],
    );
  });
});

describe("source snippets", () => {
  test("de-indent tagged regions and keep the callout marker", async () => {
    const html = await renderGuide("source:GalleryController[tags=index]\n");

    assert.deepEqual(highlightedLines(html), [
      "String index() { // <1>",
      '    return "gallery";',
      "}",
    ]);
  });

  test("render unmatched callout items inline after the card", async () => {
    const html = await renderGuide(
      [
        "source::GalleryController[]",
        "<1> Index callout.",
        "<2> Manual callout.",
      ].join("\n"),
    );

    assert.deepEqual(snippetCards(html)[0].callouts, [
      { number: "1", text: "Index callout." },
    ]);
    assert.deepEqual(manualCallouts(html), ["Manual callout."]);
  });

  test("explain missing sources, tags and resources in place", async () => {
    const html = await renderGuide(
      [
        "source::GalleryController[tags=missing]",
        "",
        "source::EmptyController[tag=empty]",
        "",
        "resource::application.yml[tag=missing-config]",
        "",
        "source::MissingController[]",
      ].join("\n"),
    );
    // Admonitions, not snippet cards: rendering these as code published the
    // placeholder as though it were the sample the guide meant to show.
    assert.deepEqual(snippetCards(html), []);
    assert.deepEqual(admonitions(html), [
      "Missing tag missing in java/src/main/java/example/micronaut/GalleryController.java.",
      "Empty tag empty in java/src/main/java/example/micronaut/EmptyController.java.",
      "Missing tag missing-config in src/main/resources/application.yml.",
      "Missing source MissingController.",
    ]);
  });

  test("normalize shorthand comment callout markers", () => {
    assert.equal(
      normalizeSourceCalloutMarkers(
        ["name=weather", "# 1>", "transport=http // 2>"].join("\n"),
      ),
      ["name=weather", "# <1>", "transport=http // <2>"].join("\n"),
    );
  });
});

describe("strict guide diagnostics", () => {
  test("ignore the heading shapes upstream guides contain", async () => {
    for (const source of [
      ["=== Application", "", "source::GalleryController[]"].join("\n"),
      [
        "== Build the Application",
        "",
        "= Push to Docker Hub",
        "",
        "source::GalleryController[]",
      ].join("\n"),
    ]) {
      const html = await renderGuide(source, {
        strict: true,
        fatalDiagnostic: isFatalGuideDiagnostic,
        ignoredDiagnostic: isIgnoredGuideDiagnostic,
      });
      assert.equal(snippetCards(html).length, 1);
    }
  });

  test("fail on a missing include", async () => {
    await assert.rejects(
      renderGuide("include::definitely-missing.adoc[]\n", {
        strict: true,
        fatalDiagnostic: isFatalGuideDiagnostic,
        ignoredDiagnostic: isIgnoredGuideDiagnostic,
      }),
      /include file not found/,
    );
  });
});
