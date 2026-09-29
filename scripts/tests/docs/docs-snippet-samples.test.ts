import assert from "node:assert/strict";
import path from "node:path";
import { describe, test } from "node:test";

import { docsSnippetSamples } from "../../docs/snippet-samples.ts";
import { temporaryDirectory, writeTextFile } from "../support/temp-project.ts";

type Context = Parameters<typeof docsSnippetSamples>[2];

async function submodule(
  t: Parameters<typeof temporaryDirectory>[0],
  files: Record<string, string[]>,
  attributes: Record<string, string> = {},
): Promise<Context> {
  const submoduleDirectory = await temporaryDirectory(
    t,
    "micronaut-web-snippets-",
  );
  for (const [file, lines] of Object.entries(files)) {
    await writeTextFile(path.join(submoduleDirectory, file), lines);
  }
  return { submoduleDirectory, attributes };
}

describe("docsSnippetSamples", () => {
  test("reads every language from the test-suite directories, test sources before main, Python without the io package", async (t) => {
    const context = await submodule(t, {
      "test-suite/src/test/java/io/example/Fixture.java": ["class Fixture {}"],
      "test-suite-python/src/test/python/example/Fixture.py": [
        "class Fixture: pass",
      ],
      "test-suite-kotlin/src/test/kotlin/io/example/Fixture.kt": [
        "class Fixture",
      ],
      "test-suite-groovy/src/main/groovy/io/example/Fixture.groovy": [
        "class Fixture {}",
      ],
    });

    assert.deepEqual(docsSnippetSamples("io.example.Fixture", {}, context), [
      { language: "java", source: "class Fixture {}" },
      { language: "python", source: "class Fixture: pass" },
      { language: "kotlin", source: "class Fixture" },
      { language: "groovy", source: "class Fixture {}" },
    ]);
  });

  test("selects tags, de-indents them and applies the requested indent", async (t) => {
    const context = await submodule(t, {
      "test-suite/src/test/java/example/Tagged.java": [
        "class Tagged {",
        "    // tag::body[]",
        "    void run() {",
        "    }",
        "    // end::body[]",
        "}",
      ],
    });

    assert.equal(
      docsSnippetSamples("example.Tagged", { tags: "body" }, context)[0].source,
      "void run() {\n}",
    );
    assert.equal(
      docsSnippetSamples(
        "example.Tagged",
        { tag: "body", indent: "2" },
        context,
      )[0].source,
      "  void run() {\n  }",
    );
  });

  test("explains missing files and tags in a note sample", async (t) => {
    const context = await submodule(t, {
      "test-suite/src/test/java/example/Tagged.java": [
        "// tag::present[]",
        "class Tagged {}",
        "// end::present[]",
        "// tag::empty[]",
        "// end::empty[]",
      ],
    });

    assert.deepEqual(docsSnippetSamples("example.Missing", {}, context), [
      {
        language: "text",
        source: "NOTE: Missing snippet source `example.Missing`.",
      },
    ]);
    assert.deepEqual(
      docsSnippetSamples("example.Tagged", { tags: "missing,empty" }, context),
      [
        {
          language: "java",
          source:
            "NOTE: Missing tag `missing`; Empty tag `empty` in `test-suite/src/test/java/example/Tagged.java`.",
        },
      ],
    );
    assert.deepEqual(
      docsSnippetSamples(
        "example.Tagged",
        { tags: "missing,present" },
        context,
      ),
      [{ language: "java", source: "class Tagged {}" }],
    );
  });

  test("renders one sample per language from project-base directories, skipping duplicates", async (t) => {
    const context = await submodule(t, {
      "doc-examples/hibernate-example-java/src/main/java/example/Book.java": [
        "class Book {}",
      ],
      "doc-examples/hibernate-example-kotlin/src/main/kotlin/example/Book.kt": [
        "class Book",
      ],
      "doc-examples/hibernate-example-kotlin-ksp/src/main/kotlin/example/Book.kt":
        ["class KspBook"],
      "doc-examples/hibernate-example-groovy/src/main/groovy/example/Book.groovy":
        ["class GroovyBook {}"],
    });

    assert.deepEqual(
      docsSnippetSamples(
        "example.Book",
        { "project-base": "doc-examples/hibernate-example", source: "main" },
        context,
      ),
      [
        { language: "java", source: "class Book {}" },
        { language: "kotlin", source: "class Book" },
        { language: "groovy", source: "class GroovyBook {}" },
      ],
    );
  });

  test("resolves legacy example project aliases and explicit language targets", async (t) => {
    const context = await submodule(t, {
      "examples/example-kubernetes-operator/src/main/java/operator/Lock.java": [
        "class Lock {}",
      ],
      "test-suite/src/test/java/example/Only.java": ["class Only {}"],
      "test-suite-kotlin/src/test/kotlin/example/Only.kt": ["class Only"],
    });

    assert.deepEqual(
      docsSnippetSamples(
        "operator.Lock",
        { project: "examples/micronaut-kubernetes-operator", source: "main" },
        context,
      ),
      [{ language: "java", source: "class Lock {}" }],
    );
    assert.deepEqual(docsSnippetSamples("example.Only.kt", {}, context), [
      { language: "kotlin", source: "class Only" },
    ]);
  });

  test("limits languages to the project's default-language attribute", async (t) => {
    const context = await submodule(
      t,
      {
        "test-suite/src/test/java/example/Only.java": ["class Only {}"],
        "test-suite-kotlin/src/test/kotlin/example/Only.kt": ["class Only"],
      },
      { "default-language": "kotlin" },
    );

    assert.deepEqual(docsSnippetSamples("example.Only", {}, context), [
      { language: "kotlin", source: "class Only" },
    ]);
  });
});
