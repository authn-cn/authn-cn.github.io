---
title: Tools Overview
---

# Online Tools

This site provides a set of online tools for debugging authentication protocols. **All logic runs in your browser locally; your tokens and messages are never uploaded to any server**, so you can confidently paste debugging data.

## JWT / JWK

| Tool | Purpose |
|------|---------|
| [JWT Decoder and Verifier](./jwt.md) | jwt.io style dual-column decode with three-segment color highlighting; supports full `HS/RS/PS/ES` series signature verification |
| [JWT Signer](./jwt-sign.md) | Enter Payload + secret to generate signed token, one-click test key pair generation |
| [JWK / Key Pair Generator](./jwk.md) | Generate RSA/EC key pairs, export JWK, JWKS, PEM with RFC 7638 `kid` |
| [JWK / JWKS → PEM](./jwk-convert.md) | Convert JWK/JWKS to PEM public key, display `kty`/`alg`/`use`/`kid` and thumbprint |
| [PEM → JWK](./pem-to-jwk.md) | Convert PEM public key (SPKI) / private key (PKCS#8) to JWK with RFC 7638 `kid` |

## OAuth2 / OIDC

| Tool | Purpose |
|------|---------|
| [PKCE Generator](./pkce.md) | Generate `code_verifier` / `code_challenge` (S256) plus `state`, `nonce` |
| [OIDC Discovery Viewer](./discovery.md) | Enter issuer, fetch and interpret `/.well-known/openid-configuration` and JWKS |

## MFA / Passkey

| Tool | Purpose |
|------|---------|
| [TOTP Tool](./totp.md) | Generate secret, real-time code and countdown, `otpauth://` URI and QR code, verify codes |
| [WebAuthn Demo](./webauthn.html) | Create/use Passkey in browser, parse attestation/assertion data structure |

## SAML / Certificate / Encoding

| Tool | Purpose |
|------|---------|
| [SAML Encoder/Decoder](./saml.md) | Decode `SAMLRequest` / `SAMLResponse` (auto-detect Redirect / POST encoding), generate AuthnRequest and Redirect URL |
| [SAML Metadata Parser](./saml-metadata.md) | Parse metadata: role, entityID, endpoints, NameIDFormat, display embedded certificate validity / fingerprint |
| [SAML Response Parser](./saml-parse.md) | Structured display of Response/Assertion: Subject, Conditions, Attributes, signature algorithm |
| [X.509 Certificate Parser](./cert.md) | Parse PEM/DER certificate: subject, issuer, validity, public key/signature algorithm, SHA-1/SHA-256 fingerprint |
| [PEM Parser](./pem-parse.md) | Identify any PEM block type (certificate/CSR/public/private key/CRL), show DER length and key algorithm |
| [Base64URL Encoder/Decoder](./base64url.md) | Text ↔ Base64 / Base64URL conversion |

::: tip Companion Mock Service
Need end-to-end integration testing? See [Mock Server](../mock/): OIDC OP/RP, resource server, SAML IdP/SP with all four roles plus clickable [OIDC login demo](../mock/demo.md). Feature requests welcome on [GitHub](https://github.com/authn-cn/authn-cn.github.io/issues).
:::
