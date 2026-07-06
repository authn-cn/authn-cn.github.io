---
title: "Typical Parameters and Response Reference"
---

# Typical Parameters and Response Reference

This page is a quick reference guide, consolidating request parameters, response fields, and error codes for each endpoint. For flow context see [Typical Flows](./flows.md), for concept explanations see [Core Concepts](./concepts.md).

## Authorization Endpoint Request Parameters

`GET /authorize`, parameters placed in query string (values need URL encoding):

| Parameter | Required | Description |
|-----------|----------|-------------|
| `response_type` | Required | For authorization code flow, fixed to `code` (`token` is Implicit, deprecated) |
| `client_id` | Required | Client identifier obtained at registration |
| `redirect_uri` | Conditionally required | Callback address, must match registered value **character-for-character exactly**; required if multiple URIs registered |
| `scope` | Recommended | Space-delimited permission range list (URL encoded space is `%20` or `+`) |
| `state` | Recommended (should be treated as required in practice) | Cryptographically random value, returned unchanged in callback, client must verify, prevents CSRF |
| `code_challenge` | Recommended (required in OAuth 2.1) | PKCE challenge value: `BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | Recommended | Always use `S256`; `plain` only for legacy compatibility, avoid |

Authorization success callback: `{redirect_uri}?code={authorization_code}&state={original_state}`.

## Token Endpoint Request Parameters

`POST /token`, `Content-Type: application/x-www-form-urlencoded`. Confidential Clients require client authentication (e.g., `Authorization: Basic ...`); Public Clients include `client_id` in the body.

### grant_type=authorization_code

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Required | `authorization_code` |
| `code` | Required | Authorization code returned from authorization endpoint, **one-time use only** |
| `redirect_uri` | Conditionally required | If included in authorization request, must be included and value must match exactly |
| `code_verifier` | Required for PKCE | Original random string used to generate challenge (43–128 characters) |
| `client_id` | Required for Public Client | Identifies client when no client authentication |

### grant_type=refresh_token

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Required | `refresh_token` |
| `refresh_token` | Required | Previously issued Refresh Token |
| `scope` | Optional | Can only **reduce**, cannot exceed original authorization scope |

### grant_type=client_credentials

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Required | `client_credentials` |
| `scope` | Optional | Permission range requested |

(Must use client authentication, limited to Confidential Clients only.)

### grant_type=urn:ietf:params:oauth:grant-type:device_code

| Parameter | Required | Description |
|-----------|----------|-------------|
| `grant_type` | Required | `urn:ietf:params:oauth:grant-type:device_code` |
| `device_code` | Required | device_code returned from device authorization endpoint |
| `client_id` | Required for Public Client | Client identifier |

## Token Success Response Fields

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "calendar.read profile"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `access_token` | Required | Access token; client should treat as opaque string |
| `token_type` | Required | Usually `Bearer`; **case-insensitive** (may return `bearer`), be careful when comparing |
| `expires_in` | Recommended | Validity period in seconds; client should treat as expired early (e.g., 30 seconds), not wait for 401 |
| `refresh_token` | Optional | Refresh token; not issued in Client Credentials mode; returns new value on each refresh when rotation enabled |
| `scope` | Conditionally required | Must be returned if actual granted scope differs from request; client should use this as the source of truth |

Response must include `Cache-Control: no-store` to prevent token caching.

## Error Responses

### Token Endpoint Errors (RFC 6749 §5.2)

HTTP status usually `400` (client authentication failure is `401`), JSON body:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store

{
  "error": "invalid_grant",
  "error_description": "Authorization code is expired or already used"
}
```

| Error Code | Meaning | Common Triggers |
|------------|---------|-----------------|
| `invalid_request` | Request missing parameters, duplicate parameters, or format error | Missing `grant_type`; body not form-encoded but JSON |
| `invalid_client` | Client authentication failure (HTTP 401) | client_secret incorrect/rotated; authentication method doesn't match registration |
| `invalid_grant` | Authorization credential invalid | Authorization code expired/used; redirect_uri mismatch; Refresh Token revoked or rotated; PKCE verifier validation failed |
| `unauthorized_client` | This client not allowed to use this grant_type | Client registration didn't enable the corresponding grant type |
| `unsupported_grant_type` | AS doesn't support this grant_type | Spelling error; AS hasn't enabled Device Flow etc. |
| `invalid_scope` | scope invalid, unknown, or out of range | Requested non-existent scope; refresh tried to escalate |

`error_description` (human-readable explanation) and `error_uri` (documentation link) are optional fields; don't rely on their content in code logic.

### Authorization Endpoint Errors (RFC 6749 §4.1.2.1)

Errors returned via redirect back to `redirect_uri`: `{redirect_uri}?error=access_denied&state=...`.
(However, if `client_id` or `redirect_uri` itself is invalid, the AS **must not redirect**, and display error page to user directly.)

