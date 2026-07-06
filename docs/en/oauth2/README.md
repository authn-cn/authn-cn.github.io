---
title: "OAuth 2.0 Overview"
---

# OAuth 2.0 Overview

OAuth 2.0 is the most widely used **authorization framework** on the internet today, defined by [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749). The core problem it solves is: **how can third-party applications access protected resources on a service on behalf of a user without obtaining the user's password**.

## What Problem Does OAuth 2.0 Solve

Imagine a scenario: a calendar management application wants to read your Google Calendar. Before OAuth, the common practice was for users to hand over their Google account password directly to the application — which meant:

- The application obtained **all your permissions**, not just calendar access;
- The application had to **store your password in plaintext**;
- You could not revoke access for just this one application; you could only change your password, which would disable all applications at once;
- The service provider could not distinguish between you operating directly or a third-party application operating on your behalf.

OAuth 2.0 replaces passwords with **tokens**: after a user logs in on an authorization server (such as Google) and explicitly approves the authorization scope, the third-party application receives an Access Token with limited permissions, that can be revoked individually, and has an expiration date. It uses this token to access resources.

::: warning OAuth is authorization, not authentication
This is the most common conceptual misunderstanding. OAuth 2.0 answers the question "**can this application access a certain resource on behalf of the user**" (authorization, Authorization), not "**who is the current user**" (authentication, Authentication).

An Access Token itself does not carry reliable semantics of "user is logged in" — obtaining a token does not prove user identity (for example, the token could have been issued for another application and then injected). Using OAuth directly as a login protocol introduces security vulnerabilities. **When authentication/login is needed, you should use OpenID Connect (OIDC), which is built on top of OAuth 2.0.** It provides cryptographically protected identity assertions through ID Tokens.
:::

## Development History

| Time | Event |
|------|-------|
| 2007 | OAuth 1.0 released. Based on request signing (HMAC-SHA1), unfriendly to developers, implementations prone to errors |
| 2010 | OAuth 1.0a fixes session fixation vulnerability, becomes RFC 5849 |
| 2012 | **OAuth 2.0 released (RFC 6749 Framework + RFC 6750 Bearer Token)**. Abandons request signing in favor of TLS + Bearer Token, greatly simplifying implementation; the trade-off is that security depends more on correct deployment practices |
| 2015 | RFC 7636 (PKCE) released, originally designed for public clients like mobile apps, later recommended for all clients |
| 2019 onwards | **OAuth 2.1 draft** (draft-ietf-oauth-v2-1) in progress: consolidates 2.0 + PKCE + security best practices, **removes Implicit and Password grant types**, mandates PKCE and exact redirect_uri matching |
| 2025 | RFC 9700 (OAuth 2.0 Security Best Current Practice) released, formally establishing modern security baseline |

OAuth 2.0 is a **framework** rather than a single protocol: the core specification intentionally leaves extension points (grant types, token formats, client authentication methods), gradually filled in by subsequent RFCs.

## Core RFC Map

| RFC | Name | Purpose |
|-----|------|---------|
| [RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749) | The OAuth 2.0 Authorization Framework | Core framework: roles, grant types, endpoints, error codes |
| [RFC 6750](https://datatracker.ietf.org/doc/html/rfc6750) | Bearer Token Usage | How Access Tokens are carried in HTTP requests |
| [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636) | PKCE | Cryptographic proof for authorization code exchange, prevents code interception |
| [RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628) | Device Authorization Grant | Authorization flow for input-constrained devices like TVs and CLIs |
| [RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009) | Token Revocation | Client-initiated token revocation endpoint |
| [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662) | Token Introspection | Resource server queries token status and metadata |
| [RFC 8414](https://datatracker.ietf.org/doc/html/rfc8414) | Authorization Server Metadata | Authorization server configuration discovery (`/.well-known/oauth-authorization-server`) |
| [RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700) | Security Best Current Practice | Modern security baseline: mandates PKCE, deprecates Implicit/Password, etc. |

Other common related specifications: RFC 7519 (JWT), RFC 9068 (JWT-formatted Access Token), RFC 8705 (mTLS client authentication), RFC 9126 (PAR, Pushed Authorization Requests).

## Use Cases

- **Third-party application integration**: Allow external applications limited access to user data on your platform (typical open platform APIs).
- **Frontend/backend separation or mobile apps of your own services**: SPAs and mobile clients obtain API access through Authorization Code + PKCE.
- **Microservices / machine-to-machine (M2M)**: Service-to-service calls use Client Credentials mode, without user involvement.
- **Input-constrained devices**: Smart TVs, IoT devices, CLI tools use Device Flow.
- **As the foundation for OIDC**: Single sign-on (SSO) and social login are essentially OIDC, built on top of OAuth 2.0.

Not suitable or requires caution in: pure "user login" requirements should use OIDC directly; highly trusted first-party scenarios should not fall back to the deprecated Password mode (see [typical flows](./flows.md)).

## Positioning Compared to SAML / OIDC

| Dimension | OAuth 2.0 | OIDC | SAML 2.0 |
|-----------|-----------|------|----------|
| Problem solved | **Authorization** (delegated API access) | **Authentication** (who is the user) + authorization | Authentication + enterprise SSO |
| Data format | JSON / form-encoded | JSON (JWT) | XML |
| Token | Access Token, Refresh Token | Adds ID Token (JWT) | SAML Assertion |
| Typical scenarios | API access, open platforms, M2M | Social login, mobile/SPA login, modern SSO | Traditional enterprise internal SSO (legacy system integration) |
| Mobile friendliness | Good | Good | Poor |
| Release year | 2012 | 2014 | 2005 |

Quick memory aid: **SAML is the previous-generation enterprise SSO; OAuth 2.0 manages API authorization; OIDC = OAuth 2.0 + identity layer, the default choice for modern login solutions**.

## Navigation for This Section

- [Core Concepts](./concepts.md) — Roles, client types, tokens, scope, endpoints, state and PKCE
- [Typical Flows](./flows.md) — Authorization Code (+PKCE), Client Credentials, Device Flow, Refresh Token, and deprecated flows
- [Typical Parameters and Response Reference](./reference.md) — Parameter tables, error code tables, troubleshooting quick lookup

::: tip Reading Recommendations
On first encounter, it's recommended to read in order: Concepts → Flows → Reference. Readers with existing knowledge can use the [Reference page](./reference.md) directly as a quick reference.
:::
