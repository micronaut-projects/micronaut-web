---
slug: 2026/11/23/micronaut-framework-5-2-8
title: Micronaut Framework 5.2.8 Released!
description: Micronaut Framework 5.2.8 is a security release with fixes in Micronaut Security 5.4.3 and Micronaut Servlet 6.2.3.
date: "2026-11-23T15:33:47"
modified: "2026-11-23T15:33:47"
category: release-announcements
categories:
  - release-announcements
  - security-announcements
tags:
  - release
  - security
href: /2026/11/23/micronaut-framework-5-2-8/
---

We have released [Micronaut Framework 5.2.8](https://github.com/micronaut-projects/micronaut-platform/releases/tag/v5.2.8), a security release. It updates to [Micronaut Security 5.4.3](https://github.com/micronaut-projects/micronaut-security/releases/tag/v5.4.3), which addresses 14 GitHub Security Advisories, and to [Micronaut Servlet 6.2.3](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.3), which addresses three, one of them critical. **We strongly recommend that all users update to Micronaut Framework 5.2.8.**

## Micronaut Servlet

[Micronaut Servlet 6.2.3](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v6.2.3) fixes the following advisories:

- **Critical**, [GHSA-w6m4-q67f-c6vj](https://github.com/micronaut-projects/micronaut-servlet/security/advisories/GHSA-w6m4-q67f-c6vj): `micronaut.ssl.client-authentication` was not enforced on Tomcat and Undertow, so clients without a certificate got past mutual TLS.
- **High**, [GHSA-23wq-jr9g-78hm](https://github.com/micronaut-projects/micronaut-servlet/security/advisories/GHSA-23wq-jr9g-78hm): the POJA runtime parsed unread request bodies as the next request, which allowed request smuggling, handled `Content-Length` and `Transfer-Encoding` leniently, and did not bound line lengths.
- **High**, [GHSA-7xvw-h4vr-r24m](https://github.com/micronaut-projects/micronaut-servlet/security/advisories/GHSA-7xvw-h4vr-r24m): the JDK HTTP server runtime decoded request paths before it parsed the URI, which caused double decoding, path and query confusion, and dropped connections.

**If you rely on mutual TLS with Tomcat or Undertow, update as soon as possible.**

## Micronaut Security

[Micronaut Security 5.4.3](https://github.com/micronaut-projects/micronaut-security/releases/tag/v5.4.3) fixes three advisories of high severity, ten of medium severity, and one of low severity.

### High

- [GHSA-7xhp-hpw5-j83r](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-7xhp-hpw5-j83r): unsigned JWTs were accepted after OpenID discovery failed at startup. The JWKS signatures of OpenID providers are now registered even when discovery fails.
- [GHSA-88vj-5xqx-98wp](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-88vj-5xqx-98wp): `WellKnownProxyFilter` forwarded the `Cookie` and `Authorization` headers to the issuer. Credentials are no longer forwarded.
- [GHSA-v87w-xpvm-29vx](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-v87w-xpvm-29vx): the UserInfo token validator accepted access tokens issued to other clients by default.

### Medium

- [GHSA-fwcg-w62g-38x8](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-fwcg-w62g-38x8): `HEAD` requests bypassed intercept URL map rules defined for `GET`.
- [GHSA-756q-64wx-cg5x](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-756q-64wx-cg5x): static resources with no matching rule were public when `micronaut.security.reject-not-found` was `false`.
- [GHSA-23v7-vrjc-9m3p](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-23v7-vrjc-9m3p): `@Secured` expressions could be evaluated as another user during JWKS load. Expressions are now evaluated in the context of the request being checked.
- [GHSA-h926-pf3j-rwq5](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-h926-pf3j-rwq5): `Authenticator` ignored the order of authentication providers, so the roles of the fastest provider won.
- [GHSA-7wpc-pg3p-r423](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-7wpc-pg3p-r423): signed CSRF tokens were not bound to the user with cookie authentication. They are now bound to the authenticated user.
- [GHSA-9233-7r85-gq32](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-9233-7r85-gq32): the OpenID password grant ignored the global `OpenIdAuthenticationMapper` and logged in users that the mapper rejects. The password grant flow now uses the global mapper.
- [GHSA-v3pj-67qw-v7x4](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-v3pj-67qw-v7x4): `idtoken` logout leaked the ID token to the wrong provider when issuers overlap. The logout provider is now resolved by audience.
- [GHSA-vm58-x8hm-gcp7](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-vm58-x8hm-gcp7): the UserInfo token validator leaked access tokens to other OpenID providers. Bearer tokens are now sent only to the UserInfo endpoint of their issuer.
- [GHSA-wwxx-8pqm-6mvg](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-wwxx-8pqm-6mvg): an unbounded LDAP connection pool blocked logins after a burst of anonymous requests.
- [GHSA-mprx-ccc5-533h](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-mprx-ccc5-533h): LDAP `context.properties` never reached JNDI, so `ssl` was ignored and binds were sent in cleartext.

### Low

- [GHSA-295c-r6r5-pvqc](https://github.com/micronaut-projects/micronaut-security/security/advisories/GHSA-295c-r6r5-pvqc): `ExecutorAuthenticationProvider` with a custom executor ran on the event loop. It now runs on the executor it names.

### Behaviour changes to check when you update

Some of these fixes change defaults. Review them before you update:

- UserInfo endpoint token validation is disabled by default.
- Intercept URL map rules defined for `GET` also apply to `HEAD` requests.
- Static resources that match no rule are rejected, even when `micronaut.security.reject-not-found` is `false`.
- Authentication providers are evaluated sequentially, in precedence order.
- The LDAP manager context is no longer pooled by default, and LDAP `context.properties` are passed to JNDI as flat verbatim keys.

## Micronaut Framework 4

If you are using Micronaut Framework 4, update to [Micronaut Framework 4.10.25](/2026/11/23/micronaut-framework-4-10-25/). [Micronaut Security 4.18.3](https://github.com/micronaut-projects/micronaut-security/releases/tag/v4.18.3) and [Micronaut Servlet 5.6.3](https://github.com/micronaut-projects/micronaut-servlet/releases/tag/v5.6.3) include the corresponding security fixes.

If you haven't yet updated to [Micronaut Framework 5](/2026/05/20/micronaut-framework-5-0-0-released/), this is an excellent opportunity to do so!

Please feel free to [reach out to us](/support/) if you need any assistance.
