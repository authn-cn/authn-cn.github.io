---
title: SAML-Login-Demo
---

# SAML-Login-Demo (Echter Prozess)

Unten ist eine **echte klickbare** SAML 2.0 Web Browser SSO Demo, Identitätsanbieter ist Mock SAML IdP dieser Site. Nach Klick auf Test-Benutzer:

1. Demo SP generiert `AuthnRequest` (mit einzigartige `ID`);
2. Browser fordert Mock IdP an, IdP verifiziert Benutzer (Demo direkt angeben alice / bob, umgehe Benutzerauswahlseite) und stellt **signierte SAML Response** aus;
3. Diese Seite dekodiert base64, extrahiert signierte `Response` XML;
4. Validiere systematisch: `StatusCode`, `InResponseTo` (verknüpft mit AuthnRequest), `Audience`, `Conditions` Gültigkeitsdauer, und nutze Assertion **eingebettetes Zertifikat öffentlichen Schlüssel um Signatur zu validieren** (RSA-SHA256);
5. Lese `NameID` und Attribute von Assertion.

<ClientOnly>
  <SamlDemo />
</ClientOnly>

## Das Demo zeigt

- **Signierte Assertion**: IdP nutzt privaten Schlüssel um Assertion zu signieren, SP nutzt IdP Zertifikat um Signatur zu validieren, bestätigt Assertion wurde nicht manipuliert, stammt wirklich von vertrautem IdP.
- **`InResponseTo` Verknüpfung**: Zurückkommende Response verknüpft mit ursprünglicher `AuthnRequest` `ID`, verhindert Assertion Falscher Zuordnung oder Wiedergabe (ähnlich OIDC `state`).
- **`Audience` Limitation**: Assertion erklärt sie ist nur für diesen SP (entityID) gültig, andere SPs können sie nicht verwenden.
- **`Conditions` Gültigkeitsdauer**: `NotBefore` / `NotOnOrAfter` limitieren Assertion Gültigkeitszeitfenster.

::: tip Über Signatur-Verifizierung
SAML Signatur-Verifizierung in echten Systemen wird **von SP Server** durchgeführt, benötigt XML Normalisierung (exc-c14n). Das Demo validierte `SignedInfo` RSA-SHA256 Signatur im Browser; komplette Verifizierung braucht noch `DigestValue` Vergleich und Zertifikat Vertrauenskette —— diese Site [Mock SP Konsole](https://mock.authn.tech/saml/sp/) nutzte Industrie-Bibliothek `xml-crypto` für autoritäre Server Verifizierung.
:::

Vergleichen Sie OIDC äquivalenter Prozess [OIDC-Login-Demo](./demo.md).

<script setup>
import SamlDemo from '@components/SamlDemo.vue'
</script>
