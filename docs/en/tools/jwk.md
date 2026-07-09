---
title: JWK / Key Pair Generator
---

# JWK / Key Pair Generator

One-click RSA or EC key pair generation, export public/private JWK, JWKS (ready for `jwks_uri` endpoint), and PEM (SPKI / PKCS#8). `kid` computed per [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) JWK Thumbprint. Keys generated in-browser, never uploaded.

<ClientOnly>
  <JwkGenerator />
</ClientOnly>

::: tip Use Together With
Generated private key for [JWT Signing](./jwt-sign.md), public JWK/JWKS for [JWT Verification](./jwt.md). For where JWK/JWKS fit within the JOSE family, see the [JWT / JOSE documentation](../jwt/).
:::

<script setup>
import JwkGenerator from '@components/JwkGenerator.vue'
</script>
