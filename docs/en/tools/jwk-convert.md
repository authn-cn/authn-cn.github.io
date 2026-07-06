---
title: JWK / JWKS → PEM
---

# JWK / JWKS → PEM Conversion

Paste single JWK or entire JWKS, convert to PEM public key (SPKI), and display each key's `kty` / `alg` / `use` / `kid` plus [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) JWK Thumbprint. Supports RSA and EC; exports public key only when private key fields present. Pure browser conversion, never uploaded.

<ClientOnly>
  <JwkConverter />
</ClientOnly>

::: tip Where to Get JWKS
Use [OIDC Discovery Viewer](./discovery.md) to fetch any OP's `jwks_uri`, paste the keys here to convert to PEM for [JWT Verification](./jwt.md). Reverse (key generation) see [JWK Generator](./jwk.md).
:::

<script setup>
import JwkConverter from '@components/JwkConverter.vue'
</script>
