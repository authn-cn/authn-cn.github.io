---
title: PEM Parser
---

# PEM Parser

Paste any PEM text (can contain multiple blocks, like certificate chain + public key), auto-identify each block type (certificate, CSR, SPKI public key, PKCS#8 private key, PKCS#1 / SEC1 legacy private key, CRL), show DER byte length, and provide key algorithm, bit length / curve when possible; certificate blocks include subject, issuer, validity, fingerprint digest. Pure browser-side parsing, never uploaded.

<ClientOnly>
  <PemInspector />
</ClientOnly>

::: tip Related Tools
Full certificate fields use [X.509 Parser](./cert.md); convert key to JWK use [PEM → JWK](./pem-to-jwk.md).
:::

<script setup>
import PemInspector from '@components/PemInspector.vue'
</script>
