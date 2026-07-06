---
title: "Typical Flows"
---

# Typical Flows

This page covers the authorization flows (Grant Types) actually used in modern OAuth 2.0 deployments, as well as two deprecated but still frequently asked-about flows. For basic concepts (roles, PKCE, state, etc.), see [Core Concepts](./concepts.md); for parameter details, see the [Reference page](./reference.md).

## Authorization Code Flow (with PKCE)

**Applicable to**: All scenarios involving user participation — web applications, SPAs, mobile apps, desktop applications. This is the only user authorization mode retained in OAuth 2.1, and **must be used with PKCE**.

### Step-by-step Flow

1. The client generates `code_verifier`, computes `code_challenge` (S256), generates a random `state`, and saves both bound to the user session;
2. The client redirects the user's browser to the AS's authorization endpoint:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=calendar.read%20profile
    &state=af0ifjsldkj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: as.example.com
```

3. The user logs in on the AS (if not already logged in) and confirms the authorization scope;
4. The AS generates a one-time, short-lived (recommended ≤60 seconds) authorization code, redirecting back to the client:

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

5. The client **verifies `state` first** against the saved session value, then exchanges the authorization code for a token via the back channel:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

(Confidential Clients use `Authorization: Basic ...` for authentication; Public Clients have no secret, instead include `client_id` in the body.)

6. The AS verifies the authorization code, redirect_uri consistency, and PKCE verifier; if valid, returns tokens:

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

7. The client carries the Access Token to access the Resource Server:

```http
GET /v1/calendar/events HTTP/1.1
Host: api.example.com
Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
```

::: tip Why "code exchange for token" in two steps
The authorization code passes through the user's browser (front channel), with large exposure surface but is only a one-time intermediate credential; the actual token is transmitted through server-to-server back channel, and requires client authentication/PKCE proof to exchange. This is the fundamental reason why Authorization Code Flow is more secure than Implicit.
:::

### Common Pitfalls

- **Authorization code can only be used once**: Reuse must fail, and the AS should revoke tokens issued with that code (preventing interception replay). On the client side, occasional "invalid_grant" errors commonly result from callback being triggered multiple times (browser refresh, repeated frontend render) causing duplicate exchange;
- **redirect_uri must match at three places**: Registered value, authorization request value, token request value must be identical, a missing slash or query parameter difference will fail;
- **state verification cannot be omitted**: Many SDKs do it by default, but custom implementations often miss it;
- **Authorization code must not be logged**: Callback URLs are often fully recorded in access logs and APM, needing sanitization;
- In SPA scenarios, don't place tokens in `localStorage` (XSS can read it), prioritize BFF (Backend for Frontend) mode or memory + silent refresh.

## Client Credentials Flow

**Applicable to**: Machine-to-machine (M2M) — scheduled tasks, microservice calls, background services accessing APIs. **No user involvement**; the client obtains tokens under its own identity, therefore no Refresh Token (simply request again).

### Step-by-step Flow

1. The client (must be a Confidential Client) directly requests the token endpoint:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=inventory.read
```

2. The AS verifies client credentials and returns a token:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "inventory.read"
}
```

### Common Pitfalls

- **Cache tokens on the client until approaching expiry**, do not request a new token before every API call (this will overwhelm the AS and slow down your own service);
- In this flow, the token represents **the client itself** rather than any user; the RS permission model must distinguish "service identity" from "user identity";
- In high-security scenarios use `private_key_jwt` or mTLS to replace shared secrets;
- Never commit client_secret to code repositories — use a key management service for injection.

## Device Authorization Flow

**Applicable to**: Devices without browsers or with difficult input — smart TVs, set-top boxes, CLI tools, IoT. Core idea: **let users complete authorization on another device (phone/computer)**.  Defined in RFC 8628.

### Step-by-step Flow

1. The device requests the AS's device authorization endpoint:

```http
POST /device_authorization HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

