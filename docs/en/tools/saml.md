---
title: SAML Encoder/Decoder
---

# SAML Online Encoder/Decoder

**Decode**: Paste `SAMLRequest` / `SAMLResponse` parameter value, full Redirect URL, or raw XML; tool auto-detects encoding (Redirect Binding's `deflate + base64 + urlencode` or POST Binding's plain `base64`) and outputs formatted XML.

**Generate**: Fill SP-side key parameters, generate a standard `AuthnRequest`, provide Redirect Binding encoded value and complete redirect URL for integration testing.

<ClientOnly>
  <SamlTool />
</ClientOnly>

## Two Binding Encoding Methods

| Binding | Transport | Encoding |
|---------|-----------|----------|
| HTTP-Redirect | URL query param `SAMLRequest` | XML → raw deflate compression → Base64 → URL encode |
| HTTP-POST | Form field `SAMLRequest` / `SAMLResponse` | XML → Base64 (no compression) |

See detailed flow description in [SAML Typical Flows](../saml/flows.md).

<script setup>
import SamlTool from '@components/SamlTool.vue'
</script>
