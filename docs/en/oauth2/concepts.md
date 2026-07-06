---
title: "Core Concepts"
---

# Core Concepts

This page clarifies the basic building blocks of OAuth 2.0: roles, client types, tokens, scope, endpoints, and the two critical security mechanisms of state and PKCE. After understanding these concepts, reading [typical flows](./flows.md) will be very straightforward.

## Four Roles

RFC 6749 defines four roles:

| Role | Description | Example |
|------|-------------|---------|
| **Resource Owner** | An entity capable of granting access to protected resources; typically the end user | You, using the calendar application |
| **Client** | An application that requests access to protected resources on behalf of the Resource Owner | Calendar management app |
| **Authorization Server (AS)** | The server that authenticates the Resource Owner and issues tokens after obtaining consent | Google Accounts, Keycloak, Auth0 |
| **Resource Server (RS)** | The server hosting protected resources, validates Access Token and provides services | Google Calendar API |

::: tip
Authorization Server and Resource Server can be the same system (common in small deployments) or completely separate (one AS protecting multiple APIs). "Client" refers to an **application program**, not a "client device" or "user".
:::

## Client Types and Client Authentication

### Confidential vs Public

| Type | Definition | Typical Examples |
|------|-----------|------------------|
| **Confidential Client** | A client capable of safely protecting credentials (such as client_secret), typically with a server component | Traditional web app backend, background services |
| **Public Client** | A client that cannot keep secrets — code/binaries are distributed to users, any secret can be extracted | SPA (JavaScript in browser), mobile apps, desktop/CLI applications |

This distinction determines security design: Public Clients **should not hold a client_secret** (a secret in frontend code or app package is essentially public), and must rely on mechanisms like PKCE for security.

### Client Authentication Methods

When a Confidential Client calls the token endpoint, it must prove its identity to the AS:

| Method | Mechanism | Description |
|--------|-----------|-------------|
| `client_secret_basic` | HTTP Basic auth header: `Authorization: Basic base64(client_id:client_secret)` | RFC 6749 recommended default; note that id/secret must be URL-encoded first before concatenation |
| `client_secret_post` | Place `client_id` and `client_secret` in the request body | Compatibility option, less standardized than Basic |
| `private_key_jwt` | Client signs a JWT with its private key (RFC 7523), submitted as `client_assertion` | Secret never leaves the client, supports key rotation, preferred for high-security scenarios (FAPI) |
| mTLS (`tls_client_auth`) | Mutual TLS, authentication with client certificate (RFC 8705) | Can also bind tokens to certificates (token binding), preventing token theft |

::: tip Selection Recommendation
For general web backends, `client_secret_basic` is sufficient; for high-security scenarios (open banking, business integration), prioritize `private_key_jwt` or mTLS to avoid sharing symmetric keys.
:::

## Tokens

### Access Token

The credential presented by the client when accessing the Resource Server. Key points:

- **Bearer semantics** (RFC 6750): "Bearer token" — **whoever obtains it can use it**, no verification of the presenter's identity. This is why leak prevention (TLS throughout, not in logs, not in URLs) is so critical.
- **Short validity period**: Typically 5 minutes to 1 hour, renewed via Refresh Token.
- **Limited permissions**: Only covers the scope approved during authorization.

### Refresh Token

Used to **obtain a new Access Token** after the Access Token expires, avoiding repeated user logins:

