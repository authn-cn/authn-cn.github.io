---
title: SAML Response Parser
---

# SAML Response / Assertion Parser

Paste `SAMLResponse` value, full URL containing it, or raw XML; structurally display key fields: Status, Issuer, Subject/NameID, SubjectConfirmation, Conditions and time validity, Audience, AuthnStatement, AttributeStatement, and signature/digest algorithm. Auto-detect base64 and deflate (Redirect Binding) encoding. Pure browser-side parsing, never uploaded.

<ClientOnly>
  <SamlResponseParser />
</ClientOnly>

::: warning Parse ≠ Verify
This tool displays message structure and fields, **does not verify signature validity** — signature trustworthiness requires SP to validate with IdP certificate. For encoding/generating AuthnRequest see [SAML Encoder/Decoder](./saml.md); for certificates see [X.509 Parser](./cert.md).
:::

<script setup>
import SamlResponseParser from '@components/SamlResponseParser.vue'
</script>
