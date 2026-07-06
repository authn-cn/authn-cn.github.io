---
title: PEM → JWK
---

# PEM → JWK Konvertierung

Fügen Sie PEM-Schlüssel ein und konvertieren Sie ihn zu JWK (JSON). Unterstützt SPKI-Öffentlichschlüssel (`BEGIN PUBLIC KEY`) und PKCS#8-Privatschlüssel (`BEGIN PRIVATE KEY`), RSA und EC. Gibt standardmäßig nur öffentliche Schlüsselparameter aus und fügt [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) Thumbprint als `kid` an; kann optional auch Privatschlüsselfelder exportieren. Reine Browser-lokale Konvertierung, nicht hochgeladen.

<ClientOnly>
  <PemToJwk />
</ClientOnly>

::: tip Verwandte Tools
Umgekehrte Operation (JWK → PEM) siehe [JWK / JWKS → PEM](./jwk-convert.md); um zu sehen, was ein PEM ist, verwenden Sie [PEM-Parser](./pem-parse.md); um ein neues Schlüsselpaar zu generieren, verwenden Sie [JWK-Generator](./jwk.md).
:::

<script setup>
import PemToJwk from '@components/PemToJwk.vue'
</script>