client_id=1406020730&scope=profile
```

2. The AS returns device code and user code:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://as.example.com/device",
  "verification_uri_complete": "https://as.example.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

3. The device displays on screen: "Please visit `as.example.com/device` on your phone and enter code **WDJB-MJHT**" (or show a QR code of `verification_uri_complete`);
4. The user completes login and authorization on their phone's browser;
5. Meanwhile, the device polls the token endpoint at `interval` second intervals:

```http
POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=1406020730
```

6. While user authorization is pending, the AS returns `{"error": "authorization_pending"}`; if it returns `slow_down`, increase the polling interval by 5 seconds; after the user completes authorization, return a normal token response.

### Common Pitfalls

- Must handle all four polling results: `authorization_pending` / `slow_down` / `expired_token` / `access_denied`; failing to slow down on `slow_down` will cause the AS to rate-limit you;
- `user_code` should use ambiguity-avoiding characters (remove 0/O, 1/I) and display segmented;
- Watch out for **authorization phishing**: attackers can initiate a device flow and trick users into entering the user_code; the AS's authorization page should clearly display client information and consequences.

## Refresh Token Flow

**Applicable to**: Silently refresh Access Token after expiry, avoiding repeated user logins.

### Step-by-step Flow

1. The client detects Access Token expiry (or receives `401` + `error="invalid_token"` from RS), and requests refresh from the token endpoint:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
```

2. The AS returns a new Access Token, and (when rotation is enabled) returns a **new Refresh Token**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "kJ9x2wLmN8pQr4sTuv6yZa",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8dNvzXbGh4T2q",
  "scope": "calendar.read profile"
}
```

3. The client **immediately overwrites the old Refresh Token with the new one**.

### Refresh Token Rotation

RFC 9700 requires Public Client Refresh Tokens to satisfy one of: sender constraints (like mTLS binding) or **rotation**. The rotation mechanism:

- Each refresh issues a new Refresh Token, the old one is immediately invalidated;
- If the AS detects **a revoked Refresh Token being used again**, it deems this a token leak, revoking the entire token family (all descendant tokens), forcing re-authorization;
- Clients must handle concurrency well: multiple tabs/requests refreshing concurrently can trigger false positives; common solutions are refresh locking (single-flight) + very short grace period for old tokens (some ASs support this).

### Common Pitfalls

- Refresh failure (`invalid_grant`) means Refresh Token has expired/been revoked/been rotated, **the only correct action is to guide the user through the authorization code flow again**, don't retry in a loop;
- During refresh you can pass a `scope` parameter to reduce permissions, but cannot escalate;
- Refresh Token is a high-value credential: encrypt-store on the server side, store in system keychain on mobile (Keychain/Keystore), **never send to the Resource Server**.

## Deprecated Flows

::: danger Implicit Flow (`response_type=token`) — Deprecated
Previously used for SPAs: tokens returned directly in the authorization endpoint redirect URL fragment, skipping authorization code exchange. Deprecated because:

- Access Token exposed in URL — ends up in browser history, may leak via Referer header, readable by malicious scripts;
- No client authentication and no PKCE, cannot confirm the client taking the token is legitimate;
- Token injection attacks hard to defend, and naturally doesn't support Refresh Token.

**Replacement approach**: Authorization Code + PKCE. After CORS became ubiquitous, SPAs can directly call the token endpoint; the technical premise for designing Implicit no longer exists. RFC 9700 explicitly prohibits it; OAuth 2.1 has removed it.
:::

::: danger Resource Owner Password Credentials (`grant_type=password`) — Deprecated
Client directly collects user username and password, exchanging it for a token. Deprecated because:

- Client obtains plaintext user password, completely violating OAuth's design intent (see [Overview](./README.md));
- Trains users to input passwords into arbitrary applications, promoting phishing;
- Cannot support MFA, social login, SSO, verification codes and other modern authentication methods;
- No real "user consent" step.

**Replacement approach**: Always use Authorization Code + PKCE (even for first-party apps — complete login via system browser/embedded authorization page). RFC 9700 explicitly prohibits it; OAuth 2.1 has removed it.
:::

## Flow Selection Quick Reference

| Scenario | Use Flow |
|----------|----------|
| Web application (with backend) | Authorization Code + PKCE (Confidential Client) |
| SPA | Authorization Code + PKCE (Public Client, consider BFF mode) |
| Mobile / desktop application | Authorization Code + PKCE (system browser, follow RFC 8252) |
| Service-to-service, no user | Client Credentials |
| TV / CLI / IoT | Device Authorization Flow |
| Token refresh | Refresh Token (enable rotation for Public Client) |

## Next Steps

- [Typical Parameters and Response Reference](./reference.md): Parameter and error code quick lookup tables for all requests/responses above
