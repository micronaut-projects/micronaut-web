---
slug: 2026/05/20/micronaut-framework-5-0-0-released
title: Micronaut Framework 5.0.0 Released!
description: We are excited to announce the general availability (GA) release of Micronaut framework 5! Latest Versions Micronaut 5 is represented by the Micronaut Platform BOM and brings the framework, its modules, and the managed dependency ecosystem up to current major versions. Micronaut 4 was introduced almost three years ago, so Micronaut 5 is...
date: "2026-05-20T14:54:35"
modified: "2026-05-20T14:54:35"
sourceUrl: https://micronaut.io/2026/05/20/micronaut-framework-5-0-0-released/
wordpressId: 7497
contentSource: wordpress-post
category: micronaut-5
categories:
  - micronaut-5
  - release-announcements
  - upgrade
tags:
  - release
href: /2026/05/20/micronaut-framework-5-0-0-released/
---

We are excited to announce the general availability (GA) release of [Micronaut](https://micronaut.io/) framework 5!

### Latest Versions

Micronaut 5 is represented by the [Micronaut Platform BOM](https://micronaut-projects.github.io/micronaut-platform/snapshot/guide/) and brings the framework, its modules, and the managed dependency ecosystem up to current major versions. [Micronaut 4](https://micronaut.io/2023/07/14/micronaut-framework-4-0-0-released/) was introduced almost three years ago, so Micronaut 5 is both a major framework release and a broad platform refresh across more than 70 Micronaut modules.

### Build-Time and Speed

We have, of course, also taken the opportunity to continue improving the framework’s internals, maintaining alignment with its core values. Do as much as possible during build time and keep making it faster and faster.

## Languages’ Baselines

Micronaut 5 updates to the following baselines:

- [Java 25](https://micronaut.io/2026/04/27/micronaut-framework-5-0-with-java-25-baseline/)
- [Apache Groovy 5](https://micronaut.io/2026/04/28/micronaut-framework-5-0-supports-apache-groovy-5/)
- [Kotlin 2.3](https://micronaut.io/2026/04/28/micronaut-framework-5-0-supports-kotlin-2-3/)

## GraalVM

Micronaut 5 updates [GraalVM](https://graalvm.org/) to 25.0.3.

## Core Changes

### Internals

The IoC container and compile-time infrastructure have received substantial work in Micronaut 5. Bean resolution, qualifier handling, replacement metadata, eager initialization, and runtime annotation processing were refined to reduce runtime work and improve predictability.

The bean context was reworked in several areas during the Micronaut 5 development cycle, including precomputed bean indexes, compile-time `@Replaces` handling, and broader bean context optimizations. Together, these changes continue Micronaut’s focus on startup performance and low runtime overhead.

Micronaut 5 adds support for `jakarta.annotation.Priority`, mapping it to Micronaut’s bean and HTTP filter ordering semantics.

### HTTP

On the HTTP side, [HTTP/3 support](https://docs.micronaut.io/snapshot/guide/#http3Server) on the Netty stack was promoted to stable. Micronaut 5 also includes a multipart/form handling refactor that introduces a lower-level, more server-independent form API and improves resource management in higher-level binders. See [Forms](https://docs.micronaut.io/snapshot/guide/#form), [Detailed Form API](https://docs.micronaut.io/snapshot/guide/#formCapable), and [File Uploads](https://docs.micronaut.io/snapshot/guide/#uploads).

### JSpecify Nullability Annotations

The framework APIs now embrace [nullability annotations](https://docs.micronaut.io/snapshot/guide/#nullabilityAnnotations) and specifically [JSpecify nullability annotations](https://docs.micronaut.io/snapshot/guide/#jspecify), with `@NullMarked` adoption across the codebase and stronger static analysis integration. The result is clearer API contracts, improved Kotlin interoperability, and better IDE feedback.

### Resilience and Context Propagation

In addition to the existing annotation-driven model documented in [Retry Advice](https://docs.micronaut.io/snapshot/guide/#retry), Micronaut 5 offers [programmatic retry](https://docs.micronaut.io/snapshot/guide/#_programmatic_retry) and [circuit breaker APIs](https://docs.micronaut.io/snapshot/guide/#_programmatic_circuit_breaker). These changes enable defining typed retry and circuit breaker policies in code and reusing them for synchronous, reactive, and asynchronous flows.

## Configuration

### Configuration Support

Micronaut 5 supports config imports and a [`PropertySourceImporter` SPI](https://docs.micronaut.io/snapshot/api/io/micronaut/context/env/PropertySourceImporter.html), enabling configuration loading from sources such as files, classpath locations, environment variables, config trees, and custom importer implementations. See [Importing Additional Configuration](https://docs.micronaut.io/snapshot/guide/#configImport), [Implementing a Custom PropertySourceImporter](https://docs.micronaut.io/snapshot/guide/#customPropertySourceImporter), and [Externalized Configuration with PropertySources](https://docs.micronaut.io/snapshot/guide/#propertySource).

This new approach deprecates the [Bootstrap Configuration](https://docs.micronaut.io/snapshot/guide/#bootstrap) support, which may be removed in Micronaut 6.

### Application Configuration Validation

A new module, [Micronaut JSON Schema configuration validator](https://micronaut-projects.github.io/micronaut-json-schema/snapshot/guide/#configurationValidator), eases application configuration validation and is integrated into the [Micronaut Maven Plugin](https://micronaut-projects.github.io/micronaut-maven-plugin/snapshot/examples/configuration-validation.html) and the [Micronaut Gradle Plugin](https://micronaut-projects.github.io/micronaut-gradle-plugin/5.0.0/#configuration-validation).

This module relies on the capability introduced in Micronaut 5 to generate JSON Schema documents from `@ConfigurationProperties`.

[Micronaut JSON Schema](https://micronaut-projects.github.io/micronaut-json-schema/snapshot/guide/) updates [`com.networknt:json-schema-validator`](https://github.com/networknt/json-schema-validator) to `3.0.2`.

## Logging

Micronaut Logging updates to Log4j [`2.25.4`](https://logging.apache.org/log4j/2.x/release-notes.html#release-notes-2-25-4)

## Dev & Test

### Control Panel

[Micronaut Control Panel](https://micronaut-projects.github.io/micronaut-control-panel/snapshot/guide/) gets a fresh look, and it adds panels for [Cache](https://micronaut-projects.github.io/micronaut-control-panel/snapshot/guide/#cache), [DataSource](https://micronaut-projects.github.io/micronaut-control-panel/snapshot/guide/#datasource), [Hibernate](https://micronaut-projects.github.io/micronaut-control-panel/snapshot/guide/#hibernate), and [Kafka Streams](https://micronaut-projects.github.io/micronaut-control-panel/snapshot/guide/#kafka). It also adds Object Storage, Disabled Beans, and Metrics panels, plus authenticated and authorized access.

### AOT

[Micronaut AOT](https://micronaut-projects.github.io/micronaut-aot/snapshot/guide/) adds an AOT diagnostics report.

### OpenAPI

[Micronaut OpenAPI](https://micronaut-projects.github.io/micronaut-openapi/snapshot/guide/) updates to `7.0.0`, with fixes and improvements for KSP2, `@SecuritySchema`, `JsonAnyGetter`/ `JsonAnySetter`, `JsonNode`, headers, byte arrays, and URI template/path/query processing.

### Test

[Micronaut Test](https://micronaut-projects.github.io/micronaut-test/snapshot/guide/) updates:

- [JUnit](https://junit.org/) to `6.0.3`.
- [KoTest](https://kotest.io/) to `6.1.9`.
- [Spock](https://spockframework.org/) to `2.4-groovy-5.0`.
- [Mockito](https://site.mockito.org/) to `5.23.0`.
- [Mockk](https://mockk.io/) to `1.14.9`.
- [REST-assured](https://rest-assured.io/) to `6.0.0`.
- [AssertJ](https://assertj.github.io/doc/): updates to `3.27.7`.

[Micronaut Test Resources](https://micronaut-projects.github.io/micronaut-test-resources/snapshot/guide/) updates to `4.0.0`, with a binary protocol between client and server, shared containers across multiple databases, and new providers for Infinispan, Hazelcast, Pulsar, MinIO, SeaweedFS, Azurite, Couchbase, and WireMock. The platform also manages [Testcontainers](https://testcontainers.com/) `2.0.5`.

## Serialization

### Micronaut Serialization

[Micronaut Serialization](https://micronaut-projects.github.io/micronaut-serialization/snapshot/guide/) adds:

- Serializers and Deserializers are now generated at build time with SourceGen, improving performance. The [`@SerdeableGenerated`](https://micronaut-projects.github.io/micronaut-serialization/snapshot/api/io/micronaut/serde/annotation/SerdeableGenerated.html) annotation, declares the compile-time generated serde contract for a [`Serdeable`](https://micronaut-projects.github.io/micronaut-serialization/snapshot/api/io/micronaut/serde/annotation/Serdeable.html) type.
- Broader format metadata support: pattern, shape, locale, timezone, lenient parsing, and radix.
- Serialization feature flags for nanosecond timestamps, zone IDs, unwrapped single-element arrays, and sorted map entries.
- Deserialization feature flags for single-value-as-array, case-insensitive properties, unknown enum handling, timestamp precision, and context time zone adjustment.
- Support for `@JsonEnumDefaultValue` with `@JsonFormat(with = READ_UNKNOWN_ENUM_VALUES_USING_DEFAULT_VALUE)`

### Jackson 3

With the release of Micronaut 5, [Micronaut Jackson Databind updates to Jackson 3](https://micronaut.io/2026/05/01/micronaut-framework-5-with-jackson-3/) (`3.1.3` in the platform BOM).

## Server

### Ktor

Micronaut Kotlin updates to [Ktor 3](https://ktor.io/changelog/3.0/) (`3.4.3` in the platform BOM).

### Servlet

Micronaut Servlet updates the following server runtime dependencies:

- [Undertow](https://undertow.io/) to `2.3.24.Final`
- [Apache Tomcat](https://tomcat.apache.org/) to `11.0.21`
- [Eclipse Jetty](https://jetty.org/) to `12.1.8`

## Persistence

### DATA

[Micronaut Data](https://micronaut-projects.github.io/micronaut-data/snapshot/guide/) adds [Geospatial Support](https://micronaut-projects.github.io/micronaut-data/snapshot/guide/#sqlGeospatial), [SQL Vector Type Mapping](https://micronaut-projects.github.io/micronaut-data/snapshot/guide/#sqlVectorType), and it continues to improve the [@JsonView](https://micronaut-projects.github.io/micronaut-data/snapshot/guide/#sqlJsonView) support.

### SQL

[Micronaut SQL](https://micronaut-projects.github.io/micronaut-sql/snapshot/guide/) adds the ability to [update JDBC datasource credentials at runtime without restarting the application](https://micronaut-projects.github.io/micronaut-sql/snapshot/guide/#jdbc-runtime-password-update), adds support for [SQLite](https://www.sqlite.org/), [Oracle Session Program Auto-Configuration](https://micronaut-projects.github.io/micronaut-sql/snapshot/guide/#jdbc-connection-pools), unpooled datasource support, and updates to the latest versions:

- vertx to `5.0.12`.
- jooq to `3.21.4`.
- Hibernate-core to `7.3.4.Final`.
- jdbi3-core to `3.53.0`.
- ojdbc to `23.26.2.0.0`.
- postgresql to `42.7.11`.
- mariadb-driver to `3.5.8`.
- mssql-jdbc to `13.4.0.jre11`.
- Mysql-connector-j to `9.7.0`.
- Hikari to `7.0.2`.
- commons-dbcp2 to `2.14.0`.
- Tomcat JDBC to `11.0.22`.
- Jakarta Persistence API to `3.2.0`.
- H2 to `2.4.240`.

### R2DBC

[Micronaut R2DBC](https://micronaut-projects.github.io/micronaut-r2dbc/snapshot/guide/) adds Google Cloud SQL R2DBC PostgreSQL support, and it updates the R2DBC drivers, including H2 from `1.0.0` to `1.1.0`, MariaDB from `1.3.0` to `1.4.0`, MSSQL from `1.0.3` to `1.0.4`, MySQL from `1.4.1` to `1.4.2`, PostgreSQL from `1.1.0` to `1.1.1`.

### MongoDB

[MongoDB Java Driver](https://github.com/mongodb/mongo-java-driver) upgrades to `5.7.0`.

A new module, `io.micronaut.mongodb:micronaut-mongo-coroutine`, adds Kotlin coroutine MongoDB driver support. The release also adds `MongoClientSettings` customization for client-side field-level encryption.

### Eclipsestore

[Micronaut EclipseStore](https://micronaut-projects.github.io/micronaut-eclipsestore/snapshot/guide/) annotation mappers moved from `micronaut-eclipsestore-annotations` to the new module `micronaut-eclipsestore-processor`. Users must replace the annotation processor or Groovy `compileOnly` dependency accordingly.

The module updates EclipseStore from `1.4.0` to [`4.0.1`](https://github.com/eclipse-store/store/releases/tag/4.0.1). It also adds Google Cloud Firestore storage target support.

### Redis

[Micronaut Redis](https://micronaut-projects.github.io/micronaut-redis/snapshot/guide/) adds [Pub/Sub Messaging support](https://micronaut-projects.github.io/micronaut-redis/snapshot/guide/#pubsub), cache bulk operations, retry options, configurable namespace support, and it updates the [Lettuce Java Redis client](https://github.com/redis/lettuce) to `7.5.1`.

### Neo4J

[Micronaut Neo4J](https://micronaut-projects.github.io/micronaut-neo4j/snapshot/guide/) updates the [Neo4j Java driver](https://github.com/neo4j/neo4j-java-driver) to `6.1.0`.

## Database Migration

### Liquibase

[Micronaut Liquibase](https://micronaut-projects.github.io/micronaut-liquibase/snapshot/guide/) updates to Liquibase `5.0.2`.

### Flyway

[Micronaut Flyway](https://micronaut-projects.github.io/micronaut-flyway/snapshot/guide/) updates to Flyway `12.6.1`.

## Cloud

### Object Storage

[Micronaut Object Storage](https://micronaut-projects.github.io/micronaut-object-storage/snapshot/guide/) adds support for [Paginated Listing](https://micronaut-projects.github.io/micronaut-object-storage/snapshot/guide/#paginatedListing), [Bucket and Container Management APIs](https://micronaut-projects.github.io/micronaut-object-storage/snapshot/guide/#bucketManagement), presigned requests, streaming upload support, and reactive operations.

### Tracing

[Micronaut Tracing](https://micronaut-projects.github.io/micronaut-tracing/snapshot/guide/) updates to [Open Telemetry](https://github.com/open-telemetry/opentelemetry-java) `1.62.0`. It also adds OpenTelemetry R2DBC instrumentation and a Logback appender.

### Kubernetes

[Micronaut Kubernetes](https://micronaut-projects.github.io/micronaut-kubernetes/snapshot/guide/) updates to [Kubernetes Java client](https://github.com/kubernetes-client/java) `26.0.0`.

The Kubernetes module also gains support for [Configuration Import via Kubernetes ConfigMaps, Secrets or Mounted Volumes](https://micronaut-projects.github.io/micronaut-kubernetes/latest/guide/#config-import).

### AWS

[Micronaut AWS](https://micronaut-projects.github.io/micronaut-aws/snapshot/guide/) updates AWS SDK v2 to `2.44.7`, AWS Lambda Java Serialization to `1.4.0`, and runtime interface client to `2.10.1`. It also adds config import support for AWS Parameter Store and AWS Secrets Manager.

### Azure

[Micronaut Azure](https://micronaut-projects.github.io/micronaut-azure/snapshot/guide/) updates to Azure SDK to `1.3.6`, Azure Cosmos to `4.80.0`, and Azure Functions Library to `3.3.0`. It also adds Azure Key Vault config import support.

### GCP

[Micronaut GCP](https://micronaut-projects.github.io/micronaut-gcp/snapshot/guide/) updates [CloudEvents SDK](https://github.com/cloudevents/sdk-java) to `4.0.2`, Google Secret Manager to `2.91.0`, Google Auth `1.46.0`, Pub/Sub `1.150.1`, and Functions Framework API `2.0.1`. It also adds Google Secret Manager config import support.

### Oracle Cloud

[Micronaut Oracle Cloud](https://micronaut-projects.github.io/micronaut-oracle-cloud/snapshot/guide/) updates to OCI SDK `3.86.1`.

## AI

### Micronaut MCP

[Micronaut MCP](https://micronaut-projects.github.io/micronaut-mcp/snapshot/guide/) updates to [MCP Java SDK](https://github.com/modelcontextprotocol/java-sdk) `1.1.2` and is included in the platform as `1.0.0`.

### Micronaut Langchain4J

[Micronaut Langchain4j](https://micronaut-projects.github.io/micronaut-langchain4j/snapshot/guide/) updates to [Langchain4j](https://github.com/langchain4j/langchain4j) `1.15.0`.

## Validation

[Micronaut Hibernate Validator](https://micronaut-projects.github.io/micronaut-hibernate-validator/snapshot/guide/) updates [Hibernate Validator](https://hibernate.org/validator/) to `9.1.0.Final` and registers custom `ValueExtractor` beans in `ValidatorFactoryProvider`.

## Security

[Micronaut Security](https://micronaut-projects.github.io/micronaut-security/snapshot/guide/) updates [Nimbus JOSE JWT](https://connect2id.com/products/nimbus-jose-jwt) to `10.9`.

The JSR 250 annotation mappers have been moved to a new module `io.micronaut.security:micronaut-security-processor`. Users must replace the annotation processor or Groovy `compileOnly` dependency accordingly.

New security context API/SPI was added: [SecurityContext](https://micronaut-projects.github.io/micronaut-security/snapshot/api/io/micronaut/security/context/SecurityContext.html), [SecurityContextHolder](https://micronaut-projects.github.io/micronaut-security/snapshot/api/io/micronaut/security/context/SecurityContextHolder.html), and [SecurityContextSupplier](https://micronaut-projects.github.io/micronaut-security/snapshot/api/io/micronaut/security/context/SecurityContextSupplier.html), with request-backed behavior wired through the SecurityFilter. The module also adds OAuth2/OIDC `prompt=create` support for user registration.

## Reactive Libraries

### Micronaut Reactor

[Micronaut Reactor](https://micronaut-projects.github.io/micronaut-reactor/snapshot/guide/) updates Reactor to `2025.0.5` and `micrometer-context-propagation` to `1.2.1`.

### Micronaut RxJava

Micronaut 5 no longer supports RxJava 2. Micronaut 5 users willing to use RxJava should use [Micronaut RxJava 3](https://micronaut-projects.github.io/micronaut-rxjava3/snapshot/guide/).

## Analytics

### OpenSearch

[Micronaut OpenSearch](https://micronaut-projects.github.io/micronaut-opensearch/snapshot/guide/) updates the [OpenSearch Java client](https://github.com/opensearch-project/opensearch-java) to `3.8.0`.

### ElasticSearch

[Micronaut ElasticSearch](https://micronaut-projects.github.io/micronaut-elasticsearch/snapshot/guide/) updates the [ElasticSearch Java Client](https://github.com/elastic/elasticsearch-java) to `9.4.0`.

## Micrometer

[Micronaut Micrometer](https://micronaut-projects.github.io/micronaut-micrometer/snapshot/guide/) updates:

- [Micrometer](https://github.com/micrometer-metrics/micrometer) to `1.16.5`.
- `micrometer-tracing` to `1.6.5`.
- `metrics-core` to `4.2.38`.
- `prometheus-metrics-exporter-pushgateway` to `1.6.1`.
- `datasource-micrometer` to `2.2.1`.

Micronaut Micrometer also adds streaming Prometheus scrape responses.

## API

### JAX-RS

[Micronaut JAX-RS](https://micronaut-projects.github.io/micronaut-jaxrs/snapshot/guide/) updates to Jakarta REST API `4.0.0` and adds support for `@ConstrainedTo` and `ParamConverterProvider`.

### GraphQL

[Micronaut GraphQL](https://micronaut-projects.github.io/micronaut-graphql/snapshot/guide/) updates:

- [GraphQL Java](https://github.com/graphql-java/graphql-java) to `26.0`.
- [GraphQL Java Extended Scalars](https://github.com/graphql-java/graphql-java-extended-scalars) to `24.0`.

Malformed GraphQL JSON now returns HTTP 400.

### gRPC

[Micronaut gRPC](https://micronaut-projects.github.io/micronaut-grpc/snapshot/guide/) adds the `io.micronaut.grpc:micronaut-grpc-inprocess` module to ease testing. It updates to:

- gRPC Java to `1.80.0`.
- Protobuf to `4.34.1`.
- gRPC Kotlin to `1.5.0`.

It also adds configurable gRPC server executor support.

### Spring

[Micronaut Spring](https://micronaut-projects.github.io/micronaut-spring/snapshot/guide/) updates to

- Spring Boot `4.0.6`.
- Spring `7.0.7`.

## Messaging

### Kafka

[Micronaut Kafka](https://micronaut-projects.github.io/micronaut-kafka/snapshot/guide/) updates to [Apache Kafka](https://github.com/apache/kafka) `4.2.0`.

The Kafka module receives a number of enhancements including per-class consumer strategies, a Kafka consumer bean scope, listener IDs, listener invocation scope, optional AdminClient, and support for graceful shutdown.

### RABBITMQ

[Micronaut RabbitMQ](https://micronaut-projects.github.io/micronaut-rabbitmq/snapshot/guide/) updates the [RabbitMQ Java client](https://github.com/rabbitmq/rabbitmq-java-client) to `5.30.0`.

### NATS

[Micronaut NATS](https://micronaut-projects.github.io/micronaut-spring/nats/guide/) updates the [NATS – Java Client](https://github.com/nats-io/nats.java) to `2.25.3`.

### JMS

[Micronaut JMS](https://micronaut-projects.github.io/micronaut-jms/nats/guide/) updates to:

- ActiveMQ Classic to `6.2.5`.
- ActiveMQ Artemis Jakarta client to `2.53.0`.
- Apache Commons Pool to `2.13.1`.

### MQTT

[Micronaut MQTT](https://micronaut-projects.github.io/micronaut-mqtt/nats/guide/) updates the HiveMQ MQTT Client to `1.3.14`.

### Pulsar

[Micronaut Pulsar](https://micronaut-projects.github.io/micronaut-pulsar/nats/guide/) updates [Apache Pulsar](https://github.com/apache/pulsar) Java Client to `4.2.1`.

## Views

[Micronaut Views](https://micronaut-projects.github.io/micronaut-views/snapshot/guide/) updates:

- Soy to `2024-02-26`
- Handlebars to `4.5.0`.
- JTE to `3.2.4`.
- Thymeleaf to `3.1.5.RELEASE`.
- Pebble to `4.1.1`.

[Turbo](https://micronaut-projects.github.io/micronaut-views/snapshot/guide/#turbo) has moved to its own dependency `io.micronaut.views:micronaut-views-turbo`. Micronaut Views also adds HTMX integration.

## Miscellaneous

### EMAIL

[Micronaut Email](https://micronaut-projects.github.io/micronaut-email/snapshot/guide/) updates Mailjet to `6.0.1`, Mailtrap to `1.2.0`, and Postmark to `1.13.0`.

### ACME

[Micronaut ACME](https://micronaut-projects.github.io/micronaut-acme/snapshot/guide/) [updates to ACMEJ](https://github.com/shred/acme4j) `5.1.0`.

### Session

[Micronaut Session](https://micronaut-projects.github.io/micronaut-session/snapshot/guide/) updates to `5.0.0`, with request/response filter method support and custom context-path fixes.

### Cache

It updates:

- [Caffeine](https://github.com/ben-manes/caffeine) to `3.2.4`.
- [Ehcache](https://www.ehcache.org/) to `3.12.0`.
- [Hazelcast](https://hazelcast.com/developers/clients/java/) to `5.6.0`.
- [Infinispan](https://infinispan.org/) to `16.1.4`.

## HOW TO UPGRADE TO MICRONAUT FRAMEWORK 5?

We have published an [upgrade to Micronaut framework 5 guide](https://github.com/micronaut-projects/micronaut-core/wiki/Update-to-Micronaut-5) to help you upgrade your Micronaut applications.

## NEXT STEPS

Please refer to the [documentation](https://micronaut.io/docs/) for further details, try upgrading your applications, and use [GitHub](https://github.com/micronaut-projects) to report any issues.

Thanks to all those who contributed to this release! We look forward to your feedback.
