---
title: "Parameters & Claims Reference"
---

# Parameters & Claims Reference

## Registered Claims (RFC 7519 §4.1)

These are the standard payload fields reserved by RFC 7519. They are all **optional**, but higher-level specifications such as OAuth2 / OIDC make them required as needed.

| Claim | Full Name | Meaning |
|-------|------|------|
| `iss` | Issuer | Issuer identifier, usually the HTTPS URL of the AS/OP |
| `sub` | Subject | The subject (the entity the token describes), unique within the scope of `iss` |
| `aud` | Audience | The intended recipient(s) of the token; may be a string or an array |
| `exp` | Expiration Time | Expiration time (Unix seconds); must be rejected after this |
| `nbf` | Not Before | Time it becomes valid (Unix seconds); must be rejected before this |
| `iat` | Issued At | Issue time (Unix seconds) |
| `jti` | JWT ID | Unique token identifier, usable for replay protection / blacklisting |

::: tip Time claims are all in Unix seconds
`exp` / `nbf` / `iat` are all **seconds** since 1970-01-01 UTC (not milliseconds). When validating, allow a small clock skew, typically ≤ 300 seconds.
:::

## Common Header Fields

| Field | Meaning |
|------|------|
| `alg` | Signature/encryption algorithm (see table below) |
| `typ` | Token type: `JWT`; RFC 9068 access tokens use `at+jwt`; logout tokens use `logout+jwt` |
| `kid` | Key ID, used with JWKS to locate the verification public key |
| `cty` | Content type, used for nested JWTs |
| `jku` / `x5c` / `x5t` | A URL pointing to a key / a certificate chain / a certificate thumbprint (accepting an external `jku` is risky and requires caution) |

## `alg` Values

### JWS Signature Algorithms (RFC 7518 §3)

| `alg` | Description | Key Type |
|-------|------|----------|
| `HS256` / `HS384` / `HS512` | HMAC + SHA-2 | Symmetric shared secret |
| `RS256` / `RS384` / `RS512` | RSASSA-PKCS1-v1_5 + SHA-2 | RSA public/private key |
| `PS256` / `PS384` / `PS512` | RSASSA-PSS + SHA-2 | RSA public/private key |
| `ES256` / `ES384` / `ES512` | ECDSA + SHA-2 | EC public/private key |
| `EdDSA` | Ed25519 / Ed448 (RFC 8037) | OKP public/private key |
| `none` | No signature | — |

::: danger Never accept `none`
In production you **must** maintain an `alg` allowlist and reject `none`, and also pin the expected algorithm family to prevent RS256→HS256 confusion attacks. See [Core Concepts · Three Fatal Verification Pitfalls](./concepts.md#signature-verification-process).
:::

### Common JWE Encryption Algorithms (RFC 7518, when confidentiality is needed)

| Purpose | Example Values |
|------|----------|
| Key management (`alg`) | `RSA-OAEP`, `ECDH-ES`, `A256KW` |
| Content encryption (`enc`) | `A128GCM`, `A256GCM`, `A256CBC-HS512` |

## Base64URL

Each segment of a JWT is encoded with **Base64URL** (RFC 4648 §5), which differs from standard Base64 as follows:

- `+` → `-`, `/` → `_`
- Trailing `=` padding is removed

The goal is to let the token be safely placed in URLs and HTTP headers. Convert between them with the [Base64URL Encoder/Decoder](../tools/base64url.md).

## Related RFC Index

| RFC | Title |
|-----|------|
| [RFC 7515](https://www.rfc-editor.org/rfc/rfc7515) | JSON Web Signature (JWS) |
| [RFC 7516](https://www.rfc-editor.org/rfc/rfc7516) | JSON Web Encryption (JWE) |
| [RFC 7517](https://www.rfc-editor.org/rfc/rfc7517) | JSON Web Key (JWK) |
| [RFC 7518](https://www.rfc-editor.org/rfc/rfc7518) | JSON Web Algorithms (JWA) |
| [RFC 7519](https://www.rfc-editor.org/rfc/rfc7519) | JSON Web Token (JWT) |
| [RFC 7662](https://www.rfc-editor.org/rfc/rfc7662) | OAuth 2.0 Token Introspection |
| [RFC 8037](https://www.rfc-editor.org/rfc/rfc8037) | CFRG-curve usage in JOSE (EdDSA, etc.) |
| [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068) | JWT Profile for OAuth 2.0 Access Tokens |

## Related Tools

- [JWT Decoder](../tools/jwt.md) — decoding and verification
- [JWT Signer](../tools/jwt-sign.md) — build test tokens
- [JWK Generator](../tools/jwk.md) · [JWK → PEM](../tools/jwk-convert.md) · [PEM → JWK](../tools/pem-to-jwk.md)
- [Base64URL Encoder/Decoder](../tools/base64url.md)
