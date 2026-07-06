---
title: JWT Decoder
---

# JWT Online Decoder and Verifier

Dual-column layout like jwt.io: paste JWT on the left (supports `Bearer ` prefix, three segments highlighted by Header/Payload/Signature), decode in real-time on the right. Time claims (`exp` / `nbf` / `iat` / `auth_time`) automatically convert to local time and check validity; **verify signatures** in the lower-right — enter shared secret for `HS256/384/512`, PEM public key for `RS/PS/ES` series, with live verification result. All computation happens in-browser; tokens and keys are never uploaded.

<ClientOnly>
  <JwtDecoder />
</ClientOnly>

::: tip Try It
The page is pre-filled with jwt.io's classic example (HS256). Enter `your-256-bit-secret` in the lower-right Secret field to see <strong>✔ Signature valid</strong>.
:::

## About JWT

JWT (JSON Web Token, RFC 7519) consists of three Base64URL-encoded segments separated by `.`:

```
Header.Payload.Signature
```

- **Header**: declares signature algorithm (`alg`) and type (`typ`), may include key ID `kid`
- **Payload**: claims collection, such as `iss` (issuer), `sub` (subject), `aud` (audience), `exp` (expiration)
- **Signature**: signature of the first two segments, prevents tampering

::: warning Decode ≠ Verify
The first two segments of a JWT are only encoded, not encrypted — anyone can decode them. Only when you enter the correct secret/public key in this tool and see **✔ Signature valid** are the claims trustworthy; servers must further validate `iss` / `aud` / `exp`. See the ID Token validation checklist in [OIDC Core Concepts](../oidc/concepts.md).
:::

<script setup>
import JwtDecoder from '@components/JwtDecoder.vue'
</script>
