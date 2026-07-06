---
title: "Core Concepts"
---

# Core Concepts

## Roles: OP, RP, and End-User

OIDC uses different terminology than OAuth 2.0 for roles. The mapping is as follows:

| OIDC Role | Corresponding OAuth 2.0 Role | Description |
|-----------|--------------------|------|
| **OP** (OpenID Provider) | Authorization Server | Responsible for authenticating users and issuing ID Token / access token; examples include Keycloak, Entra ID, Okta |
| **RP** (Relying Party) | Client | An application that relies on OP to complete user authentication; this is "your application" |
| **End-User** | Resource Owner | The person being authenticated |

OP simultaneously assumes all responsibilities of the OAuth 2.0 authorization server. Therefore, a single OIDC flow can produce both an ID Token (for RP to confirm user identity) and an access token (for RP to call APIs, such as the UserInfo Endpoint).

## ID Token Explained in Detail

The ID Token is OIDC's core product: a **JWT signed by OP** that asserts "a user completed authentication at a certain time." It consists of three Base64URL-encoded segments joined by `.`: `header.payload.signature`.

### Complete Example

Header (decoded):

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

Payload (decoded):

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "acr": "urn:mace:incommon:iap:silver",
  "amr": ["pwd", "otp"],
  "azp": "s6BhdRkqt3",
  "name": "Zhang San",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

### Required Claims

| Claim | Meaning |
|-------|------|
| `iss` | Issuer, OP's HTTPS URL identifier, must exactly match the `issuer` in the Discovery document |
| `sub` | Subject, the user's unique identifier within that OP. **This is the user's primary key; do not use email as the primary key** |
| `aud` | Audience, must include RP's `client_id`; can be a string or array |
| `exp` | Expiration, expiration time (Unix seconds), must be rejected after expiration |
| `iat` | Issued At, issue time (Unix seconds) |

### Common Optional Claims

| Claim | Meaning |
|-------|------|
| `nonce` | Random value passed by RP in the authentication request, returned as-is by OP to bind ID Token to this session and prevent replay attacks. If the request includes nonce, the response must include it |
| `auth_time` | The time when the user actually completed authentication. Must be returned if the request includes `max_age` or `auth_time` is an essential claim |
| `acr` | Authentication Context Class Reference, authentication context level (e.g., whether it meets a certain strength requirement) |
| `amr` | Authentication Methods References, array of authentication methods, e.g., `["pwd","otp"]` (password + one-time password) |
| `azp` | Authorized Party; when `aud` contains multiple audiences, indicates which client_id the token was actually issued to |

### RP's Validation Checklist (Must-Do)

Upon receiving an ID Token, RP **must** validate each item in order (reject login if any fails):

1. **Signature**: Verify using OP's JWKS public key according to `alg`/`kid` in the header; `alg` must be in an expected whitelist (**never accept `none`**).
2. **iss** equals the expected OP issuer (matching the `issuer` in the Discovery document).
3. **aud** includes your own `client_id`; if `aud` is a multi-value array, also verify `azp` equals your `client_id`.
4. **exp** is not expired, **iat** is reasonable (allow minor clock skew, typically ≤ 5 minutes).
5. **nonce** matches the value stored in the session when the authentication request was sent (burn after use).
6. If `max_age` was requested: verify `auth_time + max_age` has not exceeded the limit.
7. If your business requires a certain authentication strength: verify `acr` meets the requirement.

::: warning Do Not Skip Validation
Many OIDC-related vulnerabilities in the wild stem from RP laziness: not verifying signatures, not checking `aud`, not validating `nonce`. Use mature authentication libraries (such as openid-client, Spring Security, official SDKs for various languages) instead of writing JWT parsing logic yourself.
:::

## Standard Scopes and Corresponding Claims

OIDC uses scopes to batch-request groups of user attributes (claims):

| Scope | Meaning | Corresponding Claims (selected) |
|-------|------|--------------------|
| `openid` | **Required**, declares this is an OIDC authentication request | `sub` (and the ID Token itself) |
| `profile` | Basic profile | `name`, `given_name`, `family_name`, `nickname`, `preferred_username`, `picture`, `birthdate`, `locale`, `updated_at`, etc. |
| `email` | Email | `email`, `email_verified` |
| `address` | Address | `address` (JSON object) |
| `phone` | Phone | `phone_number`, `phone_number_verified` |
| `offline_access` | Request refresh token for token exchange even after user goes offline | — (no claims produced) |

