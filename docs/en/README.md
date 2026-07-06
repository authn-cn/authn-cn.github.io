---
home: true
title: Home
heroText: Authn.tech
tagline: Hands-on tools for authentication & authorization — Online tools · Mock servers · Protocol docs
actions:
  - text: Open Online Tools
    link: /en/tools/
    type: primary
  - text: Mock Server Demo
    link: /en/mock/
    type: secondary
features:
  - title: 🛠 Online Tools
    details: 13 pure browser-side tools with data staying local — JWT parsing and signing, PKCE generation, OIDC Discovery viewer, SAML message encoding/decoding and Metadata parsing, JWK ↔ PEM conversion, TOTP, WebAuthn demo, and more.
  - title: 🚀 Mock Server
    details: Live SAML / OIDC dual-protocol Mock with all four roles (IdP / SP / OP / RP) plus resource server, real signature verification, for integration testing, E2E testing, and learning.
  - title: 📖 Protocol Docs
    details: Systematic documentation for SAML 2.0, OAuth 2.0, OIDC, WebAuthn/Passkey, MFA/TOTP — core concepts, typical flows, key parameters, oriented towards engineering practice.
footer: Authn.tech · Authentication & authorization, clearly explained
---

## Online Tools

Pure browser-side execution with data staying local, ready to use anytime:

- **JWT** — [Decoder](/en/tools/jwt.html) (jwt.io style with three-segment highlighting + signature verification), [Signer](/en/tools/jwt-sign.html)
- **OAuth 2.0 / OIDC** — [PKCE Generator](/en/tools/pkce.html), [OIDC Discovery Viewer](/en/tools/discovery.html), [JWK Viewer](/en/tools/jwk.html), [JWK → PEM](/en/tools/jwk-convert.html), [PEM → JWK](/en/tools/pem-to-jwk.html)
- **SAML** — [Message Encoder/Decoder](/en/tools/saml.html), [Response Parser](/en/tools/saml-parse.html), [Metadata Parser](/en/tools/saml-metadata.html)
- **MFA / Passkey** — [TOTP Generator](/en/tools/totp.html), [WebAuthn Demo](/en/tools/webauthn.html)
- **General** — [Base64URL Encoder/Decoder](/en/tools/base64url.html), [Certificate Viewer](/en/tools/cert.html), [PEM Parser](/en/tools/pem-parse.html)

## Mock Server

Live SAML / OIDC dual-protocol Mock with all four roles, real signature verification, ready for direct integration:

- **OP** (OpenID Provider, identity provider) — `/.well-known` + authorization / token / JWKS endpoints
- **RP** (Relying Party, client) — connects to any external OP, verifies tokens with JWKS
- **RS** (Resource Server, protected API) — validates bearer token scope
- **SAML IdP / SP** (identity provider / service provider) — enveloped signing, ACS validation display

👉 [View Mock Demo and Endpoint Docs](/en/mock/)

## Protocol Docs

- Want to understand **enterprise single sign-on** (SSO)? Start with [SAML 2.0 Overview](/en/saml/).
- Want to add **authorization** to your API? See [OAuth 2.0 Overview](/en/oauth2/).
- Want to implement "**login with XX account**"? See [OIDC Overview](/en/oidc/).
- Want to do **passwordless / phishing-resistant login** (Passkey)? See [WebAuthn Overview](/en/webauthn/).
- Want to add **second factor** (dynamic verification codes)? See [MFA / TOTP Overview](/en/mfa/).
