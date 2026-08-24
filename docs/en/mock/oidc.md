---
title: OIDC Mock
---

# OIDC / OAuth2 Mock

On the OAuth 2.0 (RFC 6749) side, there are three integrable service roles: **Authorization Server** (called OpenID Provider / OP in OIDC), **Client** (called Relying Party / RP in OIDC), **Resource Server**. For terminology mapping and overall explanation, see [Mock Overview](./README.md).

**Service URL: <https://mock.authn.tech/>**

## Authorization Server (OIDC: OpenID Provider / OP)

| Endpoint | Path |
|----------|------|
| Discovery | [`/.well-known/openid-configuration`](https://mock.authn.tech/.well-known/openid-configuration) |
| Authorization | `/oidc/authorize` |
| Token | `/oidc/token` |
| UserInfo | `/oidc/userinfo` |
| JWKS | [`/oidc/jwks.json`](https://mock.authn.tech/oidc/jwks.json) |

- **Zero registration**: Any `client_id` / `redirect_uri` is accepted; no client secret validation.
- Authorization Code Flow + **PKCE** (S256 / plain); `refresh_token` (when scope includes `offline_access`) and `client_credentials` grant.
- Two fixed test users **alice** / **bob**; append `&user=alice` to the authorization request to skip the user selection page (CI non-interactive mode).
- CORS fully open; directly callable from browser frontend.

## Client (OIDC: Relying Party / RP)

**Console: <https://mock.authn.tech/rp/>**

Use this Mock as a **client**, connecting to **any external OP** (Keycloak, Auth0, Okta, Azure AD, or this site's Mock OP), walk through a complete Authorization Code + PKCE login: enter the external OP's issuer and `client_id` → automatically fetch Discovery → initiate login → callback exchanges token → verify ID Token signature using OP's JWKS → validate `iss`/`aud`/`nonce`/`exp` → call UserInfo, displaying each step progressively.

> The callback address `https://mock.authn.tech/rp/callback` must be added to the external OP's whitelist.

### Manual step-by-step mode (OP behind a corporate network / WAF)

**Console: <https://mock.authn.tech/rp/manual>**

The automatic mode above requires **this site to reach your OP directly**. If the OP sits behind a corporate network, a VPN, or a WAF / login portal, this publicly hosted site simply cannot connect to it — Discovery, token exchange, and the JWKS fetch all fail.

Typical symptom: the security gateway returns an HTML block page with **HTTP 200** (rather than 401/403), JSON parsing then fails, and the page reports 502. The automatic mode now shows the HTTP status, `content-type`, and a body snippet so you can tell who blocked the request.

Manual mode hands the networking half back to you — **this site sends no requests to your OP at all**; it only builds URLs and does offline parsing and verification:

| Step | What you do | What this site does |
|------|-------------|---------------------|
| ① | Open `.well-known/openid-configuration` in a browser that *can* reach the OP and paste the JSON here (or fill in the endpoints by hand) | Parse the endpoints, check completeness |
| ② | Click "start login" | Generate `state`/`nonce`/PKCE, build the authorization URL and **302** to it (the redirect is issued by *your* browser) |
| ③ | Copy the generated curl, run it from a machine that can reach the OP, paste the token response back | Verify `state`, fill `code`, `code_verifier` and friends into the curl command |
| ④ | — | Decode the ID Token offline, check `iss`/`aud`/`nonce`/`exp` |
| ⑤ | Open `jwks_uri`, paste the JWKS back | Verify the signature locally with WebCrypto and render the verdict |

Other notes:

- If the client's redirect_uri whitelist only allows an internal address, you'll land on your own app after login — copy the full URL from the address bar into [paste callback URL](https://mock.authn.tech/rp/manual/callback) to continue.
- Uncheck PKCE in step ① if the client doesn't have it enabled; add extra authorization parameters such as `prompt` or `acr_values` one `key=value` per line on the same page.
- The login context is a signed JWT kept in an HttpOnly cookie (valid for 1 hour); a copyable duplicate is shown on the page so a lost cookie won't strand you.

## Resource Server (Protected API / Resource Server)

**Info page: <https://mock.authn.tech/rs/>** · Protected endpoint `GET /rs/api`

After validating the access token's **signature, expiration, `token_use`, and `scope`** (must include `profile`), returns the protected resource; insufficient permission returns `403 insufficient_scope`, missing/invalid token returns `401 invalid_token`.

## Call Sequence (Authorization Code + PKCE)

With "your RP + Mock OP":

1. **RP** generates `code_verifier`, calculates `code_challenge` (S256), along with `state` and `nonce`, redirects the browser to **OP**'s `/oidc/authorize`.
2. **OP** displays test user selection page (or directly selects per `&user=alice`), redirects back to RP's `redirect_uri` with `code` + `state`.
3. **RP** compares `state`, POSTs `code` + `code_verifier` to **OP**'s `/oidc/token`.
4. **OP** validates PKCE, returns `id_token` / `access_token` (and optional `refresh_token`).
5. **RP** fetches the public key from **OP**'s `/oidc/jwks.json`, verifies `id_token` signature, and validates `iss` / `aud` / `nonce` / `exp`.
6. **RP** carries `access_token` to call **OP**'s `/oidc/userinfo` (or **RS**'s `/rs/api`) to fetch user info / protected resources.

Want to see it in action? This site has a **real, clickable** [OIDC login demo](./demo.md) that runs through the above flow in one click and displays the parsing results at each step.

Authorization endpoint example (replace with your callback address):

```
https://mock.authn.tech/oidc/authorize?client_id=demo&redirect_uri=https://your-app.example/callback&response_type=code&scope=openid+profile+email&state=xyz&nonce=n-abc
```

Exchange for tokens:

```bash
curl -X POST https://mock.authn.tech/oidc/token \
  -d grant_type=authorization_code \
  -d code=<code> \
  -d redirect_uri=https://your-app.example/callback \
  -d client_id=demo
```

The `id_token` you get can be directly fed into [JWT Parser](../tools/jwt.md) to view.
