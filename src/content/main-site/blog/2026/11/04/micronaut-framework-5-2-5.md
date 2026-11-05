---
slug: 2026/11/04/micronaut-framework-5-2-5
title: Micronaut Framework 5.2.5 Released!
description: Micronaut Framework 5.2.5 is a security release that upgrades Netty to 4.2.20.Final. Matching security releases are also available for the Micronaut 4 and Micronaut 3 lines.
date: "2026-11-04T14:55:20"
modified: "2026-11-04T14:55:20"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/11/04/micronaut-framework-5-2-5/
---

We have released [Micronaut Framework 5.2.5](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.5), **a security release**. The highlight of this release is an upgrade of Netty to [4.2.20.Final](https://netty.io/news/2026/11/02/4-2-20-Final.html), which fixes multiple CVEs. **We recommend that all users update to Micronaut Framework 5.2.5.**

The release includes:

- [Micronaut Core 5.2.22](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.22)
- [Micronaut Micrometer 6.1.2](https://github.com/micronaut-projects/micronaut-micrometer/releases/tag/v6.1.2)
- [Micronaut SQL 7.2.1](https://github.com/micronaut-projects/micronaut-sql/releases/tag/v7.2.1)

## What's new in Micronaut Framework 5.2.5

### Micronaut Core

[Micronaut Core 5.2.22](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.22) updates Netty to [4.2.20.Final](https://netty.io/news/2026/11/02/4-2-20-Final.html), a Netty security release. It also caches exception handler lookups to avoid contention on every error, preserves Python exceptions across synchronous AOP calls, and parses `X-Forwarded-Host` the same way as the `Forwarded` header's host.

### Micronaut Micrometer

[Micronaut Micrometer 6.1.2](https://github.com/micronaut-projects/micronaut-micrometer/releases/tag/v6.1.2) defers Netty executor and JDBC pool metrics binding until application startup.

### Micronaut SQL

[Micronaut SQL 7.2.1](https://github.com/micronaut-projects/micronaut-sql/releases/tag/v7.2.1) fixes a startup failure that occurred when Liquibase or Flyway took a connection before the pool was ready, and closes the Hibernate `SessionFactory` before its `DataSource` pool on shutdown.

## Netty security releases across every supported line

Netty 4.2.20.Final and Netty 4.1.140.Final both fix a number of CVEs, including out-of-bounds reads in `netty-buffer`, unbounded memory usage in `netty-codec-http2` and `netty-codec-mqtt`, and an mTLS authentication bypass via session resumption in `netty-handler`. Because of these fixes, matching security releases are available for every currently supported Micronaut line:

- **Micronaut 5**: [Micronaut Framework 5.2.5](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.5) upgrades to [Netty 4.2.20.Final](https://netty.io/news/2026/11/02/4-2-20-Final.html) via [Micronaut Core 5.2.22](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.22).
- **Micronaut 4**: [Micronaut Platform 4.10.23](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v4.10.23) also upgrades to [Netty 4.2.20.Final](https://netty.io/news/2026/11/02/4-2-20-Final.html), via [Micronaut Core 4.10.36](https://github.com/micronaut-projects/micronaut-core/releases/tag/v4.10.36).
- **Micronaut 3**: [Micronaut Core 3.10.18](https://github.com/micronaut-projects/micronaut-core/releases/tag/v3.10.18) upgrades to [Netty 4.1.140.Final](https://netty.io/news/2026/11/02/4-1-140-Final.html), the matching security release for the Netty 4.1 line.

**We recommend that users of Micronaut 3, 4, and 5 upgrade to these releases.** Read the [Netty 4.2.20.Final](https://netty.io/news/2026/11/02/4-2-20-Final.html) and [Netty 4.1.140.Final](https://netty.io/news/2026/11/02/4-1-140-Final.html) release notes for the full list of fixes.

If you haven't yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](https://micronaut.io/support/) if you need any assistance.