- Only issued to the client, only used against the AS's token endpoint, **never sent to the Resource Server**;
- Long validity period (days to months), therefore more valuable and must be stored securely;
- Modern practice requires **rotation for Public Clients**: each use issues a new Refresh Token and invalidates the old one. Reuse of an old token indicates a leak, triggering revocation of the entire token family (see [flows page](./flows.md#refresh-token-flow)).

### opaque vs JWT

| Format | Validation | Advantages | Disadvantages |
|--------|-----------|-----------|-----------------|
| **Opaque** | RS calls AS's introspection endpoint (RFC 7662) to query | Can be revoked immediately; doesn't leak internal information | Network overhead on every validation |
| **JWT (self-contained)** | RS verifies locally with AS's public key (RFC 9068 specifies JWT Access Token format) | No network overhead, suitable for high throughput/microservices | Cannot be revoked immediately after issuance, relies on short expiry |

::: warning
The format of an Access Token is an agreement between the AS and RS. **Clients should not parse Access Token contents**, even if it happens to be JWT — treat it as an opaque string. For user information, use OIDC's ID Token or UserInfo endpoint.
:::

## Scope (Permission Range)

`scope` is a space-delimited list of strings expressing the permission range the client requests, for example:

```text
scope=calendar.read calendar.write profile
```

- The AS can **reduce** the scope the client requests (user denies some permissions), and the actually granted scope will be returned in the token response;
- Design principle: **least privilege**, read/write separation (`resource.read` / `resource.write`), appropriate granularity (too fine-grained makes the authorization screen unreadable, too coarse grants excessive permissions);
- scope describes "what the client can do", not "what the user can do" — the RS still needs to apply its own user-level permission checks.

## redirect_uri and Exact Matching

`redirect_uri` is the address where the AS sends the authorization code after authorization is complete. **It is critical to the security of the authorization code flow**: if an attacker can cause the AS to send code to an address they control, they can steal the authorization.

::: danger Must Match Exactly
When clients register, they must provide the complete redirect_uri, and the value in the authorization request must match the registered value **character-for-character exactly** (RFC 9700 / OAuth 2.1 mandate this). Prohibited:

- Prefix matching, subdomain wildcards (`https://*.example.com/cb`);
- Validating only the domain, not the path;
- Allowing arbitrary query parameters on `redirect_uri` and then doing "fuzzy matching".

Historically, many major OAuth vulnerabilities (open redirect → authorization code leak) have stemmed from loose redirect_uri validation.
:::

## Endpoints

| Endpoint | Called by | Purpose | Definition |
|----------|-----------|---------|-----------|
| **Authorization Endpoint** | User's browser (front channel) | User login, confirm authorization, issue authorization code | RFC 6749 |
| **Token Endpoint** | Client (back channel, server-to-server) | Exchange authorization code/Refresh Token/client credentials for tokens | RFC 6749 |
| **Revocation Endpoint** | Client | Actively invalidate Access/Refresh Tokens no longer needed (e.g., user logout, app uninstall) | RFC 7009 |
| **Introspection Endpoint** | Resource Server (requires authentication) | Query whether token is valid and its metadata (scope, expiration, owner user) | RFC 7662 |

Endpoint addresses can be auto-discovered via **AS Metadata** (RFC 8414): request `https://as.example.com/.well-known/oauth-authorization-server` to get a JSON configuration document, avoiding hardcoding.

## state Parameter and CSRF Protection

`state` is a random, unguessable value that the client includes in the authorization request; the AS returns it unchanged in the callback. The client must verify that the `state` in the callback matches the value saved in its session.

It defends against the attack (login CSRF / session confusion): an attacker uses **their own** authorization code to construct a callback URL to trick a victim into visiting it, causing the victim's client session to be silently bound to the attacker's account. Subsequent data written by the victim (such as file uploads, payment method binding) falls into the attacker's account.

Requirements:

- Generate a new, cryptographically random `state` (≥128 bits of entropy) on each authorization request, bound to the user session;
- When calling back, **verify state first, abort immediately if it doesn't match**;
- After using PKCE, PKCE can also cover such attack surfaces, but `state` is still recommended (can also serve anti-replay and context recovery purposes; if using it to carry business state, only store non-forgeable references rather than plaintext data).

## PKCE

**PKCE** (Proof Key for Code Exchange, RFC 7636, pronounced "pixy") adds dynamic proof to authorization code exchange, defending against **authorization code interception attacks**.

### Principle

1. Before each authorization, the client generates a random string `code_verifier` (43–128 characters, cryptographically random);
2. Computes `code_challenge = BASE64URL(SHA256(code_verifier))`, the **S256** method;
3. The authorization request includes `code_challenge` and `code_challenge_method=S256`; the AS stores these bound to the issued authorization code;
4. When the client exchanges the authorization code for a token, it submits the original `code_verifier`;
5. The AS performs the same SHA256 operation on the received verifier, compares it to the previously stored challenge; if mismatched, it rejects.

Even if an attacker intercepts the authorization code (malicious app registering the same custom URL scheme, system log leak, browser history), they lack the corresponding `code_verifier` and cannot complete the exchange.

```text
code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk   (randomly generated, only known to client)
code_challenge = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM   (after SHA256 base64url)
```

::: warning Do Not Use plain Method
`code_challenge_method=plain` (challenge equals verifier directly) is only a legacy compatibility fallback option, losing one-way protection. Always use **S256**.
:::

### Why Recommended for All Clients

PKCE was originally designed for Public Clients like mobile apps, but **RFC 9700 and OAuth 2.1 require all clients using authorization code mode (including Confidential Clients holding client_secret) to use PKCE**, for reasons:

- client_secret can only prove "this is that client", not bind **this authorization code** to **this request**; PKCE provides transaction-level binding;
- PKCE defends against authorization code injection (attacker injects stolen code into victim's callback) — this attack is equally effective against Confidential Clients;
- Implementation cost is minimal (two hash operations), enabling it universally has no burden.

## Next Steps

- [Typical Flows](./flows.md): See how these concepts combine into complete authorization flows
- [Typical Parameters and Response Reference](./reference.md): Parameter and error code quick lookup for each endpoint
