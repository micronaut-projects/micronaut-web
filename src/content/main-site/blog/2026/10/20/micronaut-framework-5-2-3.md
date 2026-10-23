---
slug: 2026/10/20/micronaut-framework-5-2-3
title: Micronaut Framework 5.2.3 Released!
description: Micronaut Framework 5.2.3 is a security release with fixes in Micronaut Core and Security, plus updates to Data, Object Storage, and Serialization.
date: "2026-10-20T19:52:46"
modified: "2026-10-20T19:52:46"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/10/20/micronaut-framework-5-2-3/
---

We are excited to announce the release of [Micronaut Framework 5.2.3](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.3)!

**Micronaut Framework 5.2.3 is a security release.** The release notes for [Micronaut Core 5.2.17](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.17) and [Micronaut Security 5.4.1](https://github.com/micronaut-projects/micronaut-security/releases/tag/v5.4.1) list eight and two security advisories, respectively. **We strongly recommend that all users update to Micronaut Framework 5.2.3.**

The release also includes [Micronaut Data 5.2.3](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.3), [Micronaut Object Storage 3.1.1](https://github.com/micronaut-projects/micronaut-object-storage/releases/tag/v3.1.1), and [Micronaut Serialization 3.2.5](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.5).

If you are using Micronaut Framework 4, update to [Micronaut Platform 4.10.22](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v4.10.22), which includes [Micronaut Core 4.10.33](https://github.com/micronaut-projects/micronaut-core/releases/tag/v4.10.33) and [Micronaut Security 4.18.1](https://github.com/micronaut-projects/micronaut-security/releases/tag/v4.18.1) with corresponding security fixes.

If you are using Micronaut Framework 3, update to [Micronaut Core 3.10.17](https://github.com/micronaut-projects/micronaut-core/releases/tag/v3.10.17), the latest Framework 3 release, which also contains these security fixes.

## What's new in Micronaut Framework 5.2.3

### Micronaut Core

[Micronaut Core 5.2.17](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.2.17) adds Python-native streaming, including async iteration over publishers and async generators as publishers. It also fixes issues with HTTP range requests, streaming uploads, and streamed responses.

### Micronaut Data

[Micronaut Data 5.2.3](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.2.3) fixes geospatial conversion and coordinate handling, including longitude/latitude ordering for MySQL WKT values.

### Micronaut Object Storage

[Micronaut Object Storage 3.1.1](https://github.com/micronaut-projects/micronaut-object-storage/releases/tag/v3.1.1) lets you configure the internal directory used by local storage.

### Micronaut Serialization

[Micronaut Serialization 3.2.5](https://github.com/micronaut-projects/micronaut-serialization/releases/tag/v3.2.5) fixes generated serializer support for `@JsonProperty` and `@JsonGetter` methods, and prefers user-defined serde beans over generated serializers for the same type.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
