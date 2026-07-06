---
title: Registration and Authentication Flows
---

# Registration and Authentication Flows

WebAuthn has two **ceremony (ceremonies)**: registration and authentication. Both are structurally symmetric—the RP first issues options with a **challenge**, the browser drives the authenticator to produce results, then the RP performs strict verification. For terminology, see [Core Concepts](./concepts.md); for field details, see [Reference](./reference.md).

## I. Registration ceremony

### Step-by-step flow

1. **RP server generates `PublicKeyCredentialCreationOptions`**: Contains a one-time `challenge`, `rp` (relying party info), `user` (user handle), `pubKeyCredParams` (acceptable algorithms), and optional `authenticatorSelection`, `excludeCredentials`, `attestation`. The `challenge` and `user.id` are binary and must be transmitted to the front end as Base64URL.
2. **Front end decodes and calls `navigator.credentials.create()`**: After converting Base64URL fields back to `ArrayBuffer`, the browser verifies the match between `rp.id` and the current origin.
3. **Browser + Authenticator**: The browser assembles `clientDataJSON` and requests the authenticator via CTAP. The authenticator verifies the user (UP/UV), generates a new key pair, stores the private key, and produces `attestationObject`.
4. **Authenticator returns `PublicKeyCredential`**: Its `response` is `AuthenticatorAttestationResponse`, containing `attestationObject` and `clientDataJSON`.
5. **Front end POSTs the result (Base64URL-encoded) to the RP**.
6. **RP verifies and persists**: Validates challenge/origin/type/flags, parses `attestationObject` to extract `credentialPublicKey`, `credentialId`, `signCount`, and stores them bound to the user account.

### Front-end example: Initiate registration

```js
// options from RP, challenge / user.id / excludeCredentials[].id are Base64URL strings
const options = await fetch('/webauthn/register/options', {
  method: 'POST', credentials: 'include',
}).then(r => r.json());

// Convert Base64URL back to ArrayBuffer
const b64urlToBuf = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer;

options.challenge = b64urlToBuf(options.challenge);
options.user.id = b64urlToBuf(options.user.id);
if (options.excludeCredentials) {
  options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const cred = await navigator.credentials.create({ publicKey: options });

// Encode result back to Base64URL and send to RP
const bufToB64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

await fetch('/webauthn/register/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type, // "public-key"
    response: {
      clientDataJSON: bufToB64url(cred.response.clientDataJSON),
      attestationObject: bufToB64url(cred.response.attestationObject),
      transports: cred.response.getTransports?.() ?? [],
    },
  }),
});
```

### JSON example: `PublicKeyCredentialCreationOptions` (issued by RP, fields are Base64URL)

```json
{
  "rp": { "id": "example.com", "name": "Example Corp" },
  "user": {
    "id": "S3v9Y2k...Base64URL...",
    "name": "alice@example.com",
    "displayName": "Alice"
  },
  "challenge": "b3Blbi1jaGFsbGVuZ2UtcmFuZG9t",
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "excludeCredentials": [
    { "type": "public-key", "id": "ZXhpc3RpbmctY3JlZC1pZA", "transports": ["internal"] }
  ],
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "preferred"
  },
  "attestation": "none"
}
```

### JSON example: Registration response (front end POSTs to RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwi...",
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YV...",
    "transports": ["internal", "hybrid"]
  }
}
```

::: tip
`excludeCredentials` lists credentials already registered by this user, preventing **duplicate registration** on the same authenticator. When the authenticator finds a matching existing credential, it rejects with `InvalidStateError`.
:::

## II. Authentication ceremony

### Step-by-step flow

1. **RP generates `PublicKeyCredentialRequestOptions`**: Contains a new one-time `challenge`, `rpId`, optional `allowCredentials` (list of Credential IDs already registered by the user), `userVerification`. For username-less Passkey login, `allowCredentials` can be left empty.
2. **Front end calls `navigator.credentials.get()`**: The browser verifies the origin again and prompts the user to select/verify the authenticator.
3. **Authenticator**: Locates the private key (via `allowCredentials` or discoverable credentials), verifies UP/UV, signs `authenticatorData ‖ SHA-256(clientDataJSON)` with the private key.
4. **Returns `PublicKeyCredential`**: Its `response` is `AuthenticatorAssertionResponse`, containing `authenticatorData`, `clientDataJSON`, `signature`, and for discoverable credentials, `userHandle`.
5. **Front end POSTs to RP**.
6. **RP verifies**: Retrieves the stored public key by Credential ID (or `userHandle`), validates challenge/origin/type/flags/counter, verifies the signature with the public key; if successful, logs the user in and updates `signCount`.

### Front-end example: Initiate authentication

```js
const options = await fetch('/webauthn/login/options', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice@example.com' }), // can be omitted for username-less login
}).then(r => r.json());

