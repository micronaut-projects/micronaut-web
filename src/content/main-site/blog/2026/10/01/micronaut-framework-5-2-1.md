---
slug: 2026/10/01/micronaut-framework-5-2-1
title: Micronaut Framework 5.2.1 Released!
description: Micronaut Framework 5.2.1 includes Micronaut Core 5.2.11 with Micronaut for Python improvements and HTTP fixes, and updates modules across cloud, messaging, and APIs.
date: "2026-10-01T14:33:13"
modified: "2026-10-01T14:33:13"
category: release-announcements
categories:
  - release-announcements
tags:
  - release
href: /2026/10/01/micronaut-framework-5-2-1/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Framework 5.2.1](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.1)!

It includes releases of [Micronaut Core 5.2.11](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.11), [Micronaut Redis 7.2.0](https://github.com/micronaut-projects/micronaut-redis/releases/tag/v7.2.0), [Micronaut Azure 6.2.0](https://github.com/micronaut-projects/micronaut-azure/releases/tag/v6.2.0), [Micronaut Kubernetes 9.1.0](https://github.com/micronaut-projects/micronaut-kubernetes/releases/tag/v9.1.0), [Micronaut Micrometer 6.1.0](https://github.com/micronaut-projects/micronaut-micrometer/releases/tag/v6.1.0), [Micronaut Tracing 8.3.0](https://github.com/micronaut-projects/micronaut-tracing/releases/tag/v8.3.0), [Micronaut Kafka 6.2.0](https://github.com/micronaut-projects/micronaut-kafka/releases/tag/v6.2.0), [Micronaut MQTT 4.2.0](https://github.com/micronaut-projects/micronaut-mqtt/releases/tag/v4.2.0), [Micronaut Pulsar 3.2.0](https://github.com/micronaut-projects/micronaut-pulsar/releases/tag/v3.2.0), [Micronaut Guice 2.2.0](https://github.com/micronaut-projects/micronaut-guice/releases/tag/v2.2.0), [Micronaut RSS 5.2.0](https://github.com/micronaut-projects/micronaut-rss/releases/tag/v5.2.0), [Micronaut Session 5.2.0](https://github.com/micronaut-projects/micronaut-session/releases/tag/v5.2.0), [Micronaut Liquibase 7.2.0](https://github.com/micronaut-projects/micronaut-liquibase/releases/tag/v7.2.0), [Micronaut Control Panel 2.2.0](https://github.com/micronaut-projects/micronaut-control-panel/releases/tag/v2.2.0), [Micronaut Validation 5.2.1](https://github.com/micronaut-projects/micronaut-validation/releases/tag/v5.2.1), [Micronaut gRPC 5.2.0](https://github.com/micronaut-projects/micronaut-grpc/releases/tag/v5.2.0), [Micronaut JSON Schema 2.3.0](https://github.com/micronaut-projects/micronaut-json-schema/releases/tag/v2.3.0), [Micronaut OpenAPI 7.3.0](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.3.0), [Micronaut Problem JSON 5.1.0](https://github.com/micronaut-projects/micronaut-problem-json/releases/tag/v5.1.0), [Micronaut Serialization 3.2.4](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.4), and [Micronaut Servlet 6.2.2](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.2).

**We recommend that users update to Micronaut Framework 5.2.1.** [Micronaut Core 5.2.11](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.11) updates Jackson to `3.2.3` to pick up a vulnerability fix, and [Micronaut Kafka 6.2.0](https://github.com/micronaut-projects/micronaut-kafka/releases/tag/v6.2.0) requires lz4-java `1.11.2` to resolve a vulnerability in the version that Kafka Clients brings in.

## What's new in Micronaut Framework 5.2.1

### Micronaut Core

[Micronaut Core 5.2.11](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.11) continues the work on Micronaut for Python. Pooled types can now take constructor arguments and carry advice, the [GraalPy context pool](https://docs.micronaut.io/5.2.x/core/#core-_configuring_the_python_context_pool) defaults to half the available processors (at least `2`, at most `8`), and `micronaut.python.pooled.ignoreDependencies` silences the pooled-dependency warning for the dependency types an application names.

It also fixes a leak of the request body when a `@RequestFilter` cannot bind it (such `@Body` types are now rejected at compile time), HTTP/2 client window updates when a backpressured response resumes, chunked streamed responses to HTTP/1.0 clients, and HTTP/2 trailers when the access log is enabled. Further fixes cover circuit breakers shared between beans that inherit the intercepted method, AOP proxy and adapter beans lost across incremental KSP runs, configuration beans replaced by another type on refresh, evaluated expressions for `Optional` arguments, and introspections of types postponed after their first visit.

### Cloud and observability

In [Micronaut Azure 6.2.0](https://github.com/micronaut-projects/micronaut-azure/releases/tag/v6.2.0), the Cosmos client accepts a [custom `CosmosItemSerializer` bean](https://micronaut-projects.github.io/micronaut-azure/6.2.0/guide/#azureCosmosClientConfiguration). The release updates the Azure SDK BOM to `1.3.8`, Azure Cosmos to `4.83.0`, and Azure Monitor OpenTelemetry Autoconfigure to `1.8.0`. [Micronaut Kubernetes 9.1.0](https://github.com/micronaut-projects/micronaut-kubernetes/releases/tag/v9.1.0) removes the `ExecutableMethodProcessor` startup warning logged for the OpenAPI client [informers](https://micronaut-projects.github.io/micronaut-kubernetes/9.1.0/guide/#kubernetes-client-openapi-informer).

[Micronaut Micrometer 6.1.0](https://github.com/micronaut-projects/micronaut-micrometer/releases/tag/v6.1.0) infers the [Stackdriver project ID](https://micronaut-projects.github.io/micronaut-micrometer/6.1.0/guide/#metricsAndReportersStackdriver) from the Google Cloud defaults when it is not configured, and adds `micronaut.metrics.common-tags` as an [alias for common tags](https://micronaut-projects.github.io/micronaut-micrometer/6.1.0/guide/#_meter_registry_configurer). It fixes Netty queue metrics on Micronaut 5, StatsD publishing and Logback metrics in native images, and duplicate `http.server.requests` and `http.client.requests` meters when observation HTTP metrics are enabled. `TimedInterceptor` now runs in the trace phase, and the Netty allocator totals are tagged `size=total` so that the per-size gauges register with Prometheus. The release updates Micrometer to `1.17.1`, Micrometer Tracing to `1.7.1`, and the Prometheus Pushgateway exporter to `1.8.0`.

[Micronaut Tracing 8.3.0](https://github.com/micronaut-projects/micronaut-tracing/releases/tag/v8.3.0) updates OpenTelemetry Instrumentation to `2.30.0` and the OpenTelemetry semantic conventions to `1.43.0`.

### Messaging and data access

[Micronaut Kafka 6.2.0](https://github.com/micronaut-projects/micronaut-kafka/releases/tag/v6.2.0) requires lz4-java `1.11.2`. [Micronaut Pulsar 3.2.0](https://github.com/micronaut-projects/micronaut-pulsar/releases/tag/v3.2.0) updates the [Apache Pulsar](https://pulsar.apache.org/) client to `4.2.4` and Jackson Databind to `2.22.2`. [Micronaut Liquibase 7.2.0](https://github.com/micronaut-projects/micronaut-liquibase/releases/tag/v7.2.0) updates [Liquibase](https://www.liquibase.com/) to `5.0.4`.

[Micronaut MQTT 4.2.0](https://github.com/micronaut-projects/micronaut-mqtt/releases/tag/v4.2.0) and [Micronaut Redis 7.2.0](https://github.com/micronaut-projects/micronaut-redis/releases/tag/v7.2.0) update their dependencies and Micronaut alignment.

### Control Panel

The [Micronaut Control Panel 2.2.0](https://github.com/micronaut-projects/micronaut-control-panel/releases/tag/v2.2.0) UI now renders its templates with Handlebars directly and no longer depends on Micronaut Views Handlebars, so an application can use another Micronaut Views engine, such as Thymeleaf. This is a breaking change in `ControlPanelController` and `DataSourceController`. The release also [excludes the optional Nashorn JavaScript engine](https://micronaut-projects.github.io/micronaut-control-panel/2.2.0/guide/#_views) from its dependencies.

### Validation, APIs, and serialization

[Micronaut Validation 5.2.1](https://github.com/micronaut-projects/micronaut-validation/releases/tag/v5.2.1) skips return value validation when the return type has no constraints. [Micronaut JSON Schema 2.3.0](https://github.com/micronaut-projects/micronaut-json-schema/releases/tag/v2.3.0) adds an opt-in [`@GeneratedFromJsonSchema`](https://micronaut-projects.github.io/micronaut-json-schema/2.3.0/guide/#_generated_types) annotation on generated types so that coverage tools such as JaCoCo skip them, and updates the JSON Schema Validator to `3.0.7`.

In [Micronaut Problem JSON 5.1.0](https://github.com/micronaut-projects/micronaut-problem-json/releases/tag/v5.1.0), an [`includeErrorMessage` override](https://micronaut-projects.github.io/micronaut-problem-json/5.1.0/guide/#customizingProblemErrorResponseProcessor) that opts in to the problem `detail` keeps the exception message on Micronaut Core 5.2. [Micronaut Serialization 3.2.4](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.4) fixes a regression with inherited any-getters and any-setters, supports precompiled Jackson models with non-public `@JsonSetter` methods, and resolves bean feature annotations once per serializer and deserializer.

[Micronaut gRPC 5.2.0](https://github.com/micronaut-projects/micronaut-grpc/releases/tag/v5.2.0) updates the Protobuf Gradle Plugin to `0.10.0`. [Micronaut Guice 2.2.0](https://github.com/micronaut-projects/micronaut-guice/releases/tag/v2.2.0) reports the module name in the error for a Guice module that cannot be imported, and updates Guava to `33.7.2-jre`.

[Micronaut OpenAPI 7.3.0](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.3.0), [Micronaut RSS 5.2.0](https://github.com/micronaut-projects/micronaut-rss/releases/tag/v5.2.0), and [Micronaut Session 5.2.0](https://github.com/micronaut-projects/micronaut-session/releases/tag/v5.2.0) update their dependencies and Micronaut alignment. [Micronaut Servlet 6.2.2](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.2) is a documentation release.

### Documentation

The guides of most of the modules updated in this release now show their examples in Python alongside Java, Kotlin, and Groovy.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](https://micronaut.io/support/) if you need any assistance.
