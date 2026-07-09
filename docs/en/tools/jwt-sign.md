---
title: JWT Signer
---

# JWT Signer

Enter Payload and secret to generate a signed JWT for easy test token creation. Supports HMAC (`HS*`), RSA (`RS*` / `PS*`), ECDSA (`ES*`); asymmetric algorithms allow one-click test key pair generation. All computation in-browser; keys are never uploaded.

<ClientOnly>
  <JwtSigner />
</ClientOnly>

::: warning For Testing Only
Do not enter production private keys here. Generated tokens can be verified with [JWT Decoder](./jwt.md) or used with keys from [JWK Generator](./jwk.md).
:::

::: tip How to Choose an Algorithm
For the difference between symmetric (`HS*`) and asymmetric (`RS*`/`PS*`/`ES*`) algorithms and their use cases, see [JWT / JOSE documentation · Signature Algorithms](../jwt/concepts.md#signature-algorithms-symmetric-vs-asymmetric).
:::

<script setup>
import JwtSigner from '@components/JwtSigner.vue'
</script>
