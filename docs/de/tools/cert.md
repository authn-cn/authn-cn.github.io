---
title: X.509-Zertifikat-Parser
---

# X.509-Zertifikat-Parser

Fügen Sie PEM-Zertifikat (oder reines Base64-DER) ein, parsen Sie Subject, Issuer, Gültigkeitsdauer, Seriennummer, Öffentlichschlüssel-/Signaturalgorithmus, sowie SHA-1 / SHA-256-Fingerabdruck. Reine Browser-lokale ASN.1-Analyse, Zertifikat wird nicht hochgeladen.

<ClientOnly>
  <CertViewer />
</ClientOnly>

::: tip SAML-Szenario
Der Inhalt von `<ds:X509Certificate>` in SAML-Metadata ist Base64-DER, kann direkt eingefügt werden, um IdP/SP-Signaturzertifikat-Informationen und Gültigkeitsdauer zu sehen.
:::

<script setup>
import CertViewer from '@components/CertViewer.vue'
</script>