Typical request: `scope=openid profile email`. Whether claims corresponding to profile/email scopes are included in the ID Token or returned only via UserInfo Endpoint is decided by the OP (most OPs return them via UserInfo by default).

## UserInfo Endpoint

UserInfo Endpoint is an OAuth2-protected REST interface where RP exchanges an access token for user claims:

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "Zhang San",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://op.example.com/avatars/248289761001.jpg"
}
```

::: warning Verify sub
RP must verify that the `sub` in the UserInfo response matches the `sub` in the ID Token. If they don't match, discard the UserInfo data. This prevents response confusion or replacement.
:::

## Discovery: /.well-known/openid-configuration

OIDC Discovery specifies that OP publishes a metadata document at a fixed path, allowing RP to auto-discover all endpoints and capabilities by configuring just an issuer URL:

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: op.example.com
```

Response excerpt:

```json
{
  "issuer": "https://op.example.com",
  "authorization_endpoint": "https://op.example.com/authorize",
  "token_endpoint": "https://op.example.com/token",
  "userinfo_endpoint": "https://op.example.com/userinfo",
  "jwks_uri": "https://op.example.com/.well-known/jwks.json",
  "end_session_endpoint": "https://op.example.com/logout",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "id_token", "code id_token"],
  "subject_types_supported": ["public", "pairwise"],
  "id_token_signing_alg_values_supported": ["RS256", "ES256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "private_key_jwt"],
  "code_challenge_methods_supported": ["S256"]
}
```

RP should verify that the document's `issuer` exactly matches the requested issuer (to prevent issuer confusion attacks) and can cache the document (following HTTP cache headers).

## JWKS, Signature Verification, and Key Rotation

The `jwks_uri` points to OP's **JWKS** (JSON Web Key Set, public key set):

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "2024-key-01",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZpt...(Base64URL modulus)",
      "e": "AQAB"
    }
  ]
}
```

Signature verification process: take the `kid` from the ID Token header, find the corresponding public key in JWKS, and verify the signature according to `alg`.

**Key rotation**: OP periodically replaces signing keys. JWKS typically maintains both old and new keys simultaneously; RP should cache JWKS and re-fetch once when encountering an unknown `kid` (with rate limiting to prevent malicious tokens from overwhelming OP). Mature client libraries have this logic built-in.

## sub Stability: public vs. pairwise

`sub` is stable and never reused within the scope of "same OP + same user"; it is the unique correct key for RP to associate local accounts. OP has two subject types:

| Type | Behavior | Use Case |
|------|------|------|
| `public` | All RPs see the same `sub` | Common default; required when multiple applications need to reconcile users |
| `pairwise` | Different RPs (by sector) see different `sub` | Privacy enhancement: prevent multiple RPs from collating `sub` values to build user profiles |

::: danger Do Not Use Email as User Primary Key
Email can be changed by users, and some OPs even allow email recycling and reassignment (former employee email to new employee). **The local account's primary key must be `iss + sub` combined**; use email only for display and contact purposes.
:::

## Sessions and Logout

OIDC involves two layers of sessions: **OP session** (the user's SSO session after logging into OP, usually an OP-domain Cookie) and **RP session** (your application's own login state). Logout complexity comes from needing to coordinate cleanup of both:

- **RP-Initiated Logout**: User clicks "logout" on RP, RP clears its local session, then redirects the browser to OP's `end_session_endpoint` (carrying `id_token_hint` and `post_logout_redirect_uri`) to let OP also end the session. This is the most common and must-do type; see [Typical Flows](./flows.md) for details.
- **Front-Channel Logout**: When the OP session ends, OP renders a hidden iframe on the logout page for each logged-in RP, loading each RP's `frontchannel_logout_uri`. RP clears its session upon receiving the request. Simple to implement, but affected by browser third-party cookie restrictions, **with poor reliability**.
- **Back-Channel Logout**: OP directly sends a server-to-server HTTP POST to each RP's `backchannel_logout_uri` with a signed **Logout Token** (a special JWT containing `sub`/`sid`, with `events` claim, explicitly without `nonce`). RP verifies the signature and destroys the corresponding session. Not browser-dependent, **highest reliability**, but requires RP sessions to be indexable by `sid` (session ID), which is unfriendly to stateless JWT session architectures.

Selection recommendation: implement RP-Initiated Logout for all projects; add Back-Channel Logout only if you have strict single sign-out requirements (such as finance, enterprise compliance).

---

Next: Read [Typical Flows](./flows.md) to see how these concepts come together in a complete login, or check [Parameters and Claims Reference](./reference.md).
