---
title: X.509 Certificate Parser
---

# X.509 Certificate Parser

Paste PEM certificate (or pure base64 DER), parse subject, issuer, validity, serial number, public key / signature algorithm, SHA-1 / SHA-256 fingerprint. Pure browser-side ASN.1 parsing; certificates never uploaded.

<ClientOnly>
  <CertViewer />
</ClientOnly>

::: tip SAML Scenario
The `<ds:X509Certificate>` content in SAML Metadata is base64 DER that can be pasted directly here to view IdP/SP signing certificate info and validity.
:::

<script setup>
import CertViewer from '@components/CertViewer.vue'
</script>
