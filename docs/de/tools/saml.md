---
title: SAML-Codierung/Decodierung
---

# SAML Online-Codierung/Decodierung

**Decodierung**: Fügen Sie `SAMLRequest` / `SAMLResponse` Parameterwert, vollständige Redirect-URL oder rohes XML ein, das Tool erkennt automatisch die Codierungsmethode (HTTP-Redirect Binding `deflate + base64 + urlencode`, oder HTTP-POST Binding pure `base64`) und formatiert die XML-Ausgabe.

**Generierung**: Füllen Sie die wichtigsten Parameter auf der SP-Seite aus, generieren Sie eine standardisierte `AuthnRequest` und geben Sie den HTTP-Redirect-Binding-Codierungswert und die komplette Umleitungs-URL für einfache Integrationsabstimmung an.

<ClientOnly>
  <SamlTool />
</ClientOnly>

## Codierungsmethoden der zwei Bindings

| Binding | Transportort | Codierung |
|---------|----------|------|
| HTTP-Redirect | URL-Abfrageparameter `SAMLRequest` | XML → Raw-Deflate-Kompression → Base64 → URL-Codierung |
| HTTP-POST | Formularfeld `SAMLRequest` / `SAMLResponse` | XML → Base64 (keine Kompression) |

Detaillierte Prozess-Beschreibung siehe [SAML typischer Ablauf](../saml/flows.md).

<script setup>
import SamlTool from '@components/SamlTool.vue'
</script>
