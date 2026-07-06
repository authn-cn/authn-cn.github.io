---
title: "SAML 2.0 Overview"
---

# SAML 2.0 Overview

## What is SAML

SAML (Security Assertion Markup Language) is an open, XML-based standard for exchanging authentication and authorization data across different security domains. It is defined by OASIS (Organization for the Advancement of Structured Information Standards), and the currently widely-used version is **SAML 2.0**, released in March 2005.

The core problem that SAML solves is: **after a user logs in to system A, how can system B safely trust that "this user has been authenticated," without requiring the user to share their password with B?** It is the de facto standard protocol for enterprise Single Sign-On (SSO) and remains the preferred approach for many SaaS products integrating with enterprise identity systems.

The basic SAML working model:

1. **Identity Provider** (IdP) authenticates users and issues a digitally signed XML document—an **Assertion**—stating "a certain user completed authentication in a certain way at a certain time and possesses certain attributes."
2. **Service Provider** (SP) receives and verifies this Assertion (signature, validity period, audience), then establishes a local session for the user.

Because the Assertion carries the IdP's XML digital signature, the SP can verify its authenticity and integrity offline (in the most common POST Binding) without needing to communicate with the IdP in real-time. This is an important characteristic of the SAML architecture.

## Historical Evolution: SAML 1.0 / 1.1 → 2.0

| Version | Release Date | Notes |
|---------|--------------|-------|
| SAML 1.0 | November 2002 | OASIS's first version, establishing the foundational Assertion/Protocol/Binding framework |
| SAML 1.1 | September 2003 | Minor revisions, adopted in early federated identity deployments |
| SAML 2.0 | March 2005 | Major version, **not backward compatible with 1.1** |

SAML 2.0 combined three technical lineages: SAML 1.1 itself, Liberty Alliance's **ID-FF 1.2** (Identity Federation Framework), and experience from Shibboleth 1.3. Key improvements over 1.1 include:

- Introduction of standardized `<AuthnRequest>` messages for **SP-initiated SSO** (version 1.1 only defined IdP-initiated push);
- Addition of **Single Logout** (SLO) protocol;
- New **Metadata** specification, allowing endpoints and certificates between SP and IdP to be exchanged in a standardized manner;
- Introduction of **NameID Format** (persistent and transient identifiers) and NameID management protocols, supporting privacy-preserving federation scenarios;
- Support for **XML encryption** of Assertions, NameIDs, and Attributes.

::: tip
Today, new integrations almost never use SAML 1.1. If you encounter a legacy system that only supports 1.1, prioritize upgrading. The two versions have incompatible message formats and namespaces (`urn:oasis:names:tc:SAML:1.0:*` vs `urn:oasis:names:tc:SAML:2.0:*`).
:::

## OASIS Standard Document Composition

SAML 2.0 is not a single document but a collection of specifications. The four core documents most frequently consulted in engineering are:

| Document | Common Shorthand | Content |
|----------|------------------|---------|
| Assertions and Protocols | **Core** (saml-core-2.0-os) | Defines Assertion structure (three Statement types) and request/response protocol messages (`AuthnRequest`, `Response`, `LogoutRequest`, etc.) with XML Schema and processing rules |
| Bindings | **Bindings** (saml-bindings-2.0-os) | Defines how protocol messages map to transport: HTTP-Redirect, HTTP-POST, HTTP-Artifact, SOAP, etc. |
| Profiles | **Profiles** (saml-profiles-2.0-os) | Combines Core + Bindings into interoperable complete use cases; most important are Web Browser SSO Profile and Single Logout Profile |
| Metadata | **Metadata** (saml-metadata-2.0-os) | Defines `EntityDescriptor` and other metadata formats for exchanging entity identity, endpoints, and certificates |

The four-layer relationship can be summarized as: **Core defines "what to say," Bindings define "how to transmit," Profiles define "how to conduct complete conversation," and Metadata defines "how the two parties exchange configuration."** These concepts are elaborated in detail on the [Core Concepts](./concepts.md) page.

Additionally, there are supplementary documents on Conformance, Security and Privacy Considerations, and Authentication Context, which are worth consulting for troubleshooting and security reviews.

## Typical Use Cases

SAML 2.0's most typical—and practically the only still-growing—scenario is **enterprise Web SSO / identity federation**:

- **Internal enterprise SSO**: Employees log in once to the company's IdP (such as AD FS, Keycloak, Ping, Okta, Azure AD / Entra ID) and can access all internal web applications.
- **Enterprise integration with SaaS**: When enterprises purchase SaaS products like Salesforce, Workday, or Jira, SAML enables employees to log in using company accounts, with account lifecycle managed centrally by the enterprise (often combined with SCIM for account synchronization).
- **Cross-organizational federation**: Academic alliances (such as eduGAIN/Shibboleth ecosystem), trusted identity recognition between government and enterprises.

### Positioning vs. OAuth 2.0 / OIDC

| Dimension | SAML 2.0 | OAuth 2.0 | OIDC (OpenID Connect) |
|-----------|----------|-----------|----------------------|
| Problem Solved | Authentication + attribute delivery (SSO) | **Authorization** (delegated API access) | Authentication (built on OAuth 2.0) |
| Message Format | XML (signatures/encryption use XML-DSig/XML-Enc) | JSON / form parameters | JSON, tokens are JWT |
| Primary Credential | Assertion | Access Token | ID Token (+ Access Token) |
| Client Form | Traditional web apps (browser redirect/POST) | Web, mobile, SPA, service-to-service | Web, mobile, SPA |
| Mobile/API Friendliness | Poor | Good | Good |
| Enterprise SaaS Support | Mature | — (not used for login) | Rapidly proliferating |
| Typical Choice | Integrating with existing enterprise IdP, SaaS enterprise edition login | Open API authorization | SSO for new systems—first choice |

::: tip Selection Recommendation
For new systems, prioritize OIDC; however, if your product will be sold to medium-to-large enterprises, you'll likely encounter SAML regardless—many enterprise IdPs and compliance processes still center on SAML. The two are not mutually exclusive; a common approach is to use Keycloak or similar middleware to bridge protocols (OIDC internally, SAML externally).
:::

## Chapter Navigation

- [Core Concepts](./concepts.md) —— Roles, Assertion, Protocol, Binding, Profile, Metadata, NameID, signatures and encryption
- [Typical Flows](./flows.md) —— SP-initiated SSO, IdP-initiated SSO, Single Logout step-by-step flows and complete message examples
- [Typical Parameters and Message Reference](./reference.md) —— AuthnRequest/Response element quick reference, StatusCode, NameID Format, troubleshooting quick lookup
