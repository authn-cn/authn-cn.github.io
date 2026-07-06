---
title: SAML Mock
---

# SAML Mock

SAML enthält zwei Rollen: **IdP** (Aussteller) und **SP** (Konsument), gepaart können sie durchgehend Web Browser SSO demonstrieren. Terminologie und Gesamterklärung siehe [Mock-Überblick](./README.md).

**Service-Adresse: <https://mock.authn.tech/>**

## IdP —— Identity Provider (Identitätsanbieter)

| Endpunkt | Pfad |
|------|------|
| Metadata | [`/saml/idp/metadata`](https://mock.authn.tech/saml/idp/metadata) |
| SSO (Redirect / POST) | `/saml/idp/sso` |

- Importieren Sie Metadata URL in Ihren SP um sich zu verbinden. **SP-initiated**: Senden Sie `AuthnRequest` zu SSO Endpunkt (unterstützt Redirect und POST Binding).
- **IdP-initiated**: `/saml/idp/sso?user=alice&sp=<SP-entityID>&acs=<SP-ACS-URL>`.
- Stellt Assertion mit `AttributeStatement` (email / name etc.) aus, durch Standard-Industrie-Bibliothek `xml-crypto` unabhängig validiert. Selbstsigniertes Zertifikat in Metadata eingebettet.

## SP —— Service Provider (Dienstanbieter)

| Endpunkt | Pfad |
|------|------|
| Konsole | [`/saml/sp/`](https://mock.authn.tech/saml/sp/) |
| Metadata | [`/saml/sp/metadata`](https://mock.authn.tech/saml/sp/metadata) |
| ACS (POST) | `/saml/sp/acs` |

Öffnen Sie die Konsole und klicken Sie um SP-initiated Login zu initiieren, zeigen Sie **Signatur-Validierungsergebnis und Assertion-Analyse an**.

Möchten Sie den Effekt direkt auf dieser Site sehen? Siehe **echte klickbare** [SAML-Login-Demo](./saml-demo.md), ein Klick durchläuft Ausstellung → Validierung → Analyse und zeigt die Ergebnisse jedes Schritts.

## Aufruffolge (SP-initiated Web Browser SSO)

Mit "Ihr SP + Mock IdP" als Beispiel:

1. **SP** generiert `AuthnRequest`, leitet Browser um (oder POST) zu **IdP** `/saml/idp/sso`.
2. **IdP** zeigt Test-Benutzerauswahlseite an (oder wählt direkt mit `&user=alice`).
3. **IdP** generiert und **signiert** SAML `Response` (enthält `Assertion`), POSTet über Browser zu **SP** ACS (`AssertionConsumerService`) Adresse zurück.
4. **SP** nutzt IdP Metadata Zertifikat um **Signatur zu validieren**, vergleicht `Audience`, `NotBefore` / `NotOnOrAfter`, `InResponseTo` und andere Bedingungen.
5. **SP** liest `NameID` und Attribute von `Assertion`, etabliert lokale Session.

> `AuthnRequest` / `Response` Originaltext können Sie mit [SAML Encode/Decode](../tools/saml.md) und [SAML Response Parser](../tools/saml-parse.md) anschauen; Metadata mit [SAML Metadata Parser](../tools/saml-metadata.md).
