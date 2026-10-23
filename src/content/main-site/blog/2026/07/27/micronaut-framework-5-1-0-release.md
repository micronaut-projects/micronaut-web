---
slug: 2026/07/27/micronaut-framework-5-1-0-release
title: Micronaut Framework 5.1.0 Released!
description: Micronaut framework 5.1.0 adds Open DI support and updates across Core, Data, AI, cloud, messaging, APIs, and the wider Micronaut ecosystem.
date: '2026-07-27T20:22:18'
modified: '2026-07-27T20:26:47'
sourceUrl: https://micronaut.io/2026/07/27/micronaut-framework-5-1-0-release/
wordpressId: 7540
contentSource: wordpress-post
category: release-announcements
categories:
  - release-announcements
tags:
  - release
href: /2026/07/27/micronaut-framework-5-1-0-release/
---

We are excited to announce the release of Micronaut framework 5.1.0! If you haven’t yet updated to [Micronaut Framework 5](https://micronaut.io/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

# What's new in Micronaut 5.1.0

## Micronaut Core ([5.0.7](https://github.com/micronaut-projects/micronaut-core/releases/v5.0.7) → [5.1.10](https://github.com/micronaut-projects/micronaut-core/releases/v5.1.10))

Adds explicit `@Introspected.Property`, sequenced-collection injection, CDI integration hooks, KSP traversal of Kotlin inner classes, configuration-based logger levels, and per-service client SSL enabled by default. It also fixes request-bean binding, Jackson/introspection properties, AOP proxies, factory beans, and suspend-function type aliases.

## Open DI

Micronaut 5.1 makes the release of [Open DI 1.0.0](https://github.com/eclipse-ee4j/odi) possible.

> ODI is a CDI Lite implementation backed by Micronaut’s compile-time dependency injection infrastructure.

> ODI runtime uses CDI APIs while the build uses an annotation processor to generate Micronaut bean definitions and proxy classes. Applications keep the ODI processor on the annotation processor path and run with the ODI CDI runtime plus the Jakarta CDI API.

## Data Access

### Micronaut Data ([5.0.6](https://github.com/micronaut-projects/micronaut-data/releases/v5.0.6) → [5.1.1](https://github.com/micronaut-projects/micronaut-data/releases/v5.1.1))

Adds [SQLite dialect support](https://micronaut-projects.github.io/micronaut-data/5.1.1/guide/#_setting_the_dialect), [value-based ETags for optimistic locking](https://micronaut-projects.github.io/micronaut-data/5.1.1/guide/#optimisticLocking), Jakarta JPA metamodel generation, and fixes escaped column names in runtime SQL sorting.

### Micronaut SQL / JDBC ([7.0.2](https://github.com/micronaut-projects/micronaut-sql/releases/v7.0.2) → [7.1.0](https://github.com/micronaut-projects/micronaut-sql/releases/v7.1.0))

Adds a [MyBatis integration](https://micronaut-projects.github.io/micronaut-sql/7.1.0/guide/#mybatis).

### Micronaut Coherence ([6.0.0](https://github.com/micronaut-projects/micronaut-coherence/releases/v6.0.0) → [7.0.1](https://github.com/micronaut-projects/micronaut-coherence/releases/v7.0.1))

Updates Oracle Coherence to `26.04`.

### Micronaut EclipseStore ([2.0.0](https://github.com/micronaut-projects/micronaut-eclipsestore/releases/v2.0.0) → [2.1.0](https://github.com/micronaut-projects/micronaut-eclipsestore/releases/v2.1.0))

Updates [Eclipse Store](https://github.com/eclipse-store/store/releases) to `4.1.0`.

### Micronaut MongoDB ([6.0.1](https://github.com/micronaut-projects/micronaut-mongodb/releases/v6.0.1) → [6.1.0](https://github.com/micronaut-projects/micronaut-mongodb/releases/v6.1.0))

Updates the [MongoDB Java Driver](https://github.com/mongodb/mongo-java-driver) to `5.9.1`.

### Micronaut Neo4j ([8.0.0](https://github.com/micronaut-projects/micronaut-neo4j/releases/v8.0.0) → [8.1.0](https://github.com/micronaut-projects/micronaut-neo4j/releases/v8.1.0))

Updates the [Neo4j Java Driver](https://github.com/neo4j/neo4j-java-driver) to `6.2.0`.

### Micronaut R2DBC ([7.0.2](https://github.com/micronaut-projects/micronaut-r2dbc/releases/v7.0.2) → [7.1.0](https://github.com/micronaut-projects/micronaut-r2dbc/releases/v7.1.0))

Updates R2DBC MySQL to `1.0.5.RELEASE`, MariaDB to `1.4.1`, and PostgreSQL to `1.1.2`.

### Micronaut Redis ([7.0.0](https://github.com/micronaut-projects/micronaut-redis/releases/v7.0.0) → [7.1.0](https://github.com/micronaut-projects/micronaut-redis/releases/v7.1.0))

Updates [Lettuce](https://github.com/redis/lettuce) to `7.6.0.RELEASE`.

## AI

### Micronaut LangChain4j ([2.0.1](https://github.com/micronaut-projects/micronaut-langchain4j/releases/v2.0.1) → [2.2.0](https://github.com/micronaut-projects/micronaut-langchain4j/releases/v2.2.0))

Adds Oracle chat-memory auto-configuration, [Chroma embedding-store support](https://micronaut-projects.github.io/micronaut-langchain4j/2.2.0/guide/#chroma), AI-service guardrails resolved from Micronaut beans, [evaluation testing](https://micronaut-projects.github.io/micronaut-langchain4j/2.2.0/guide/#testing), [agentic support](https://micronaut-projects.github.io/micronaut-langchain4j/2.2.0/guide/#agenticService), and injected Google credentials for Vertex AI.

### Micronaut MCP ([1.0.0](https://github.com/micronaut-projects/micronaut-mcp/releases/v1.0.0) → [2.0.0](https://github.com/micronaut-projects/micronaut-mcp/releases/v2.0.0))

Updates the [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk) to 2.0.0.

## Cloud

### Micronaut AWS ([5.0.2](https://github.com/micronaut-projects/micronaut-aws/releases/v5.0.2) → [5.1.0](https://github.com/micronaut-projects/micronaut-aws/releases/v5.1.0))

Adds AWS CRT and Apache HttpClient 5 support for AWS SDK v2, fixes Lambda embedded-server startup and payload handling, and updates AWS SDK v2 to 2.48.3.

### Micronaut Azure ([6.0.0](https://github.com/micronaut-projects/micronaut-azure/releases/v6.0.0) → [6.1.0](https://github.com/micronaut-projects/micronaut-azure/releases/v6.1.0))

Updates Azure SDK to `1.3.7` and Azure Cosmos to `4.81.0`.

### Micronaut GCP ([6.0.0](https://github.com/micronaut-projects/micronaut-gcp/releases/v6.0.0) → [6.1.0](https://github.com/micronaut-projects/micronaut-gcp/releases/v6.1.0))

Updates google-cloud-pubsub to `1.152.0`, google-cloud-secretmanager to `2.94.0`, google-cloud-core to `2.72.0`, and Google OAuth2 HTTP to `1.49.0`.

### Micronaut Oracle Cloud ([6.0.3](https://github.com/micronaut-projects/micronaut-oracle-cloud/releases/v6.0.3) → [6.1.3](https://github.com/micronaut-projects/micronaut-oracle-cloud/releases/v6.1.3))

Updates to OCI SDK `3.91.0`.

### Micronaut Kubernetes ([8.0.0](https://github.com/micronaut-projects/micronaut-kubernetes/releases/v8.0.0) → [9.0.0](https://github.com/micronaut-projects/micronaut-kubernetes/releases/v9.0.0))

Updates the [Kubernetes Java Client](https://github.com/kubernetes-client/java) to `27.0.0`.

### Tracing ([8.0.0](https://github.com/micronaut-projects/micronaut-tracing/releases/v8.0.0) → [8.2.0](https://github.com/micronaut-projects/micronaut-tracing/releases/v8.2.0))

Updates [OpenTelemetry](https://github.com/open-telemetry/opentelemetry-java) to `1.64.0` and adds [Oracle UCP telemetry support](https://micronaut-projects.github.io/micronaut-tracing/8.2.0/guide/#ucp).

### Micronaut Object Storage ([3.0.0](https://github.com/micronaut-projects/micronaut-object-storage/releases/v3.0.0) → [3.1.0](https://github.com/micronaut-projects/micronaut-object-storage/releases/v3.1.0))

Adds a storage-metadata persistence SPI, `InputStream` uploads, deterministic local-storage ETags, multipart lifecycle support for S3 and OCI, and local multipart uploads.

## Languages

### Micronaut Kotlin ([5.0.0](https://github.com/micronaut-projects/micronaut-kotlin/releases/v5.0.0) → [5.1.0](https://github.com/micronaut-projects/micronaut-kotlin/releases/v5.1.0))

Updates [Ktor](https://ktor.io/) to `3.5.1`.

## Messaging

Micronaut JMS updates ActiveMQ Jakarta to 6.2.7 and Artemis Jakarta Client to 2.55.0. Micronaut Kafka updates [Apache Kafka](https://github.com/apache/kafka) to `4.3.1` and adds non-blocking retry topics, a consumer-record interception hook, and the ability to stop listeners after retries are exhausted. Micronaut MQTT updates HiveMQ MQTT client to `1.3.17`; Micronaut NATS updates the [NATS Java Client](https://github.com/nats-io/nats.java) to `2.26.0`; Micronaut Pulsar updates [Apache Pulsar](https://github.com/apache/pulsar) to `4.2.3`; and Micronaut RabbitMQ updates its Java client to `5.34.0`, fixes publisher completion blocking consumers, and fails channel initialization when resources are locked.

## Miscellaneous

Micronaut Cache updates [Infinispan](https://infinispan.org/) to 16.2.1 and [Hazelcast](https://hazelcast.com/developers/clients/java/) to 5.7.0. Micronaut Email adds [Mailpit integration](https://micronaut-projects.github.io/micronaut-email/3.1.0/guide/#mailpit). Micronaut Security adds an [OWASP HTML Sanitizer module](https://micronaut-projects.github.io/micronaut-security/5.3.1/guide/#htmlSanitizer), `@RunAs` authentication delegation, OIDC locale resolution, optional OpenID metadata fetching, authentication mapping, and normalized trailing slashes for intercept-URL rules. Micronaut Reactor updates to Project Reactor `2025.0.6`, and Micronaut Views adds [Jinjava](https://micronaut-projects.github.io/micronaut-views/6.2.0/guide/#jinjava) as a template-rendering option.

## Database Migration, Dev & Test, and APIs

Micronaut Flyway receives dependency and Micronaut alignment; Micronaut Liquibase updates Flyway to `2.6.2`. Micronaut Test updates JUnit, Kotest, MockK, and REST Assured, while Test Resources adds Floci support. Control Panel expands Kafka support and improves safety when optional implementations are absent. Validation adds a URL validation annotation.

Micronaut GraphQL adds multipart and Apollo-style batched requests; Micronaut gRPC updates gRPC Java to `1.82.22`; JSON Schema honors `@JsonProperty` on enum constants; OpenAPI adds opt-in `$dynamicAnchor` and `$dynamicRef` generation and upgrades OpenAPI Generator to 7.24.0; Serialization adds JSON-B/JSON-P compliance and more annotation support; Servlet updates Jetty, Undertow, and Tomcat; and Spring updates Spring Framework to `7.0.8` and Spring Boot to `4.1.0`.

Micronaut Elasticsearch updates the Elasticsearch Java Client to `9.4.3`, OpenSearch updates its Java client to 3.9.0, TOML adds TOML 1.1 parsing, Logging updates SLF4J, Logback, and Log4j 2, and SourceGen fixes switch-expression ordering so generated code preserves the caller correctly.
