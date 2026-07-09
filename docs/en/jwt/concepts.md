---
title: "Core Concepts"
---

# Core Concepts

## The Three-Segment Structure in Detail

A JWT in JWS form consists of three Base64URL-encoded segments joined by `.`: `header.payload.signature`.

### Header

Describes metadata about the token itself; the most important field is the signature algorithm:

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

| Field | Meaning |
|------|------|
| `alg` | Signature/encryption algorithm. Common JWS values are `HS256`, `RS256`, `ES256`, `PS256` (see the [Reference](./reference.md#alg-values) for values) |
| `typ` | Token type, usually `JWT`; RFC 9068 access tokens use `at+jwt` |
| `kid` | Key ID, indicating which key to use for verification; works with [JWKS](../oidc/concepts.md#jwks-signature-verification-and-key-rotation) to locate the public key |

### Payload (claims)

A set of claims, in three categories:

- **Registered Claims**: standard fields predefined by RFC 7519, such as `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`.
- **Public Claims**: registered with IANA or using collision-resistant names (such as OIDC's `email`, `name`).
- **Private Claims**: custom fields agreed privately between the issuer and the consumer.

```json
{
  "iss": "https://op.example.com",
  "sub": "1234567890",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "roles": ["admin", "editor"]
}
```

For the full meaning of each field, see [Parameters & Claims Reference](./reference.md).

### Signature

The signature over the first two segments (`base64url(header)` + `"."` + `base64url(payload)`) using the algorithm named by `alg` in the Header. Any change to the header/payload invalidates the signature.

## Signature Algorithms: Symmetric vs. Asymmetric

| Family | Examples | Key | Use Case |
|------|------|------|------|
| **HMAC** | `HS256` / `HS384` / `HS512` | **Shared secret** (issuer and verifier use the same one) | Issuing + verifying within a single system; the secret must be kept strictly confidential |
| **RSA** | `RS256` / `PS256` … | **Private key signs, public key verifies** | Cross-party scenarios: the OP signs with its private key, and any RP verifies with the public key (OIDC defaults to `RS256`) |
| **ECDSA** | `ES256` / `ES384` … | Private key signs, public key verifies (elliptic curve) | Same as RSA, with shorter signatures and better performance |

::: tip Why OIDC Defaults to Asymmetric
With an asymmetric algorithm, the OP only needs to publish its public key (via [JWKS](../oidc/concepts.md#jwks-signature-verification-and-key-rotation)), and any RP can verify the signature without a shared secret. This is exactly what "one OP serving a huge number of RPs" requires. You can create test key pairs with the [JWK Generator](../tools/jwk.md).
:::

## Signature Verification Process

After receiving a JWT, the consumer (such as an RP or a resource server) should proceed in order:

1. **Split into three segments**, Base64URL-decode the Header, and read `alg` and `kid`.
2. **Determine the key**: for HMAC, use the agreed shared secret; for asymmetric algorithms, fetch the corresponding public key from the JWKS by `kid`.
3. **Verify the signature**: validate the third segment using the algorithm named by `alg`.
4. **Validate the claims**: `exp` not expired, `nbf`/`iat` reasonable (tolerating a small clock skew, typically ≤ 5 minutes); `iss`, `aud`, etc. equal to the expected values.
5. Only after all of the above pass is the payload trustworthy.

::: danger Three Fatal Verification Pitfalls
1. **Accepting `alg: none`**: an attacker changes the algorithm to `none` to drop the signature. **You must maintain an `alg` allowlist and never accept `none`.**
2. **Algorithm confusion (RS256 → HS256)**: an attacker changes an asymmetric algorithm to HMAC and **uses the public RSA public key as the HMAC shared secret** to forge a signature. **The verifier must pin the expected algorithm family and must not blindly trust the `alg` in the token.**
3. **Decoding without verifying**: trusting the payload directly. The first two segments can be edited by anyone; skipping verification means no security at all.

Use mature libraries (jose, openid-client, the official SDK for your language); do not hand-roll verification logic. You can experience the difference between decoding and verifying live with this site's [JWT Decoder](../tools/jwt.md).
:::

## The Three OIDC Tokens: Which Are JWTs and Which Aren't

A single OIDC authorization code flow yields up to three tokens, and their specification constraints are **completely different**—this is the key scenario for understanding where JWT belongs.

| Token | Is it a JWT? | Who verifies/consumes it | Can the client (RP) parse it? |
|-------|---------|--------------|---------------------|
| **ID Token** | **Must be** (JWS signed) | Client (RP) | ✅ Must parse and validate |
| **Access Token** | **Optional** (see RFC 9068) | Resource server | ❌ Treat as opaque |
| **Refresh Token** | **Usually not** | Authorization server | ❌ Never parse |

### ID Token — Must Be a JWT

The OIDC specification explicitly requires the ID Token to be a signed JWT, whose purpose is to "prove the user's identity." The RP must verify the signature and validate `iss`/`aud`/`exp`/`nonce` item by item. See [OIDC Core Concepts · ID Token Validation Checklist](../oidc/concepts.md#rp-s-validation-checklist-must-do).

### Access Token — Not Required to Be a JWT

To the RP, an access token should be **opaque**; the RP just uses it to call the resource server and should not parse it. The actual format depends on the authorization server:

- **opaque (random string)**: the resource server validates it online via the **Token Introspection** ([RFC 7662](https://www.rfc-editor.org/rfc/rfc7662)) endpoint.
- **JWT**: many modern ASs (Entra ID, Keycloak, Auth0) make access tokens JWTs (`typ: at+jwt`) per [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068), letting the resource server **verify locally** and avoid a network request each time.

::: warning Even if an access token looks like a JWT, the client should not rely on its content
A JWT-formatted access token is meant for the **resource server** to verify. The authorization server may switch it back to an opaque format at any time, and if your client code parses it, it will break.
:::

### Refresh Token — Almost Never a Meaningful JWT

It is completely opaque to the client, and its only use is to be exchanged at the authorization server for a new access token. Its format has no specification requirement; it is usually a high-entropy random string (with a record stored in the AS's database) or an encrypted string only the AS itself can decrypt. **The client must never parse it.**

## How to Tell Whether a Refresh Token Has Expired

Because a Refresh Token is opaque to the client, **you cannot parse out an `exp`, and therefore cannot proactively and reliably predict whether it has expired—you only find out when you use it.**

### Approach 1: Check the Error When You Use It (Most Mainstream, Most Reliable)

Take the Refresh Token to the token endpoint to exchange for new tokens; if it is no longer valid, the authorization server returns:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "invalid_grant",
  "error_description": "Token is expired or revoked"
}
```

**`invalid_grant` ([RFC 6749 §5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)) is the standard signal for "this Refresh Token can no longer be used."** It does not distinguish between expiration, revocation, and invalidation by rotation—for the client the result is the same: **clear the local session and redirect to log in again**. The standard logic is "optimistically assume it's valid, and handle the failure when it happens":

```
access token expires
  → exchange the refresh token for a new one
     → success: save the new tokens (mind rotation, see below) and continue
     → invalid_grant: the refresh token is gone too → log in again
```

### Approach 2: Record `expires_in` at Issuance (Estimate Only, Unreliable)

Some ASs return **non-standard** fields (varying by vendor) hinting at the Refresh Token's lifetime:

```json
{
  "access_token": "...",
  "expires_in": 3600,
  "refresh_token": "...",
  "refresh_token_expires_in": 2592000
}
```

Treat this only as a hint: most ASs don't return it; and even when they do, the Refresh Token may still **expire early** due to revocation, password change, concurrency limits, rotation, and so on.

### An Important Pitfall: Refresh Token Rotation

Most modern ASs (especially those targeting SPAs / mobile) enable rotation: every time you use a Refresh Token to exchange for tokens, **the old one is invalidated immediately and a new Refresh Token is issued at the same time**. Consequences:

1. You must **persist the new Refresh Token returned each time**, or next time you'll be using one that has already been invalidated.
2. If an already-used old Refresh Token is used again (suspected leak), the AS will **invalidate the entire token chain**—at which point you'll get `invalid_grant` even though it "hasn't expired."

::: tip Engineering Takeaway
Don't try to predict whether a Refresh Token has expired. **Treat `invalid_grant` as the single source of truth**: on receiving it, clear the session and redirect to log in; when rotation is enabled, be sure to save the newly returned Refresh Token every time.
:::

## Related Reading

- [Parameters & Claims Reference](./reference.md) — registered claims, `alg` values, RFC index
- [OIDC Core Concepts](../oidc/concepts.md) — ID Token validation checklist, JWKS and key rotation
- [OAuth 2.0 documentation](../oauth2/) — where access tokens and refresh tokens sit in the authorization flow
