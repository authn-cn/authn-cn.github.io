---
title: SAML Response-Parser
---

# SAML Response / Assertion Parser

Fügen Sie den Wert von `SAMLResponse`, die ihn enthaltende komplette URL oder rohes XML ein, strukturierte Anzeige von Schlüsselfeldern: Status, Issuer, Subject/NameID, SubjectConfirmation, Conditions und Zeitgültigkeit, Audience, AuthnStatement, AttributeStatement sowie Signatur-/Digest-Algorithmus. Erkennt automatisch Base64 und Deflate (HTTP-Redirect Binding) Codierung. Reine Browser-lokale Analyse, nicht hochgeladen.

<ClientOnly>
  <SamlResponseParser />
</ClientOnly>

::: warning Analyse ≠ Signaturverifizierung
Dieses Tool zeigt Nachrichtenstruktur und Felder, **verifiziert nicht die Signatursgültigkeit** — ob die Signatur vertrauenswürdig ist, muss SP mit IdP-Zertifikat validieren. Um Encoding/Generierung AuthnRequest zu sehen siehe [SAML-Codierung/Decodierung](./saml.md); um Zertifikat zu sehen siehe [X.509-Parser](./cert.md).
:::

<script setup>
import SamlResponseParser from '@components/SamlResponseParser.vue'
</script>
