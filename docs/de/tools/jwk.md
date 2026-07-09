---
title: JWK / Schlüsselpaar-Generierung
---

# JWK / Schlüsselpaar-Generierung

Mit einem Klick RSA- oder EC-Schlüsselpaare generieren, öffentliche/private JWK, JWKS (kann direkt auf `jwks_uri` Endpunkt platziert werden) sowie PEM (SPKI / PKCS#8) exportieren. `kid` wird nach [RFC 7638](https://datatracker.ietf.org/doc/html/rfc7638) JWK Thumbprint berechnet. Schlüssel werden lokal im Browser generiert, nicht hochgeladen.

<ClientOnly>
  <JwkGenerator />
</ClientOnly>

::: tip Kombinierte Nutzung
Der generierte Privatschlüssel kann für [JWT-Signierung](./jwt-sign.md) verwendet werden, öffentlicher JWK/JWKS kann für [JWT-Verifizierung](./jwt.md) verwendet werden. Die Einordnung von JWK/JWKS in der JOSE-Familie siehe [JWT- / JOSE-Dokumentation](../jwt/).
:::

<script setup>
import JwkGenerator from '@components/JwkGenerator.vue'
</script>
