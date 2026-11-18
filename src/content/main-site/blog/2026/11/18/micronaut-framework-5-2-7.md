---
slug: 2026/11/18/micronaut-framework-5-2-7
title: Micronaut Framework 5.2.7 Released!
description: Micronaut Framework 5.2.7 upgrades Netty to 4.2.21.Final, which restores the glibc requirements of Netty's native transports, and includes HTTP client and server fixes in Micronaut Core.
date: "2026-11-18T10:26:25"
modified: "2026-11-18T10:26:25"
category: release-announcements
categories:
  - release-announcements
tags:
  - release
href: /2026/11/18/micronaut-framework-5-2-7/
---

We have released [Micronaut Framework 5.2.7](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.7). The highlight of this release is an upgrade of Netty to [4.2.21.Final](https://netty.io/news/2026/11/16/4-2-21-Final.html), which restores the glibc requirements of Netty's native transports.

The release includes:

- [Micronaut Core 5.2.25](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.25)
- [Micronaut Liquibase 7.2.1](https://github.com/micronaut-projects/micronaut-liquibase/releases/tag/v7.2.1)
- [Micronaut OpenAPI 7.3.2](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.3.2)
- [Micronaut OpenSearch 2.1.2](https://github.com/micronaut-projects/micronaut-opensearch/releases/tag/v2.1.2)

## Netty 4.2.21.Final

Netty 4.2.20.Final, which shipped with Micronaut Framework 5.2.5 and 5.2.6, accidentally raised the glibc version required by Netty's native libraries to 2.33 on x86_64 and aarch64. Applications that use a native transport, such as epoll or io_uring, on a Linux distribution with an older glibc, for example RHEL 8 or Amazon Linux 2, could no longer load it.

[Netty 4.2.21.Final](https://netty.io/news/2026/11/16/4-2-21-Final.html) fixes that build mistake, and the glibc requirements return to what they were before 4.2.20.Final. **If you run Micronaut Framework 5.2.5 or 5.2.6 with a native transport on a Linux distribution with a glibc older than 2.33, update to Micronaut Framework 5.2.7.**

Netty 4.2.21.Final is a bug-fix release with many other changes. Among them:

- `SslHandler` stops wrapping when the transport cannot keep up, and resumes when a delegated task is consumed elsewhere.
- `HttpContentCompressor` honours qvalues when it selects the content encoding.
- The h2c upgrade stream fails for all header conversion errors.
- HTTP response reason phrases with control characters are rejected.
- Channels that are still registered are closed when an event loop exits on shutdown.
- Several classloader leaks through shared exception instances are fixed.

Read the [Netty 4.2.21.Final release notes](https://netty.io/news/2026/11/16/4-2-21-Final.html) for the full list.

## What's new in Micronaut Framework 5.2.7

### Micronaut Core

[Micronaut Core 5.2.25](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.25) updates Netty to 4.2.21.Final and keeps a shared body buffer consistent when a subscriber subscribes or cancels.

This release also brings the changes of [Micronaut Core 5.2.24](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.24), which fixes several issues in the Netty HTTP client and server:

- The HTTP client releases the connection when a request fails before it is sent, winds down HTTP/1 connections on their event loop, and no longer inverts the pending connection hint of the connection pool.
- The HTTP server finishes HTTP/1 responses consistently on the fast path and on connection close, reads the HTTP/2 stream state on the event loop when it writes a full response, and acknowledges form data that was buffered before the demuxer was created.
- If a listener fails to bind, the server closes the listeners that were already bound.

Annotation-processing environments can now disable logging.

### Micronaut OpenAPI

[Micronaut OpenAPI 7.3.2](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.3.2) disables environment logging during OpenAPI annotation processing. The release also includes the fixes of [Micronaut OpenAPI 7.3.1](https://github.com/micronaut-projects/micronaut-openapi/releases/tag/v7.3.1): the generator no longer produces an uncompilable Java model for an enum discriminator with a default value, boxed primitives map to custom schemas, and the visitors release their static state when the compilation finishes.

### Micronaut Liquibase

[Micronaut Liquibase 7.2.1](https://github.com/micronaut-projects/micronaut-liquibase/releases/tag/v7.2.1) adds GraalVM Native Image metadata for Liquibase.

### Micronaut OpenSearch

[Micronaut OpenSearch 2.1.2](https://github.com/micronaut-projects/micronaut-opensearch/releases/tag/v2.1.2) updates its managed Jackson versions.

If you haven't yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
