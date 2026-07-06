---
title: SAML-Metadata-Parser
---

# SAML-Metadata-Parser

Fügen Sie SAML `EntityDescriptor` / `EntitiesDescriptor` XML ein, parsen Sie Entity-`entityID`, Rollen (IdP / SP), verschiedene Endpunkte (SSO / ACS / SLO und deren Bindings), `NameIDFormat`, und für eingebettete `X509Certificate` zeigen Sie Subject, Gültigkeitsdauer und SHA-256-Fingerabdruck. Reine Browser-lokale Analyse, nicht hochgeladen.

<ClientOnly>
  <SamlMetadataParser />
</ClientOnly>

::: tip Ausprobieren
Die Metadata dieses Standorts Mock IdP kann direkt abgerufen und eingefügt werden: <https://mock.authn.tech/saml/idp/metadata>
:::

Detailliert siehe [SAML Kernkonzepte](../saml/concepts.md) Metadata-Erklärung.

<script setup>
import SamlMetadataParser from '@components/SamlMetadataParser.vue'
</script>