options.challenge = b64urlToBuf(options.challenge);
if (options.allowCredentials) {
  options.allowCredentials = options.allowCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const assertion = await navigator.credentials.get({ publicKey: options });

await fetch('/webauthn/login/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: assertion.id,
    rawId: bufToB64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufToB64url(assertion.response.clientDataJSON),
      authenticatorData: bufToB64url(assertion.response.authenticatorData),
      signature: bufToB64url(assertion.response.signature),
      userHandle: assertion.response.userHandle
        ? bufToB64url(assertion.response.userHandle) : null,
    },
  }),
});
```

### JSON example: `PublicKeyCredentialRequestOptions` (issued by RP)

```json
{
  "challenge": "YXV0aC1jaGFsbGVuZ2UtcmFuZG9t",
  "timeout": 60000,
  "rpId": "example.com",
  "allowCredentials": [
    { "type": "public-key", "id": "AbCd...credentialId-base64url", "transports": ["internal"] }
  ],
  "userVerification": "preferred"
}
```

### JSON example: Authentication response (front end POSTs to RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi...",
    "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MdAAAAAA",
    "signature": "MEUCIQD...der-encoded-ecdsa-signature",
    "userHandle": "S3v9Y2k...Base64URL"
  }
}
```

## III. RP Server-side Verification Checklist

Whether registration or authentication, the server **must** verify each item (never trust the front end):

1. **Parse `clientDataJSON`** as JSON.
2. **`type` is correct**: Must be `"webauthn.create"` for registration, `"webauthn.get"` for authentication.
3. **challenge matches**: `clientDataJSON.challenge` (Base64URL) when decoded **byte-for-byte matches** the challenge issued in this session, and the challenge has not been used before.
4. **origin matches**: `clientDataJSON.origin` belongs to the RP's set of allowed legitimate origins (exact string match, including protocol and port).
5. **(Optional) `crossOrigin`**: If `true`, must align with business expectations; typically should be `false`.
6. **`rpIdHash` verification**: The first 32 bytes of `authenticatorData` equal `SHA-256(rpId)`.
7. **flags verification**: The `UP` flag must be 1; if multi-factor is required, the `UV` flag must be 1.
8. **Signature counter**: Compare `signCount` with the stored value; the new value should be larger (except for authenticators with constant 0 counter).
9. **Signature verification (authentication ceremony only)**: Using the stored public key, verify `signature` against `authenticatorData ‖ SHA-256(clientDataJSON)`.
10. **Algorithm consistency**: The signature verification algorithm matches the `alg` recorded during registration.

::: tip
We strongly recommend using mature libraries (such as server-side `@simplewebauthn/server`, front-end `@simplewebauthn/browser`, Go's `go-webauthn`, Java's `webauthn4j`) for CBOR parsing, COSE public key conversion, and signature verification, rather than implementing these cryptographic details manually.
:::

## IV. Common Pitfalls

::: warning
- **challenge is not one-time**: Not invalidated after verification, leading to replay attacks. Must be stored server-side, bound to session, and deleted after use.
- **origin not matched exactly**: Matching with `endsWith` or ignoring port/protocol can be bypassed. Must do exact byte-for-byte comparison.
- **counter handling improper**: Rejecting login for synced Passkeys with constant 0 counter due to "not increasing"; or missing true regression detection.
- **rpId and origin mismatch**: `rp.id` is not the registrable domain of the current domain or its parent; `create()`/`get()` directly throws `SecurityError`.
- **Base64 and Base64URL mixed**: WebAuthn uses **Base64URL without padding**; using standard Base64 causes decoding errors.
- **Forgot `excludeCredentials`**: The same authenticator gets registered multiple times, creating redundant credentials.
- **Only trust `userVerification` in request parameters**: Must verify the returned `UV` flag server-side, not assume the authenticator complied with the request.
- **No handling of user presence timeout/retry**: `create()`/`get()` throws `NotAllowedError` due to timeout or user cancellation; front end should handle gracefully.
:::

Continue reading: [Parameters and Data Structure Reference](./reference.md).
