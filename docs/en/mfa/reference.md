---
title: otpauth URI and Parameter Reference
---

# otpauth URI and Parameter Reference

This page is a quick reference handbook for OTP distribution and parameters: `otpauth://` URI format, each parameter's default value, QR code conventions, authenticator compatibility, Base32 encoding rules, and a troubleshooting quick table for "code doesn't match." For algorithm details, see [HOTP / TOTP Algorithm Deep Dive](./totp.md).

## otpauth:// URI Format

Authenticator apps (Google Authenticator, etc.) import the shared secret via an `otpauth://` URI. This is a de facto standard (defined by Google Authenticator and widely adopted). The QR code encodes this exact URI.

```
otpauth://TYPE/LABEL?secret=...&issuer=...&algorithm=...&digits=...&period=...&counter=...
```

Components:

- **TYPE**: `totp` or `hotp`, determining the moving factor type.
- **LABEL**: Display name identifying the account, format `issuer:account` (e.g., `Example:alice@example.com`). The part before the colon is the issuer, after is the account name. LABEL needs URL encoding (colon can be written as `%3A`, space as `%20`).
- **query parameters**: Key and optional algorithm parameters, see table below.

Complete example:

```
otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30
```

HOTP example (note using `counter` instead of `period`):

```
otpauth://hotp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&counter=0
```

## Parameters and Defaults

| Parameter | Applies to | Required | Allowed values | Default | Description |
|-----------|-----------|----------|---------|---------|-------------|
| `secret` | totp/hotp | **Yes** | Base32 string | None | Shared secret, RFC 4648 Base32, uppercase, no padding |
| `issuer` | totp/hotp | Strongly recommended | String | None | Issuer name, should appear in both LABEL prefix and this parameter, consistent |
| `algorithm` | totp/hotp | Optional | `SHA1` / `SHA256` / `SHA512` | `SHA1` | HMAC hash algorithm |
| `digits` | totp/hotp | Optional | `6` / `8` | `6` | Number of code digits |
| `period` | **totp** | Optional | Positive integer (seconds) | `30` | Time step, TOTP only |
| `counter` | **hotp** | Required for HOTP | Non-negative integer | None | Initial counter, HOTP only |

::: tip issuer consistency
Best practice: `issuer` appears both as the LABEL prefix (`Example:alice@...`) and as a standalone `issuer=Example` parameter, with both being identical strings. This way, even if some app only reads one place, it correctly displays the issuer and avoids confusion with same-named accounts.
:::

## QR Code Conventions

- Encode the complete `otpauth://` URI as QR code content (plain text), and users scan with their authenticator app to import.
- Error correction level is usually **M** (medium); if the URI is long with a lengthy key, can use **L** to shrink the graphic.
- QR codes should only be shown during binding, **should not be persisted or cached**, and cleared from memory after display; avoid appearing in logs, screenshots, or CDN caches.
- Simultaneously provide the key in Base32 text for manual entry when scanning is not possible.

## Mainstream Authenticator App Compatibility

| App | Non-default algorithm (SHA256/512) | digits=8 | Custom period | Notes |
|-----|------|------|------|------|
| Google Authenticator | Older versions often ignore and use SHA1 | Unstable support | Unstable support | Most conservative compatibility; recommended to use defaults only |
| Microsoft Authenticator | Partial support | Partial support | Partial support | Defaults are most reliable |
| Authy | Good support | Supported | Supported | Higher parameter tolerance |
| FreeOTP / andOTP | Good support | Supported | Supported | Open-source implementations, complete parameter support |
| 1Password | Good support | Supported | Supported | — |

::: danger Interoperability First Principle
Without strong security requirements, stick to the **SHA1 / 6-digit / 30-second** default combination. Many apps (especially older Google Authenticator) will **silently ignore** `algorithm`, `digits`, `period` parameters and always compute using defaults—when this happens, the codes it generates will never match your server's SHA256/8-digit calculations, and there's no error message, making it extremely hard to debug.
:::

## Base32 Encoding Notes (RFC 4648)

The `secret` uses Base32 encoding with these conventions:

- **Alphabet**: `A–Z` + `2–7`, 32 characters total (omits `0`, `1`, `8`, `9` to avoid confusion with letters).
- **Uppercase**: Authenticators display and accept only uppercase; decoding should be case-insensitive.
- **No padding**: In the otpauth scenario, **remove trailing `=` padding**.
- **Encoding unit**: Every 5 bits map to one character, so 8 characters encode 5 bytes.
- **Recommended length**: Key at least 160 bits (20 bytes) = 32 Base32 characters.

```
Bytes (5)  : 0x48 0x65 0x6C 0x6C 0x6F
Base32    : JBSWY3DP
```

## Parameter Defaults Summary

| Item | Default |
|------|---------|
| TYPE | totp |
| algorithm | SHA1 |
| digits | 6 |
| period | 30 seconds |
| T0 (time start point) | 0 (Unix epoch) |
| Verification tolerance window | ±1 step (~±30 seconds) |
| secret encoding | Base32, uppercase, no padding |
| secret length | ≥160 bits (20 bytes) |

## Troubleshooting Quick Table: Code Never Matches

Ordered by frequency of occurrence:

| Symptom / Cause | How to verify | Solution |
|------|----------|------|
| **Client clock drift** | Most common. User's device time is inaccurate, or timezone/auto-sync is off | Enable device "set time automatically"; server can temporarily widen window to locate offset |
| **Server clock drift** | Server not synced to NTP | Deploy NTP; self-check with standard test vectors |
| **Key encoding error** | Stored/retrieved key treats Base32 as raw bytes or vice versa | Be explicit about key representation in database, URI, HMAC input; HMAC input must be **decoded raw bytes** |
| **Base32 padding/case** | secret contains `=` or lowercase, causing app parse failure | Remove padding, convert to uppercase before writing to URI |
| **Algorithm/digits mismatch** | Server uses SHA256 or 8-digit, but app ignores parameters and uses SHA1/6-digit | Align to default SHA1/6-digit; or switch to an app with higher parameter tolerance |
| **period inconsistency** | Server period doesn't match URI, or app ignored custom period | Align to 30 seconds |
| **Counter desync (HOTP)** | User accidentally advances token, causing counter to skip | Server sets look-ahead window; sync counter after match |
| **No tolerance window** | Only checking current time slice; fails crossing window boundary | Check ±1 steps during verification |
| **Replay block false positive** | Replay prevention mistakenly rejects legitimate first use | Review "last-used time slice" record logic |
| **counter/period field mixup** | HOTP accidentally uses period, or TOTP uses counter | Use correct parameter per TYPE |

::: tip Self-check Recommendation
Validate your server implementation using HOTP test vector from RFC 4226 Appendix D (key `"12345678901234567890"`, counter 0 → `755224`) and TOTP test vector from RFC 6238 Appendix B. This quickly pinpoints whether it's an algorithm implementation issue or a configuration/clock problem.
:::

Back to: [MFA Overview](./README.md) · [Algorithm Deep Dive](./totp.md)
