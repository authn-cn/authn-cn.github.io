---
title: PEM-Parser
---

# PEM-Parser

Fügen Sie beliebigen PEM-Text ein (kann mehrere Blöcke enthalten, wie eine komplette Zertifikatskette + Öffentlichschlüssel), erkennen Sie automatisch den Typ jedes Blocks (Zertifikat, CSR, SPKI-Öffentlichschlüssel, PKCS#8-Privatschlüssel, PKCS#1 / SEC1 alte-Privatschlüssel, CRL usw.), zeigen Sie DER-Bytenlänge an, und geben Sie nach Möglichkeit Schlüsselalgorithmus und Bits / Kurve an; Zertifikat-Blöcke werden an Subject, Issuer, Gültigkeitsdauer und Fingerabdruck-Digest angehängt. Reine Browser-lokale Analyse, nicht hochgeladen.

<ClientOnly>
  <PemInspector />
</ClientOnly>

::: tip Verwandte Tools
Für komplette Zertifikatsfelder verwenden Sie [X.509-Parser](./cert.md); um Schlüssel zu JWK zu konvertieren, verwenden Sie [PEM → JWK](./pem-to-jwk.md).
:::

<script setup>
import PemInspector from '@components/PemInspector.vue'
</script>
