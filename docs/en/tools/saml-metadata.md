---
title: SAML Metadata Parser
---

# SAML Metadata Parser

Paste SAML `EntityDescriptor` / `EntitiesDescriptor` XML, parse entity `entityID`, role (IdP / SP), endpoints (SSO / ACS / SLO and their Bindings), `NameIDFormat`, and display embedded `X509Certificate` subject, validity, SHA-256 fingerprint. Pure browser-side parsing, never uploaded.

<ClientOnly>
  <SamlMetadataParser />
</ClientOnly>

::: tip Try It
This site's Mock IdP metadata available at: <https://mock.authn.tech/saml/idp/metadata>
:::

See Metadata explanation in [SAML Core Concepts](../saml/concepts.md).

<script setup>
import SamlMetadataParser from '@components/SamlMetadataParser.vue'
</script>
