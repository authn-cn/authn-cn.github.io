---
title: WebAuthn Overview
---

# WebAuthn Overview

## What is WebAuthn

**WebAuthn (Web Authentication)** is a browser standard API defined by W3C that enables Web applications to use **public key cryptography** instead of traditional passwords for registration and login. It is part of the FIDO Alliance's **FIDO2** project:

- **WebAuthn**: W3C standard that defines the interface between browser and Web application (JavaScript), namely `navigator.credentials.create()` and `navigator.credentials.get()`.
- **CTAP (Client to Authenticator Protocol)**: FIDO Alliance standard that defines the communication protocol between the client (browser/operating system) and external **Authenticator (authentication device)**, such as USB, NFC, or Bluetooth-connected security keys.

WebAuthn + CTAP2 together form **FIDO2**. For Web engineers, the main focus is the WebAuthn API; CTAP is handled at the lower level by the browser and operating system.

## Problems Solved

Traditional passwords have structural vulnerabilities: they can be phished, subjected to credential stuffing, and reused after server-side breaches. WebAuthn solves these problems through the following design:

- **Passwordless / Multi-factor authentication**: The private key is stored in the authenticator and never leaves the device; the server only stores the public key, making login impossible even if the database is breached.
- **Phishing-resistant**: Credentials are bound to the **origin**. A credential registered for `bank.com` cannot be used on `bank.evil.com`; the browser enforces this verification at the protocol level, preventing users from being tricked into revealing credentials.
- **Replay-resistant**: Each ceremony uses a one-time **challenge** issued by the server; signature results cannot be replayed.

::: tip
"Phishing-resistant" is WebAuthn's core advantage over SMS verification codes and TOTP one-time passwords: the latter can be forwarded in real-time by phishing websites, while WebAuthn's origin binding prevents such attacks at the cryptographic level.
:::

## What is Passkey

**Passkey** is the consumer-grade brand name coined by the FIDO Alliance and major platform vendors for WebAuthn credentials. Technically, it is a type of **discoverable credential (also called resident key)**, and typically has **cross-device synchronization** capability.

- **Discoverable**: The credential and user information are stored in the authenticator itself; during login, users don't need to enter a username—the authenticator can directly "discover" and list available accounts, enabling **username-less** login.
- **Syncable**: Platforms (such as Apple iCloud Keychain, Google Password Manager, Windows Hello) end-to-end encrypt and synchronize Passkeys across devices on the same account, avoiding "losing credentials when switching phones."

The relationship between Passkey and WebAuthn:

| Concept | Position |
|---------|----------|
| WebAuthn | W3C technical standard and browser API |
| Passkey | Consumer-facing product concept; technically, a discoverable credential of WebAuthn |
| Synced Passkey | Cloud-synchronized, cross-device, high convenience |
| Device-bound | Confined to a single device (such as hardware security keys), higher attack resistance |

::: warning
From a code perspective, the API calls for registering synced Passkeys and traditional WebAuthn credentials are nearly identical; the main difference is in parameters like `authenticatorSelection.residentKey`. Do not assume that Passkeys are necessarily "bound to a single device"—synced Passkeys can appear on multiple devices.
:::

## Three Major Roles

1. **Relying Party (RP, Relying Party)**: Your Web application and its server. The RP generates challenges, issues options, verifies attestation/assertion returned by the authenticator, and stores the user's public key. The RP is identified by **rpId** (typically a valid domain name, such as `example.com`).
2. **Authenticator (Authentication Device)**: The entity that holds the private key and performs cryptographic signing, divided into two types:
   - **Platform authenticator**: Built into the device, such as Touch ID / Face ID, Windows Hello, Android fingerprint.
   - **Roaming authenticator**: External security keys that can be used across devices, such as YubiKey, connected via USB/NFC/BLE.
3. **Client / Browser**: The browser and operating system that host the WebAuthn API. Responsible for verifying the origin, assembling `clientDataJSON`, communicating with the authenticator via CTAP, and relaying between the RP and authenticator.

Data flow overview:

```
RP Server  <--HTTPS-->  Browser(WebAuthn API)  <--CTAP-->  Authenticator
   |                          |                              |
Issue options           Verify origin/assemble data    Generate keys/sign
Verify signature            Return credential          Private key never leaves device
```

## Relationship and Position with Passwords / TOTP / OIDC

| Mechanism | Type | Phishing-resistant | Server Breach Risk | Relationship to WebAuthn |
|-----------|------|--------|----------------|------------------|
| Password | Shared-memory key | No | High (hash can be brute-forced offline) | Being replaced |
| TOTP (e.g., Google Authenticator) | Time-based one-time password | No (can be phished in real-time) | Medium (compromise of seed causes loss) | Can be used as second factor, can be replaced or supplemented by WebAuthn |
| SMS verification code | Out-of-band one-time password | No | Medium (SIM hijacking) | Can be replaced by WebAuthn |
| WebAuthn / Passkey | Public key challenge-response | Yes | Low (only public key stored) | Topic of this chapter |
| OIDC (OpenID Connect) | Federated identity protocol | Depends on IdP | — | Complementary: WebAuthn is often used as the internal authentication method within the **IdP** |

::: tip
WebAuthn and OIDC are not competitive. In typical architectures, identity providers (IdPs) use WebAuthn/Passkey internally to complete user authentication and issue ID Tokens externally to business applications via OIDC. See [../oidc/](/en/oidc/). For overall multi-factor authentication design, see [../mfa/](/en/mfa/).
:::

## Applicable Scenarios

- **Passwordless login**: Completely replace passwords with Passkeys, combined with discoverable credentials to achieve username-less login.
- **Strong second factor (2FA)**: Add phishing-resistant hardware/platform authenticators beyond passwords, replacing TOTP and SMS.
- **High-value operation confirmation**: Require WebAuthn authentication (step-up) before sensitive operations such as transfers or security setting changes.
- **Enterprise intranet / Zero Trust**: Use roaming security keys for strong authentication independent of device.

## Navigation for This Chapter

- [Core Concepts](./concepts.md) — Public key credential model, attestation/assertion, challenge, origin binding, UV/UP and other terms.
- [Registration and Authentication Flows](./flows.md) — Complete step-by-step for both ceremonies, JS/JSON examples and server-side verification checklist.
- [Parameters and Data Structure Reference](./reference.md) — Field tables for various options, `clientDataJSON`, `authenticatorData` structure, COSE algorithm tables, and troubleshooting reference.
