---
slug: 2026/09/09/micronaut-framework-5-1-4
title: Micronaut Framework 5.1.4 Released!
description: Micronaut framework 5.1.4 includes Micronaut Core 5.1.14 and Micronaut Data 5.1.4, which address several security advisories.
date: '2026-09-09T18:21:20'
modified: '2026-09-12T08:59:03'
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/09/09/micronaut-framework-5-1-4/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Framework 5.1.4](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.1.4)!

It includes releases of [Micronaut Core 5.1.14](https://github.com/micronaut-projects/micronaut-core/releases/tag/v5.1.14) and [Micronaut Data 5.1.4](https://github.com/micronaut-projects/micronaut-data/releases/tag/v5.1.4).

**We strongly recommend that users update to Micronaut Framework 5.1.4**, as this release addresses several security advisories:

- [Unbounded memory growth from fragmented WebSocket messages (DoS)](https://github.com/micronaut-projects/micronaut-core/security/advisories/GHSA-9c73-4fch-jrwv)
- [Default error response always includes raw exception message with no suppression option](https://github.com/micronaut-projects/micronaut-core/security/advisories/GHSA-gxcm-8fhf-v7x9)
- [HTTP request decompression-bomb DoS via unbounded gzip/deflate decoding](https://github.com/micronaut-projects/micronaut-core/security/advisories/GHSA-2j79-mgc9-v76r)
- [SQL injection and tenant-isolation bypass via unvalidated tenant identifier in schema-based multi-tenancy](https://github.com/micronaut-projects/micronaut-data/security/advisories/GHSA-89gw-j7wx-52r5)
- [SQL injection via unvalidated Sort/Pageable property names in native `@Query` methods](https://github.com/micronaut-projects/micronaut-data/security/advisories/GHSA-p777-32qx-jgx2)

If you are using Micronaut Framework 4, update to [Micronaut Platform 4.10.18](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v4.10.18), which contains fixes for these vulnerabilities. If you are using Micronaut Framework 3, update to [Micronaut Core 3.10.11](https://github.com/micronaut-projects/micronaut-core/releases/tag/v3.10.11), which contains fixes for the Micronaut Core vulnerabilities.

For Micronaut Framework 3, the framework BOM is published in Micronaut Core. Since Micronaut Framework 4, the framework BOM is published in Micronaut Platform. Consequently, Micronaut Framework 4 and later framework releases are represented by Micronaut Platform releases.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
