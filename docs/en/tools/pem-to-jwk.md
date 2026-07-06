---
title: PEM → JWK
---

# PEM → JWK Conversion

Paste PEM key and convert to JWK (JSON). Supports SPKI public key (`BEGIN PUBLIC KEY`) and PKCS#8 private key (`BEGIN PRIVATE KEY`), RSA and EC. By default outputs only public key parameters with [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) Thumbprint as `kid`; optionally export private key fields too. Pure browser conversion, never uploaded.

<ClientOnly>
  <PemToJwk />
</ClientOnly>

::: tip Related Tools
Reverse (JWK → PEM) see [JWK / JWKS → PEM](./jwk-convert.md); inspect any PEM use [PEM Parser](./pem-parse.md); generate new key pair use [JWK Generator](./jwk.md).
:::

<script setup>
import PemToJwk from '@components/PemToJwk.vue'
</script>
