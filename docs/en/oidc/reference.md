---
title: "Typical Parameters and Claims Reference"
---

# Typical Parameters and Claims Reference

This page is a quick reference; for flow context, see [Typical Flows](./flows.md); for concept explanations, see [Core Concepts](./concepts.md).

## Authentication Request Parameters

Parameters sent to the authorization endpoint (from OIDC perspective, including OAuth2 base parameters):

| Parameter | Required | Description |
|------|--------|------|
| `scope` | Required | Space-separated; **must include `openid`**, otherwise it's a plain OAuth2 request and no ID Token is returned |
| `response_type` | Required | Determines flow: `code` (recommended) / `id_token` / `code id_token`, etc. |
| `client_id` | Required | Client identifier obtained when RP registered with OP |
| `redirect_uri` | Required | Callback address, must exactly match registered value (no wildcards allowed) |
| `state` | Strongly Recommended | Opaque random value, returned as-is in callback; RP validates to prevent CSRF and can carry return path and other state |
| `nonce` | Recommended for code flow, required for implicit/hybrid | Random value, OP writes it as-is into ID Token's `nonce` claim; RP validates to prevent replay |
| `prompt` | Optional | Controls OP interaction behavior; see [prompt values table](#prompt-值表) below |
| `max_age` | Optional | Maximum authentication validity in seconds; if user's last authentication exceeds this, OP must re-authenticate and return `auth_time` in ID Token |
| `login_hint` | Optional | Login identifier hint (e.g., email); OP can pre-fill login field, commonly used in "we already know who the user is" scenarios |
| `acr_values` | Optional | Desired authentication context level (space-separated, by priority), e.g., require MFA; result reflected in ID Token's `acr` |
| `display` | Optional | Desired display mode: `page` / `popup` / `touch` / `wap` |
| `ui_locales` | Optional | Desired UI language, e.g., `zh-CN zh en` |
| `code_challenge` / `code_challenge_method` | Required for public clients | PKCE parameters; use `S256` for method |

## ID Token Claims

### Required Claims

| Claim | Type | Description |
|-------|------|------|
| `iss` | string (URL) | Issuer, must equal OP's issuer |
| `sub` | string (≤255 ASCII) | User's unique identifier, stable and non-reused within the same OP; use `iss + sub` as local primary key |
| `aud` | string or array | Audience, must include RP's client_id |
| `exp` | number | Expiration time (Unix seconds) |
| `iat` | number | Issue time (Unix seconds) |

### Conditional/Optional Claims

| Claim | When Appears | Description |
|-------|----------|------|
| `nonce` | Required if request included `nonce` | Original nonce from request, RP must match |
| `auth_time` | Required if request included `max_age`, otherwise optional | User's actual authentication time |
| `acr` | Optional | Achieved authentication context level |
| `amr` | Optional | Authentication methods array, e.g., `["pwd","otp"]`, `["mfa"]` |
| `azp` | Required if `aud` is multi-valued | The client_id actually authorized |
| `at_hash` | Required if implicit/hybrid returns access_token | access token hash left half, prevents token substitution |
| `c_hash` | Required if hybrid returns code | Authorization code hash left half |
| `sid` | Optional | OP-side session ID, used by Back-Channel Logout to locate RP session |

## Standard Claims Overview (Grouped by Scope)

These claims appear in UserInfo response or ID Token:

### scope=profile

| Claim | Type | Description |
|-------|------|------|
| `name` | string | Full name (for display) |
| `given_name` | string | Given name |
| `family_name` | string | Family name |
| `middle_name` | string | Middle name |
| `nickname` | string | Nickname |
| `preferred_username` | string | Preferred username; **may change and may be non-unique, cannot be used as primary key** |
| `picture` | string (URL) | Avatar URL |
| `profile` | string (URL) | Personal profile page |
| `website` | string (URL) | Personal website |
| `gender` | string | Gender |
| `birthdate` | string | Birthdate, `YYYY-MM-DD` or `YYYY` (`0000` means only month-day provided) |
| `zoneinfo` | string | Timezone, e.g., `Asia/Shanghai` |
| `locale` | string | Locale, e.g., `zh-CN` |
| `updated_at` | number | Profile last update time (Unix seconds) |

### scope=email

| Claim | Type | Description |
|-------|------|------|
| `email` | string | Email address |
| `email_verified` | boolean | Whether email is verified by OP; **must check it is true before doing business logic based on email matching** |

### scope=phone

| Claim | Type | Description |
|-------|------|------|
| `phone_number` | string | Phone number, recommended E.164 format, e.g., `+8613800138000` |
| `phone_number_verified` | boolean | Whether verified |

### scope=address

| Claim | Type | Description |
|-------|------|------|
| `address` | JSON object | Contains subfields `formatted`, `street_address`, `locality`, `region`, `postal_code`, `country` |

## Discovery Document Key Fields

Key fields in `/.well-known/openid-configuration` most commonly used by RP:

| Field | Description |
|------|------|
| `issuer` | OP identifier, must match the issuer used to request this document; also the expected value of ID Token's `iss` |
| `authorization_endpoint` | Authentication/authorization endpoint |
| `token_endpoint` | Token endpoint |
| `userinfo_endpoint` | User info endpoint |
| `jwks_uri` | Public key set (JWKS) address |
| `end_session_endpoint` | RP-Initiated Logout endpoint (defined by RP-Initiated Logout spec) |
| `registration_endpoint` | Dynamic client registration endpoint (if supported) |
| `scopes_supported` | List of supported scopes |
| `response_types_supported` | Supported response_type values |
| `subject_types_supported` | `public` / `pairwise` |
| `id_token_signing_alg_values_supported` | ID Token signing algorithms; RP sets whitelist based on this |
| `token_endpoint_auth_methods_supported` | Token endpoint client authentication methods, e.g., `client_secret_basic`, `private_key_jwt` |
| `claims_supported` | List of returnable claims (informational) |
| `code_challenge_methods_supported` | Supported PKCE methods; should include `S256` |
| `frontchannel_logout_supported` / `backchannel_logout_supported` | Whether Front-Channel/Back-Channel Logout is supported |

## prompt Values

| Value | Behavior | Typical Use |
|------|------|----------|
| `none` | OP must not display any interaction UI; returns error (e.g., `login_required`) if no active session or interaction needed | Silent login state check / SSO probe / token refresh |
| `login` | Force re-authentication, even if a session exists | Step-up verification before sensitive operations |
| `consent` | Force re-display of authorization confirmation page | Require user to re-grant permissions |
| `select_account` | Display account selection UI | User has multiple accounts, allow switching |

`prompt` values can be combined (e.g., `login consent`), but `none` cannot be used with other values.

## OIDC-Specific Error Codes

Beyond OAuth2 error codes (`invalid_request`, `access_denied`, `invalid_grant`, etc.; see [OAuth2 documentation](../oauth2/)), OIDC adds these at the authorization endpoint:

| Error Code | Meaning | Common Trigger |
|--------|------|----------|
| `login_required` | User login is required, but interaction is not allowed | `prompt=none` and OP has no active session |
| `consent_required` | User authorization confirmation is required, but interaction is not allowed | `prompt=none` and this client has not obtained consent |
| `interaction_required` | Some user interaction is needed, but interaction is not allowed | `prompt=none` fallback error |
| `account_selection_required` | User needs to select an account, but interaction is not allowed | `prompt=none` and multiple account sessions exist |
| `invalid_request_uri` | `request_uri` cannot be fetched or content is invalid | Using PAR/request_uri scenarios |
| `invalid_request_object` | request object (JWT) is invalid | Using signed request object (JAR) scenarios |
| `request_not_supported` / `request_uri_not_supported` | OP does not support request(_uri) parameter | Capability mismatch |
| `registration_not_supported` | OP does not support registration parameter | Capability mismatch |

::: tip
`login_required` is a normal signal, not a failure: when silent refresh (`prompt=none`) receives it, fall back to one normal interactive login.
:::

## Troubleshooting Quick Reference

| Symptom | Common Cause |
|------|----------|
| Callback reports `redirect_uri_mismatch` / `invalid_request` | redirect_uri doesn't exactly match registered value (protocol, port, trailing slash, case) |
| Token response lacks `id_token` | Request `scope` is missing `openid` |
| ID Token validation fails: `iss` mismatch | issuer config inconsistently has/lacks trailing slash; multi-tenant OP using wrong tenant URL |
| ID Token validation fails: signature invalid / cannot find `kid` | JWKS cache expired (OP rotated keys), need to refresh JWKS; or environment misconfigured with wrong OP's JWKS |
| ID Token validation fails: `aud` mismatch | Used a different app's client_id; or validating token issued to another client |
| nonce validation fails | Session lost (callback landed on different instance with unshared session), or Cookie's SameSite setting causes callback request to lose session Cookie |
| `invalid_grant` (token exchange fails) | Authorization code already used/expired (code is single-use, watch for browser prefetch or duplicate callbacks); PKCE `code_verifier` doesn't match `code_challenge`; redirect_uri differs from authorization request |
| `prompt=none` always returns `login_required` | OP has no session (browser blocking third-party cookies is a common root cause); or OP requires re-consent |
| Still logged in after logout, refresh shows login state | Only cleared RP session without redirecting to `end_session_endpoint`, being silently re-logged by OP's SSO session |
| Logout doesn't redirect back to app | `post_logout_redirect_uri` not registered at OP side, or didn't carry `id_token_hint` so OP cannot associate client |
| Cannot get email/name and other claims | Didn't request corresponding scope; or OP returns these claims only via UserInfo, not in ID Token |
| Intermittent `exp`/`iat` validation failures | Server clock drift, configure NTP and allow ≤5 minute clock skew |
