---
slug: 2026/09/27/micronaut-framework-5-2-0
title: Micronaut Framework 5.2.0 Released!
description: Micronaut Framework 5.2.0 adds experimental Micronaut for Python support, a new Jakarta EL module, and updates across the Micronaut ecosystem.
date: "2026-09-27T13:00:57"
modified: "2026-09-27T13:00:57"
category: release-announcements
categories:
  - release-announcements
tags:
  - release
href: /2026/09/27/micronaut-framework-5-2-0/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Framework 5.2.0](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.0)!

It includes releases of [Micronaut Core 5.2.8](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.8), [Micronaut Jakarta EL 1.1.0](https://github.com/micronaut-projects/micronaut-jakarta-el/releases/tag/v1.1.0), [Micronaut LangChain4j 2.3.0](https://github.com/micronaut-projects/micronaut-langchain4j/releases/tag/v2.3.0), [Micronaut MCP 2.1.0](https://github.com/micronaut-projects/micronaut-mcp/releases/tag/v2.1.0), [Micronaut Data 5.2.0](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.0), [Micronaut SQL 7.2.0](https://github.com/micronaut-projects/micronaut-sql/releases/tag/v7.2.0), [Micronaut MongoDB 6.2.0](https://github.com/micronaut-projects/micronaut-mongodb/releases/tag/v6.2.0), [Micronaut R2DBC 7.2.0](https://github.com/micronaut-projects/micronaut-r2dbc/releases/tag/v7.2.0), [Micronaut GCP 6.2.0](https://github.com/micronaut-projects/micronaut-gcp/releases/tag/v6.2.0), [Micronaut Security 5.4.0](https://github.com/micronaut-projects/micronaut-security/releases/tag/v5.4.0), [Micronaut Reactor 4.3.0](https://github.com/micronaut-projects/micronaut-reactor/releases/tag/v4.3.0), [Micronaut Views 6.3.1](https://github.com/micronaut-projects/micronaut-views/releases/tag/v6.3.1), [Micronaut Test 5.2.0](https://github.com/micronaut-projects/micronaut-test/releases/tag/v5.2.0), [Micronaut Test Resources 4.3.0](https://github.com/micronaut-projects/micronaut-test-resources/releases/tag/v4.3.0), [Micronaut Validation 5.2.0](https://github.com/micronaut-projects/micronaut-validation/releases/tag/v5.2.0), [Micronaut JSON Schema 2.2.0](https://github.com/micronaut-projects/micronaut-json-schema/releases/tag/v2.2.0), [Micronaut OpenAPI 7.2.0](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.2.0), [Micronaut Serialization 3.2.2](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.2), [Micronaut Servlet 6.2.1](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.1), and [Micronaut SourceGen 2.2.3](https://github.com/micronaut-projects/micronaut-sourcegen/releases/tag/v2.2.3).

## What's new in Micronaut Framework 5.2.0

### Micronaut Core

[Micronaut Core 5.2.8](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.8) adds experimental [Micronaut for Python](https://docs.micronaut.io/5.2.x/core/#core-python) support with GraalPy, the HTTP `QUERY` method, [Cross-Origin-Embedder-Policy](https://docs.micronaut.io/5.2.x/http/#http-corsCrossOriginEmbedderPolicy) and [Cross-Origin-Resource-Policy](https://docs.micronaut.io/5.2.x/http/#http-corsCrossOriginResourcePolicy) header configuration, extensible [response header populators](https://docs.micronaut.io/5.2.x/http/#http-responseHeaderPopulator), and switches to activate or deactivate Netty globally or per server and client.

It also adds a configurable HTTP/2 connection receive window, control over singleton destruction order, `@Bean(preDestroy)` on bean classes, a [`micronaut-reflection`](https://docs.micronaut.io/5.2.x/core/#core-reflection) module, configuration metadata derived from Kotlin KDoc, and language-neutral extension points for Scala. The release reduces cold-start and annotation-processing work, fixes several HTTP and KSP2 issues, and updates Jackson to `3.2.2`, Kotlin to `2.4.10`, and GraalVM to `25.4.4.1.1`.

### New module: Micronaut Jakarta EL

[Micronaut Jakarta EL 1.1.0](https://github.com/micronaut-projects/micronaut-jakarta-el/releases/tag/v1.1.0) is a complete implementation of Jakarta Expression Language 6.0. Expressions are [compiled at build time](https://micronaut-projects.github.io/micronaut-jakarta-el/1.1.0/guide/#declaringExpressions) by an annotation processor, with an optional [sandboxed runtime interpreter](https://micronaut-projects.github.io/micronaut-jakarta-el/1.1.0/guide/#runtimeParsing). Its public API is `@Experimental`.

### AI

[Micronaut LangChain4j 2.3.0](https://github.com/micronaut-projects/micronaut-langchain4j/releases/tag/v2.3.0) updates LangChain4j to `1.20.0` and makes retrieval-augmented generation opt-in through an explicit `RetrievalAugmentor` or `ContentRetriever` bean. [Micronaut MCP 2.1.0](https://github.com/micronaut-projects/micronaut-mcp/releases/tag/v2.1.0) updates the MCP Java SDK to `2.0.1`.

### Data access

[Micronaut Data 5.2.0](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.0) adds [upserts](https://micronaut-projects.github.io/micronaut-data/5.2.0/guide/#upserts), Oracle transaction recovery, sessionless transactions, lock-free reservations, native `BOOLEAN` columns, geography mapping, and criteria navigation through associations. [Micronaut SQL 7.2.0](https://github.com/micronaut-projects/micronaut-sql/releases/tag/v7.2.0) updates its database dependencies and simplifies GraalVM native-image metadata for jOOQ.

[Micronaut MongoDB 6.2.0](https://github.com/micronaut-projects/micronaut-mongodb/releases/tag/v6.2.0) updates the MongoDB Java Driver to `5.12.0`. [Micronaut R2DBC 7.2.0](https://github.com/micronaut-projects/micronaut-r2dbc/releases/tag/v7.2.0) updates the MySQL, MariaDB, PostgreSQL, and Microsoft SQL Server R2DBC drivers.

### Cloud, security, and reactive programming

[Micronaut GCP 6.2.0](https://github.com/micronaut-projects/micronaut-gcp/releases/tag/v6.2.0) fixes request body framing and multipart form field binding in HTTP functions and updates Google Cloud dependencies. [Micronaut Security 5.4.0](https://github.com/micronaut-projects/micronaut-security/releases/tag/v5.4.0) adds Reporting API endpoint support and an authentication bypass for anonymous static resources.

[Micronaut Reactor 4.3.0](https://github.com/micronaut-projects/micronaut-reactor/releases/tag/v4.3.0) updates its dependency and Micronaut alignment. [Micronaut Views 6.3.1](https://github.com/micronaut-projects/micronaut-views/releases/tag/v6.3.1) adds React server-bundle browser refresh support, pluggable rendering contexts, and an option to omit the hydration bootstrap.

### Test, validation, and APIs

[Micronaut Test 5.2.0](https://github.com/micronaut-projects/micronaut-test/releases/tag/v5.2.0) adds support for JUnit parallel test execution and updates Kotest to `6.2.5`. [Micronaut Test Resources 4.3.0](https://github.com/micronaut-projects/micronaut-test-resources/releases/tag/v4.3.0) adds an Azure Cosmos emulator test resource and a thin test resources server artifact.

[Micronaut Validation 5.2.0](https://github.com/micronaut-projects/micronaut-validation/releases/tag/v5.2.0) updates its dependencies and Micronaut alignment. [Micronaut JSON Schema 2.2.0](https://github.com/micronaut-projects/micronaut-json-schema/releases/tag/v2.2.0) adds record generation from discovered schemas and keeps JSON validation reports reachable in native images.

[Micronaut OpenAPI 7.2.0](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.2.0) expands `$dynamicRef` generation to all generic shapes and upgrades OpenAPI Generator to `7.25.0` and Swagger to `2.2.55`. [Micronaut Serialization 3.2.2](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.2) adds CBOR, YAML, XML, and experimental Protocol Buffers support, configurable deserialization coercions, strict builders, and Jackson object identity annotations.

[Micronaut Servlet 6.2.1](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.1) adds WebSocket support for Jetty, Tomcat, and Undertow, including Jakarta WebSocket annotations, and brings the servlet servers closer to parity with the Netty server.

### Build and platform updates

[Micronaut SourceGen 2.2.3](https://github.com/micronaut-projects/micronaut-sourcegen/releases/tag/v2.2.3) adds a JDK ClassFile bytecode backend, staged builders, `@Wither` on individual record components, method references, and full record support in the bytecode writer.

The [Micronaut Platform 5.2.0 guide](https://micronaut-projects.github.io/micronaut-platform/5.2.0/guide/#platform5MigrationImpact) adds a Platform 5 Migration Impact appendix. The platform also updates JUnit to `6.1.3`, Lombok to `1.18.48`, SpotBugs to `4.10.4`, and the managed Maven build plugins.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](https://micronaut.io/support/) if you need any assistance.