| Error Code | Meaning |
|------------|---------|
| `invalid_request` | Request parameters missing or invalid |
| `unauthorized_client` | Client not allowed to use this response_type |
| `access_denied` | User or AS denied authorization (user clicked "deny") |
| `unsupported_response_type` | Unsupported response_type |
| `invalid_scope` | Requested scope invalid |
| `server_error` | AS internal error (equivalent 500, but delivered via redirect) |
| `temporarily_unavailable` | AS temporarily overloaded or under maintenance (equivalent 503) |

### Device Flow Polling-specific Errors (RFC 8628)

| Error Code | Meaning | Client Action |
|------------|---------|-----------------|
| `authorization_pending` | User hasn't completed authorization | Continue polling at `interval` |
| `slow_down` | Polling too fast | Increase interval by **5 seconds** before continuing |
| `expired_token` | device_code expired | Initiate device authorization request again |
| `access_denied` | User denied authorization | Terminate flow, prompt user |

## grant_type Overview

| grant_type Value | Name | Status | Scenario |
|------------------|------|--------|----------|
| `authorization_code` | Authorization Code Flow | **Recommended** (must use PKCE) | All scenarios involving users |
| `client_credentials` | Client Credentials Flow | Recommended | M2M, service calls |
| `refresh_token` | Refresh Token | Recommended | Token refresh |
| `urn:ietf:params:oauth:grant-type:device_code` | Device Authorization | Recommended (when applicable) | Input-constrained devices |
| `urn:ietf:params:oauth:grant-type:jwt-bearer` | JWT Bearer (RFC 7523) | Specific scenarios | Federated identity, service account impersonation |
| `urn:ietf:params:oauth:grant-type:token-exchange` | Token Exchange (RFC 8693) | Specific scenarios | Microservice token delegation/downscoping |
| `password` | Password Flow | **Deprecated** | Use Authorization Code + PKCE |
| (`response_type=token`) | Implicit (not grant_type, authorization endpoint issues token directly) | **Deprecated** | Use Authorization Code + PKCE |

## Three Ways to Carry Bearer Token (RFC 6750)

| Method | Example | Evaluation |
|--------|---------|-----------|
| **Authorization request header** | `Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA` | **Only recommended**. Not in logs/history, supports any HTTP method |
| Form body parameter | `access_token=2Yotn...` (in form-encoded body) | Not recommended. Only for legacy scenarios unable to set headers |
| URL query parameter | `GET /api?access_token=2Yotn...` | **Prohibited**. Token ends up in access logs, browser history, Referer header; RFC 6750 itself discourages it; RFC 9700 explicitly prohibits |

When RS rejects a request, it should return `WWW-Authenticate` header:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="The access token expired"
```

| RS Error Code | HTTP Status | Meaning |
|---------------|-------------|---------|
| `invalid_request` | 400 | Request format error (e.g., token in two places) |
| `invalid_token` | 401 | Token expired, revoked, or invalid → client should refresh or re-authorize |
| `insufficient_scope` | 403 | Token valid but scope insufficient |

## Troubleshooting Quick Reference

| Symptom | Most Likely Cause |
|---------|------------------|
| Authorization endpoint shows error page directly, no redirect back | `client_id` doesn't exist, or `redirect_uri` doesn't match registered value (check protocol, port, trailing slash, case) |
| Callback returns `error=access_denied` | User denied authorization; or AS policy denied (user lacks permission, client disabled) |
| Token exchange fails with `invalid_grant` | Authorization code already used (callback triggered twice?) or expired; `redirect_uri` doesn't match authorization request; PKCE verifier doesn't match challenge |
| Token exchange fails with `invalid_client` (401) | secret incorrect or rotated; using `client_secret_post` but AS only accepts Basic (or vice versa); Basic header didn't URL-encode id/secret |
| Error: `invalid_request` | Body used JSON instead of `application/x-www-form-urlencoded`; parameter passed multiple times |
| Refresh fails with `invalid_grant` | Refresh Token expired/revoked; rotation scenario with old token (concurrent refresh not locked); user changed password triggering global revocation |
| RS returns 401 `invalid_token` | Access Token expired → perform refresh; clock skew causing JWT `nbf`/`exp` validation to fail; RS configured issuer/audience mismatch |
| RS returns 403 `insufficient_scope` | Didn't request that scope during authorization, or user didn't approve; check actual `scope` field in token response |
| Device Flow constantly `authorization_pending` | User hasn't completed authorization; verify displayed `verification_uri` and `user_code` are correct |
| Intermittent success/failure | Multi-instance AS deployment has asynchronous session/storage; load balancer redirected to different environment; client clock skew |

## Related Pages

- [OAuth 2.0 Overview](./README.md)
- [Core Concepts](./concepts.md)
- [Typical Flows](./flows.md)
