---
slug: 2026/10/09/micronaut-framework-3-10-15
title: Micronaut Framework 3.10.15 Released!
description: Micronaut Framework 3.10.15 is a security release. Micronaut Core 3.10.15 updates managed Netty to 4.1.139.Final, a Netty security release that fixes several vulnerabilities.
date: "2026-10-09T10:15:00"
modified: "2026-10-09T10:15:00"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/10/09/micronaut-framework-3-10-15/
---

The Micronaut Foundation is excited to announce the release of [Micronaut Core 3.10.15](https://github.com/micronaut-projects/micronaut-core/releases/tag/v3.10.15)!

**Micronaut Framework 3.10.15 is a security release.** It updates managed [Netty](https://netty.io/) to [`4.1.139.Final`](https://netty.io/news/2026/10/06/4-1-139-Final.html). This Netty security release fixes several vulnerabilities, including HTTP request/response smuggling, unbounded resource consumption in the HTTP, HTTP/2, DNS, and XML codecs, and an SNI routing bypass. **We strongly recommend that all Micronaut Framework 3 users update to Micronaut Framework 3.10.15.**

If you are using Micronaut Framework 4, update to [Micronaut Framework 4.10.21](/2026/10/09/micronaut-framework-4-10-21/), which updates Netty to `4.2.19.Final` and Jackson to `2.21.7`. If you are using Micronaut Framework 5, update to [Micronaut Framework 5.2.2](/2026/10/07/micronaut-framework-5-2-2/).

[Netty 4.1](https://netty.io/news/2026/09/09/4-1-EOL-announcement.html) reaches end of life on July 1, 2027. If you haven’t yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
