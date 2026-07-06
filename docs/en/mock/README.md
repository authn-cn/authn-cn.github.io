---
title: Mock Authentication Server
---

# Mock Authentication Server

**Service URL: <https://mock.authn.tech/>**

This is a **ready-to-use online Mock authentication service** deployed on Cloudflare Workers. Authentication/authorization flows typically require multiple roles to collaborate (a party to issue tokens, a party to consume tokens, protected APIs...), and setting them all up from scratch is tedious. This Mock implements all these roles and puts them on the public internet, so you can:

- **Develop and test**: When developing a client, no need to set up Keycloak / ADFS first—directly integrate with this Mock; conversely, with only a server, you can use this Mock's client to test your service.
- **Integration testing**: In CI, validate your authentication integration code with fixed, predictable responses (append `&user=alice` for non-interactive mode).
- **Learn and practice**: With [protocol documentation](../oidc/), observe how each step's messages actually look.

## Roles and Terminology

Use the four role names defined in **OAuth 2.0 (RFC 6749)**; **OIDC** (OpenID Connect Core) and **SAML 2.0** are just different names for the same set of roles. The table below aligns "same role, different name across specs":

| OAuth 2.0 (RFC 6749) | OIDC | SAML 2.0 | Chinese / Responsibility | This Mock |
|------|------|------|------|------|
| Resource Owner | End-User | Principal (Subject) | Resource owner / end-user, grants consent | Test users alice / bob |
| Authorization Server | OpenID Provider (OP) | Identity Provider (IdP) | Issuer: verifies identity, issues tokens / assertions | `/oidc/*`, `/saml/idp/*` |
| Client | Relying Party (RP) | Service Provider (SP) | Consumer: initiates login, verifies tokens / assertions | `/rp/`, `/saml/sp/*` |
| Resource Server | Resource Server | —— | Protected API / resource server | `/rs/api` |

> RFC 6749's terminology is **Resource Owner / Client / Authorization Server / Resource Server**. OIDC calls the Authorization Server an **OP** and the Client an **RP**; SAML calls them **IdP / SP**—all are aliases for the same set of roles. The **Resource Owner is a person** (not a service you integrate with), represented in this site by alice / bob on the authorization page; thus the following sections focus only on the service roles.

The roles, endpoints, and step-by-step call sequences on both sides are:

- 🔷 [**OIDC / OAuth2 Mock**](./oidc.md) — OP / RP / RS three roles + Authorization Code + PKCE call sequence
- 🔶 [**SAML Mock**](./saml.md) — IdP / SP two roles + Web Browser SSO call sequence
- 📬 [**Mail Server**](./mail.md) — Receive `@authn.tech` emails via Email Routing, view online / via API, extract one-time verification codes

::: danger Testing Only
The signing private keys are public in the [source code](https://github.com/authn-cn/authn-mock); anyone can forge tokens / assertions issued by this service; authorization codes are not guaranteed single-use (stateless implementation). **No production system should trust tokens or assertions from the Mock service.**
:::

## Mix and Match: Replace One Component with Your Own Service

The Mock's value is **only mocking the part you don't have**; use your own real service for the rest. Common combinations:

| You Already Have | Use Mock to Supply | How to Integrate |
|----------|--------------|--------|
| RP / client | **Mock OP** | Point your RP's issuer to `https://mock.authn.tech` (auto-discovers `/.well-known/openid-configuration`) |
| OP / authorization server | **Mock RP** | Open the [`/rp/`](https://mock.authn.tech/rp/) console, enter your issuer and `client_id`, add `…/rp/callback` to the whitelist |
| Protected API but missing token source | **Mock OP** | Get `access_token` from Mock OP using `client_credentials` or auth code, then call your API |
| API client but missing protected resource | **Mock RS** | Call Mock RS at [`/rs/api`](https://mock.authn.tech/rs/) with a token from Mock OP to test your client's 401 / 403 handling |
| SP / trusted application | **Mock IdP** | Import [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) to your SP |
| IdP | **Mock SP** | Configure your IdP's Metadata to Mock SP, or use IdP-initiated to send to Mock SP's ACS |

The pattern is consistent: **issuer (OP / IdP) and consumer (RP / SP) always come in pairs**. Supply the missing piece, and Mock will pair with your real service to complete the full flow end-to-end.

Implementation progress and feature requests welcome at [GitHub](https://github.com/authn-cn/authn-mock).
