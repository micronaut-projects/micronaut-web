import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  type ApiKind,
  apiLink,
  packageLink,
  parseApiTarget,
  projectPagesUri,
} from "../../asciidoc/api-links.ts";

const context = { project: { slug: "core" } };

describe("parseApiTarget", () => {
  test("splits a class, a method with a signature, and a property reference", () => {
    assert.deepEqual(parseApiTarget("io.micronaut.context.BeanContext"), {
      classTarget: "io.micronaut.context.BeanContext",
      methodRef: "",
      propRef: "",
      shortName: "BeanContext",
    });
    assert.deepEqual(
      parseApiTarget(
        "io.micronaut.context.BeanContext.getBean(Class,Qualifier)",
      ),
      {
        classTarget: "io.micronaut.context.BeanContext",
        methodRef: "#getBean-Class-Qualifier-",
        propRef: "",
        shortName: "BeanContext.getBean(Class,Qualifier)",
      },
    );
    assert.deepEqual(parseApiTarget("io.micronaut.http.HttpRequest#getUri"), {
      classTarget: "io.micronaut.http.HttpRequest",
      methodRef: "",
      propRef: "#getUri",
      shortName: "getUri",
    });
  });

  test("keeps a bare method target intact", () => {
    assert.equal(parseApiTarget("run()").shortName, "run()");
  });
});

describe("apiLink", () => {
  const cases: Array<[ApiKind, string, string, string]> = [
    [
      "api",
      "context.BeanContext",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/context/BeanContext.html",
      "BeanContext",
    ],
    [
      "api",
      "io.micronaut.context.BeanContext.getBean(Class)",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/context/BeanContext.html#getBean-Class-",
      "BeanContext.getBean(Class)",
    ],
    [
      "api",
      "http.HttpRequest$Builder",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/http/HttpRequest.Builder.html",
      "HttpRequest$Builder",
    ],
    [
      "api",
      "io.micronaut.http.HttpRequest.Builder",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/http/HttpRequest.Builder.html",
      "Builder",
    ],
    [
      "ann",
      "serde.annotation.Serdeable",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/serde/annotation/Serdeable.html",
      "@Serdeable",
    ],
    [
      "mnapi",
      "context.BeanContext",
      "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/context/BeanContext.html",
      "BeanContext",
    ],
    [
      "jdk",
      "java.util.List",
      "https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html",
      "List",
    ],
    [
      "jee",
      "jakarta.inject.Singleton",
      "https://docs.oracle.com/javaee/6/api/jakarta/inject/Singleton.html",
      "Singleton",
    ],
    [
      "rs",
      "Publisher",
      "https://www.reactive-streams.org/reactive-streams-1.0.3-javadoc/org/reactivestreams/Publisher.html",
      "Publisher",
    ],
    [
      "rx",
      "Flowable",
      "http://reactivex.io/RxJava/2.x/javadoc/io/reactivex/Flowable.html",
      "Flowable",
    ],
    [
      "reactor",
      "Flux",
      "https://projectreactor.io/docs/core/release/api/reactor/core/publisher/Flux.html",
      "Flux",
    ],
  ];

  for (const [kind, target, href, label] of cases) {
    test(`${kind}:${target}[]`, () => {
      assert.deepEqual(apiLink(context, kind, target, {}), { href, label });
    });
  }

  test("routes module projects to their published repository javadoc", () => {
    assert.equal(
      apiLink(
        { project: { slug: "data", repositoryName: "micronaut-data" } },
        "api",
        "data.model.Page",
        {},
      ).href,
      "https://micronaut-projects.github.io/micronaut-data/latest/api/io/micronaut/data/model/Page.html",
    );
    // The repository name wins when it differs from the slug.
    assert.equal(
      apiLink(
        {
          project: { slug: "serde", repositoryName: "micronaut-serialization" },
        },
        "ann",
        "serde.annotation.Serdeable",
        {},
      ).href,
      "https://micronaut-projects.github.io/micronaut-serialization/latest/api/io/micronaut/serde/annotation/Serdeable.html",
    );
  });

  test("prefers the link text from the macro, keeping the annotation prefix", () => {
    assert.equal(
      apiLink(context, "api", "context.BeanContext", { text: "the context" })
        .label,
      "the context",
    );
    assert.equal(
      apiLink(context, "ann", "context.annotation.Bean", {
        $positional: ["Bean annotation"],
      }).label,
      "@Bean annotation",
    );
  });

  test("honours document attributes that relocate external javadocs", () => {
    const attributed = {
      attributes: {
        jdkapi: "https://docs.oracle.com/en/java/javase/17/docs/api",
        micronautapi: "https://docs.micronaut.io/4.9.0/api",
      },
    };

    assert.equal(
      apiLink(attributed, "jdk", "java.time.Duration", {}).href,
      "https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/time/Duration.html",
    );
    assert.equal(
      apiLink(attributed, "mnapi", "context.BeanContext", {}).href,
      "https://docs.micronaut.io/4.9.0/api/io/micronaut/context/BeanContext.html",
    );
  });

  test("honours per-macro module, defaultUri and packagePrefix overrides", () => {
    assert.equal(
      apiLink(context, "jdk", "java.sql.Connection", { module: "java.sql" })
        .href,
      "https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/Connection.html",
    );
    assert.equal(
      apiLink(context, "jdk", "javax.validation.Valid", { module: "" }).href,
      "https://docs.oracle.com/en/java/javase/21/docs/api/javax/validation/Valid.html",
    );
    assert.equal(
      apiLink(context, "api", "Foo", {
        defaultUri: "https://example.test/api",
        packagePrefix: "com.example.",
      }).href,
      "https://example.test/api/com/example/Foo.html",
    );
  });
});

describe("packageLink", () => {
  test("links to the package summary under the project's javadoc", () => {
    assert.deepEqual(packageLink(context, "data.annotation", {}), {
      href: "https://micronaut-projects.github.io/micronaut-docs/latest/api/io/micronaut/data/annotation/package-summary.html",
      label: "io.micronaut.data.annotation",
    });
    assert.deepEqual(
      packageLink(
        { attributes: { projectSlug: "data" } },
        "io.micronaut.data.model",
        { text: "model package" },
      ),
      {
        href: "https://micronaut-projects.github.io/micronaut-data/latest/api/io/micronaut/data/model/package-summary.html",
        label: "model package",
      },
    );
  });
});

describe("projectPagesUri", () => {
  test("sends Core, and projects rendered out of its guide, to micronaut-docs", () => {
    for (const project of [
      { slug: "core" },
      { slug: "http", repositoryName: "micronaut-core" },
    ]) {
      assert.equal(
        projectPagesUri({ project }),
        "https://micronaut-projects.github.io/micronaut-docs",
      );
    }
  });

  test("uses a module's repository even when no slug is known", () => {
    assert.equal(
      projectPagesUri({ project: { repositoryName: "micronaut-data" } }),
      "https://micronaut-projects.github.io/micronaut-data",
    );
  });
});
