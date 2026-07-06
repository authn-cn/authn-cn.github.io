---
title: HOTP / TOTP Algorithm Deep Dive
---

# HOTP / TOTP Algorithm Deep Dive

This page deconstructs the computation process of HOTP (RFC 4226) and TOTP (RFC 6238), provides bitwise details of dynamic truncation, and includes a runnable JavaScript reference implementation. It's recommended to first read the [Overview](./README.md).

## Shared Secret

OTP is a **symmetric** scheme: the server and user device hold the same key K (shared secret). The key is a raw byte sequence, but for human convenience and QR code capacity, it's typically encoded in **Base32** (RFC 4648) as uppercase letters `A–Z` and digits `2–7`.

```
Raw key bytes: 0x48 0x65 0x6C 0x6C 0x6F ...
Base32 encoded: JBSWY3DPEHPK3PXP (the string you see when entering into the authenticator)
```

::: tip
Base32 is chosen over Base64 because it avoids confusing characters, is case-insensitive, and is suitable for manual entry. Key length should be at least 160 bits (20 bytes, matching SHA-1's block size), corresponding to 32 Base32 characters. See [Base32 details in the Reference page](./reference.md).
:::

The server **must encrypt-at-rest** the shared secret (e.g., using KMS/envelope encryption), because if it leaks, attackers can offline-clone all user OTPs.

## HOTP Algorithm Step-by-Step (RFC 4226)

HOTP takes a key K and an 8-byte counter C as input, and outputs a `digits`-digit decimal code.

### Steps

1. **Construct counter buffer**: Encode counter C as an **8-byte big-endian** sequence.
2. **Calculate HMAC**: `HS = HMAC-SHA1(K, C)`, yielding a 20-byte digest.
3. **Dynamic truncation**: Select 4 bytes from the 20-byte digest based on the low 4 bits of the last byte.
4. **Modulo**: Treat these 4 bytes as a 31-bit integer, take modulo `10^digits`, and left-pad with zeros to `digits` digits.

```
HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^digits
```

### Bitwise Details of Dynamic Truncation

Let `HS` be the 20-byte digest, indexed 0–19:

1. Take the **low 4 bits** of the last byte `HS[19]` as the offset: `offset = HS[19] & 0x0F`, range 0–15.
2. Extract 4 bytes starting from `offset`, concatenate into a 32-bit integer, and **clear the high bit** (`& 0x7F` for the first byte) to get a 31-bit unsigned number, avoiding sign-bit ambiguity:

```
binCode = ((HS[offset]   & 0x7F) << 24)
        | ((HS[offset+1] & 0xFF) << 16)
        | ((HS[offset+2] & 0xFF) <<  8)
        |  (HS[offset+3] & 0xFF)
```

3. Take modulo to get the final code: `otp = binCode mod 10^digits`, e.g., for digits=6, `mod 1000000`.

::: tip Example (from RFC 4226 Appendix D)
Key K = ASCII `"12345678901234567890"`, counter C = 0: The `HMAC-SHA1` digest's low 4 bits of the last byte give offset = 6, truncation yields a 31-bit integer, `mod 10^6 = 755224`. For consecutive counters 0..9, the 6-digit HOTPs are: `755224, 287082, 359152, 969429, 338314, 254676, 287922, 162583, 399871, 520489`. This set of values is the standard test vector for verifying correct implementation.
:::

## TOTP Algorithm (RFC 6238)

TOTP simply replaces HOTP's counter with a **time step** T:

```
T = floor((currentUnixTime - T0) / period)
TOTP(K) = HOTP(K, T)
```

Default parameter values:

- `T0`: Starting point of time, default **0** (Unix epoch).
- `period` (time step, also called X): default **30** seconds.
- `digits`: default **6**.
- Hash algorithm: default **SHA-1**.

In other words, subtract T0 from the current Unix timestamp (in seconds), integer-divide by period to get which time slice you're in, and use this slice number as HOTP's counter. Within the same 30-second window, T remains constant and the generated code doesn't change; after crossing the window boundary, the code automatically refreshes.

## Time Window Tolerance on Verification Side

The user device's clock and server clock may have an offset, and user input takes time. Verification **cannot just check the current time slice**; it should check adjacent time slices:

1. Calculate the server's current time slice `T`.
2. Within the range `[T - window, T + window]` (usually `window = 1`, i.e., ±1 step = ±30 seconds), calculate TOTP for each and compare with user input.
3. Pass if any match; fail if all miss.

::: warning
The tolerance window is a **trade-off between security and usability**: a larger window is more forgiving but expands the attacker's replay window. `window = 1` (total effective span ~90 seconds) is recommended. Don't widen it to "reduce support tickets"—a better approach is to guide users in syncing their device time.
:::

Comparison should use **constant-time comparison**, avoiding side-channel leaks via response timing.

## Optional Parameters

- **Hash algorithm**: SHA-1 / SHA-256 / SHA-512 are all supported (per TOTP spec). Note that HMAC output lengths differ (20/32/64 bytes), but dynamic truncation logic remains unchanged (still use low 4 bits of last byte for offset).
- **digits**: Usually 6, some high-security scenarios use 8.
- See [parameter table in the Reference page](./reference.md) for details.

::: danger Compatibility Warning
Although the spec supports SHA-256/512 and 8-digit codes, **most mainstream authenticator apps reliably support only the default combination: SHA-1 / 6 digits / 30 seconds**. Unless there's a strong requirement, stick with defaults to ensure interoperability.
:::

## Security Considerations

- **Key entropy**: Generate ≥160-bit keys using CSPRNG (cryptographically secure random), never reuse or use predictable values.
- **Replay prevention**: Record the last successful time slice used by the user, reject the same time slice (and earlier) if the code is reused, preventing the same code from being replayed within 30 seconds.
- **Rate limiting**: 6-digit code space is only 1 million—must limit attempts (e.g., lock/backoff after N failures), otherwise susceptible to brute-force.
- **Clock sync**: Server uses NTP to maintain accurate time; client clock drift is the leading cause of failures.
- **Binding-phase protection**: Require the user to enter the current code once after importing the key to confirm, before enabling MFA.
- **Transport and storage**: Key is issued only once during binding, encrypted in storage on the server, not echoed on the frontend.

## Backup / Recovery Codes

Users may lose their authenticator device. When enabling TOTP, generate a single set of **one-time backup codes** (e.g., 10 high-entropy random codes) for login if the device is lost:

- Each backup code can be used **only once**, becoming invalid after use.
- The server should **hash-store** backup codes (e.g., bcrypt/argon2), not plaintext.
- Advise users to store them offline (printed or in password manager), and support regeneration (old codes become invalid).

## Complete TOTP Reference Implementation (JavaScript / Node.js)

```js
const crypto = require('crypto');

// Base32 (RFC 4648) decode to Buffer; ignore padding and case
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('Invalid Base32 character: ' + ch);
    value = (value << 5) | idx;   // Each character carries 5 bits
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// HOTP: key is a Buffer, counter is an integer counter
function hotp(key, counter, { digits = 6, algorithm = 'sha1' } = {}) {
  // 1. Encode counter as 8-byte big-endian
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  // 2. HMAC
  const hs = crypto.createHmac(algorithm, key).update(buf).digest();

  // 3. Dynamic truncation
  const offset = hs[hs.length - 1] & 0x0f;
  const binCode =
      ((hs[offset]     & 0x7f) << 24) |
      ((hs[offset + 1] & 0xff) << 16) |
      ((hs[offset + 2] & 0xff) << 8)  |
       (hs[offset + 3] & 0xff);

  // 4. Take modulo and left-pad with zeros
  const otp = binCode % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

// TOTP: HOTP based on time step
function totp(base32Secret, {
  time = Date.now(),   // milliseconds
  t0 = 0, period = 30, digits = 6, algorithm = 'sha1',
} = {}) {
  const key = base32Decode(base32Secret);
  const counter = Math.floor((Math.floor(time / 1000) - t0) / period);
  return hotp(key, counter, { digits, algorithm });
}

// Verify: allow ±window time steps of tolerance, return true if match
function verifyTotp(token, base32Secret, {
  time = Date.now(), t0 = 0, period = 30,
  digits = 6, algorithm = 'sha1', window = 1,
} = {}) {
  const key = base32Decode(base32Secret);
  const current = Math.floor((Math.floor(time / 1000) - t0) / period);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(key, current + w, { digits, algorithm });
    // Constant-time comparison to avoid timing side-channels
    if (candidate.length === token.length &&
        crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
      return true;
    }
  }
  return false;
}

// Examples
const secret = 'JBSWY3DPEHPK3PXP';
console.log(totp(secret));                 // Current 6-digit code
console.log(verifyTotp(totp(secret), secret)); // true
```

::: tip
Production environments shouldn't reinvent the wheel: Node ecosystem has mature libraries like `otplib` and `speakeasy`. The implementation above is for understanding the algorithm's internal mechanics and test vector validation.
:::

Next: Read [otpauth URI and Parameter Reference](./reference.md) to learn how to package the key into a QR code for distribution to authenticator apps.
