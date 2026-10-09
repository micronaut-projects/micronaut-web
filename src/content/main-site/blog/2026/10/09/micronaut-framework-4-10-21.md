---
slug: 2026/10/09/micronaut-framework-4-10-21
title: Micronaut Framework 4.10.21 Released!
description: Micronaut Framework 4.10.21 is a security release. It includes Micronaut Core 4.10.31, which updates Jackson to 2.21.7 and Netty to 4.2.19.Final, both security releases that fix several vulnerabilities.
date: "2026-10-09T10:00:00"
modified: "2026-10-09T10:00:00"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/10/09/micronaut-framework-4-10-21/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Framework 4.10.21](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v4.10.21)!

**Micronaut Framework 4.10.21 is a security release.** It includes [Micronaut Core 4.10.31](https://github.com/micronaut-projects/micronaut-core/releases/tag/v4.10.31), which updates two managed dependencies to security releases:

- [Jackson](https://github.com/FasterXML/jackson) is updated to [`2.21.7`](https://github.com/FasterXML/jackson/wiki/Jackson-Release-2.21.7). This Jackson patch release fixes several vulnerabilities in `jackson-core` and `jackson-databind`, including unbounded growth of the type id cache in `TypeDeserializer`, quadratic forward-reference resolution in Collection and Map deserializers, and parser issues that could lead to excessive resource consumption.
- [Netty](https://netty.io/) is updated to [`4.2.19.Final`](https://netty.io/news/2026/10/06/4-2-19-Final.html). This Netty security release fixes several vulnerabilities, including HTTP request/response smuggling and unbounded resource consumption in the HTTP, HTTP/2, and HTTP/3 codecs.

**We strongly recommend that all Micronaut Framework 4 users update to Micronaut Framework 4.10.21.**

If you are using Micronaut Framework 5, update to [Micronaut Framework 5.2.2](/2026/10/07/micronaut-framework-5-2-2/), which also updates Netty to `4.2.19.Final`.

If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
