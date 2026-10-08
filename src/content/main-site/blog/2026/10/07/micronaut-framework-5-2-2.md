---
slug: 2026/10/07/micronaut-framework-5-2-2
title: Micronaut Framework 5.2.2 Released!
description: Micronaut Framework 5.2.2 is a security release. Its highlight is Micronaut Core 5.2.15 updating Netty to 4.2.19.Final, which fixes several vulnerabilities. It also includes Micronaut Data 5.2.2 and Micronaut Test Resources 4.3.1.
date: "2026-10-07T15:31:47"
modified: "2026-10-07T15:31:47"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/10/07/micronaut-framework-5-2-2/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Framework 5.2.2](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.2)!

**Micronaut Framework 5.2.2 is a security release.** The highlight of this release is the update to Netty [`4.2.19.Final`](https://netty.io/news/2026/10/06/4-2-19-Final.html) in [Micronaut Core 5.2.15](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.15). Netty 4.2.19.Final fixes several security vulnerabilities, including HTTP request/response smuggling and unbounded resource consumption in the HTTP, HTTP/2, and HTTP/3 codecs. **We recommend that all users update to Micronaut Framework 5.2.2.**

The release includes [Micronaut Core 5.2.15](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.15), [Micronaut Data 5.2.2](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.2), and [Micronaut Test Resources 4.3.1](https://github.com/micronaut-projects/micronaut-test-resources/releases/tag/v4.3.1).

[Micronaut Test Resources 4.3.1](https://github.com/micronaut-projects/micronaut-test-resources/releases/tag/v4.3.1) also updates Jackson to `2.22.3` to pick up a vulnerability fix.

## What's new in Micronaut Framework 5.2.2

### Micronaut Core

[Micronaut Core 5.2.15](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.15) updates Netty to [`4.2.19.Final`](https://netty.io/news/2026/10/06/4-2-19-Final.html), a Netty security release. It also continues to polish Micronaut for Python. Around advice now preserves the contract of Python async generators, inherited Python method metadata is isolated by its owning type, and Python controllers that return a nested generic `HttpResponse` now compile.

On the HTTP side, the release flushes the HTTP/2 `100 Continue` response when the body is subscribed after the read, fails the HTTP/1 response when the connection drops while `100 Continue` content is being received, and decodes fragmented WebSocket messages from the complete payload. It also records an introspection as written only once it has actually been written.

### Micronaut Data

[Micronaut Data 5.2.2](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.2) allows transaction synchronizations to register further synchronizations while they are being triggered.

### Micronaut Test Resources

[Micronaut Test Resources 4.3.1](https://github.com/micronaut-projects/micronaut-test-resources/releases/tag/v4.3.1) reads the test resources enabled switch before the cached client, stops the Mailpit endpoint properties from requiring each other, avoids duplicate Keycloak JWKS configuration, and skips the Oracle JDBC readiness check when the driver is missing. The release updates Jackson to `2.22.3`, and its guide now shows examples in Java, Kotlin, Groovy, and Python.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](https://micronaut.io/support/) if you need any assistance.
