---
title: "Typical Flows"
---

# Typical Flows

## Authorization Code Flow

This is OIDC's most important and widely applicable flow (web apps, SPAs, and mobile apps should all use it; public clients must use PKCE). The differences from pure OAuth 2.0 authorization code flow are just two: `scope` includes `openid` and the request carries `nonce`, and the token response includes an additional `id_token`.

Participants: End-User (browser), RP (`https://rp.example.org`, client_id `s6BhdRkqt3`), OP (`https://op.example.com`).

### Step 1: RP Initiates Authentication Request

RP generates random `state` (to prevent CSRF) and `nonce` (to bind ID Token), stores them in the session, then redirects the browser to OP's authorization endpoint:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
    &scope=openid%20profile%20email
    &state=af0ifjsldkj
    &nonce=n-0S6_WzA2Mj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: op.example.com
```

### Step 2: User Completes Authentication and Authorization at OP

OP authenticates the user (password, MFA, SSO session reuse, etc.) and displays an authorization confirmation page if necessary.

### Step 3: OP Calls Back RP with Authorization Code

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

RP first verifies that `state` matches the value stored in the session; if not, immediately terminate.

### Step 4: RP Backend Exchanges code for Tokens

```http
POST /token HTTP/1.1
Host: op.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

Response:

```json
{
  "access_token": "SlAV32hkKG",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjQta2V5LTAxIn0.eyJpc3MiOi...(abbreviated).signature"
}
```

The `id_token` payload after decoding:

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "amr": ["pwd"]
}
```

### Step 5: RP Validates ID Token

Execute according to [the validation checklist in Core Concepts](./concepts.md#rp-validation-checklist-must-do): verify signature (JWKS), `iss`, `aud`, `exp`/`iat`, `nonce`. After all pass, establish/associate a local session using `iss + sub` as the key — **login is now complete**.

### Step 6 (Optional): Call UserInfo for Additional Data

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "Zhang San",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

::: warning Common Pitfalls in This Flow
- **nonce not validated or not bound to session**: nonce must be stored in server-side session before sending the request, then compared and invalidated upon return; just generating without comparing is useless.
- **aud not validated**: allows another app's ID Token to be used to log into your system (token substitution attack).
- **UserInfo `sub` not compared with ID Token `sub`**: must discard UserInfo data if they don't match.
- **Using access token as an identity credential**: identity determination must be based only on a verified ID Token; access token is only for calling APIs.
- **Public clients (SPA/mobile) missing PKCE configuration**: authorization code could be intercepted and reused; must use `S256`.
:::

## response_type and Three Flows

OIDC Core defines three flows determined by `response_type`, differing in "which channel returns tokens":

| Flow | response_type | Returned from Authorization Endpoint | Returned from Token Endpoint | Current Status |
|------|---------------|----------------|-------------------|------|
| Authorization Code | `code` | code | id_token + access_token | **Recommended, the only choice** |
| Implicit | `id_token` or `id_token token` | id_token (+ access_token) | — | Already obsolete, not recommended |
| Hybrid | `code id_token`, `code token`, `code id_token token` | code + some tokens | remaining tokens | Special cases, rarely used |

::: warning Implicit Flow No Longer Recommended
Implicit returns tokens directly in the redirect URL fragment, with large exposure surface (browser history, Referer header, logs), inability to use PKCE, lack of sender constraints on access token, etc. OAuth 2.0 Security BCP and OAuth 2.1 have explicitly deprecated it. **Historically, SPAs used implicit because of cross-origin restrictions; now use authorization code + PKCE exclusively.** Hybrid flow is only used in rare scenarios where "obtain id_token early for rendering, then exchange code"; the id_token obtained on the frontend must still be fully validated (in this case, must validate `nonce`; `code id_token` combination should also validate `c_hash`).
:::

## Discovery + JWKS Retrieval Flow

Standard actions when RP starts up or first integrates with OP:

1. Configure the single input: issuer, e.g., `https://op.example.com`.
2. Fetch metadata: `GET https://op.example.com/.well-known/openid-configuration`.
3. **Verify that the `issuer` field in the response exactly matches the issuer configured in step 1** (mismatch indicates misconfiguration or issuer confusion attack).
4. Extract `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, `end_session_endpoint`, etc. from the document.
5. Fetch and cache JWKS: `GET jwks_uri`.
6. Thereafter, each signature verification queries the cache by `kid`; refresh JWKS once when encountering an unknown `kid` (with rate limiting) to smoothly handle key rotation.

::: tip
Most client libraries wrap steps 2–6 into a single initialization call (e.g., openid-client's `Issuer.discover()`). Manually hard-coding endpoints only when OP does not support Discovery.
:::

**Common pitfalls**: inconsistent trailing slashes in issuer cause `iss` validation failure (`https://op.example.com` ≠ `https://op.example.com/`); missing JWKS cache expiration strategy causes site-wide signature verification failures after key rotation.

## RP-Initiated Logout Flow

1. User clicks "logout" on RP; RP first destroys **its own** session (Cookie/server-side session).
2. RP redirects the browser to OP's `end_session_endpoint` (from the Discovery document):

```http
GET /logout?id_token_hint=eyJhbGciOi...(ID Token saved at login)
    &post_logout_redirect_uri=https%3A%2F%2Frp.example.org%2Floggedout
    &state=xj2kdi93 HTTP/1.1
Host: op.example.com
```

3. OP identifies the user and client by `id_token_hint`, ends the OP session (may display a confirmation page; if Front/Back-Channel Logout is configured, also notifies other RPs at this time).
4. OP redirects the browser back to `post_logout_redirect_uri` (with original `state`):

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/loggedout?state=xj2kdi93
```

**Common pitfalls**:

- `post_logout_redirect_uri` must be pre-registered at the OP side; otherwise OP will reject or remain on its own logout page.
- Forgetting to clear RP's local session first — user is still in login state after "logout" when they refresh.
- Not passing `id_token_hint`: some OPs will display a "confirm logout?" interaction page to the user, causing inconsistent UX; save the ID Token (or reference to it) at login for logout use.
- Clearing only RP session without redirecting to OP: next time user clicks login, OP's SSO session silently re-logs them in, appearing as "cannot log out."

---

For complete parameter definitions and error codes, see [Parameters and Claims Reference](./reference.md); for ID Token validation details, see [Core Concepts](./concepts.md).
