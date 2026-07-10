---
title: "SSO-Anbindung chinesischer Plattformen"
---

# SSO-Anbindung chinesischer Plattformen (Feishu / DingTalk)

Inländische Plattformen wie Feishu, DingTalk und WeCom **können alle Unternehmens-SSO umsetzen**, aber wie gut sie zu den Standardprotokollen (SAML / OIDC) passen, unterscheidet sich erheblich, und die Stolperfallen sind völlig andere als bei der Anbindung von Okta / Entra ID. Diese Seite erklärt diese Unterschiede.

## Zuerst die zwei Richtungen unterscheiden

"Unternehmens-SSO-Integration" hat zwei grundverschiedene Bedeutungen; klären Sie unbedingt zuerst, welche davon Sie umsetzen:

| Richtung | Rolle der Plattform | Typischer Bedarf |
|------|--------------|---------|
| **A. Mit bestehendem Unternehmenskonto in Feishu/DingTalk anmelden** | Plattform = **SP** (Dienstanbieter) | Das Unternehmen hat bereits einen IdP (AD / Okta / IDaaS) und möchte, dass sich Mitarbeiter mit einem einheitlichen Konto in Feishu/DingTalk anmelden |
| **B. Mit Feishu-/DingTalk-Konto in anderen Systemen anmelden** | Plattform = **IdP** / Identitätsquelle | Feishu/DingTalk als Login-Einstieg nutzen, per QR-Code-Scan in OA, Cloud-Desktop usw. anmelden |

Welche Protokolle dieselbe Plattform in den beiden Richtungen unterstützt, ist oft **unterschiedlich** — und genau hier wird man am leichtesten von pauschalen Formulierungen auf den offiziellen Seiten wie "unterstützt OAuth2/OIDC/SAML" in die Irre geführt.

## Feishu

### Richtung A: Feishu als SP — nur SAML 2.0

Im **Admin-Backend → Unternehmenseinstellungen → SSO-Kontoanmeldung** konfiguriert man "Anmeldung an Feishu über den Unternehmens-IdP"; tatsächlich wird **nur SAML 2.0 unterstützt** (und meist erst ab der **Flaggschiff-Version** freigeschaltet). Alle offiziellen Beispiele (Okta, Google Workspace, ADFS, Zhuyun, Authing) sind durchweg SAML; die Oberfläche hat **keine** Option für OIDC / OAuth2 / CAS.

::: warning Lassen Sie sich nicht von "Feishu unterstützt OIDC/OAuth2" täuschen
Diese Aussagen beziehen sich auf **Richtung B (Feishu als IdP)** oder auf die Fähigkeit, auf der Feishu-Integrationsplattform Anwendungen zu erstellen — nicht auf das SP-Szenario "Anmeldung an Feishu". Auf der SP-Seite gibt es nur SAML 2.0.
:::

### Die zwei harten Nüsse von Feishu-SAML

1. **Kein Import von IdP-Metadata**. Feishu verarbeitet keine Metadata-XML; Sie müssen die **Login-Adresse (SSO URL), Issuer/Entity ID und das Signaturzertifikat** des IdP jeweils einzeln von Hand eintragen. Das Public Certificate muss dabei als **nacktes base64** vorliegen — die Kopf-/Fußzeilen `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----` müssen entfernt werden.
2. **Zertifikat fest hinterlegt, manuelle Rotation nötig**. Feishu speichert das Zertifikat selbst, nicht eine "automatisch synchronisierte Metadata-URL". Sobald der IdP das Signaturzertifikat rotiert, schlägt die Anmeldung auf einmal fehl, wenn Feishu nicht aktualisiert wird.

> 🔧 Mit dem [Feishu-SAML-SSO-Helfer](../tools/feishu-saml.md) können Sie: die IdP-Metadata mit einem Klick in die oben genannten, manuell einzutragenden Felder parsen (das Zertifikat wird automatisch von den Kopf-/Fußzeilen befreit); und umgekehrt die SP-Metadata von Feishu erzeugen, um sie an den IdP hochzuladen.

### Was Feishu dem IdP bereitstellt

Feishu **liefert keine** Metadata-Datei, sondern zeigt auf der SSO-Konfigurationsseite die kopierbare **Reply URL / Assertion URL (also ACS)** und die SP-Kennung an, die Sie manuell in den IdP einfügen. Wenn der IdP (z. B. Okta / Entra ID) den Import von SP-Metadata unterstützt, können Sie mit dem obigen Tool diese Parameter zu einer standardkonformen SP-Metadata zusammensetzen und dann hochladen.

### NameID und Benutzerabgleich

Feishu ordnet anhand der **NameID** in der SAML-Assertion einem Feishu-Benutzer zu, üblicherweise `emailAddress` (E-Mail) oder der Anmeldename. Stellen Sie sicher, dass der NameID-Wert in der IdP-Assertion mit dem entsprechenden Feld des Feishu-Mitglieds übereinstimmt, sonst gelingt die Anmeldung zwar, aber es kann kein Benutzer zugeordnet werden.

### Richtung B: Feishu als IdP — erst hier gibt es OIDC / Metadata

Umgekehrt, wenn man sich mit dem Feishu-Konto an anderen Systemen anmeldet, unterstützt die Feishu-Integrationsplattform reichhaltigere Protokolle (SAML, OIDC, OAuth2 usw.) und **kann Metadaten-Dokumente herunterladen**. Die Fähigkeit "Metadata-Download" tritt bei Feishu also **nur auf, wenn es als IdP auftritt, nicht als SP** — ein weiterer leicht zu verwechselnder Punkt.

## DingTalk

Bei DingTalk ist die Lage noch "unstandardisierter":

- **Bietet nativ weder standardkonformes SAML noch standardkonformes OIDC**. Der DingTalk-Login ist eine eigene OAuth2-Variante (`login.dingtalk.com/oauth2/auth` + private Benutzerinformations-Schnittstelle), die Felder (`userid` usw.) sind proprietär und müssen manuell auf Standard-Claims wie `sub` / `email` gemappt werden.
- **Nur Dedicated DingTalk (die dedizierte Version)** unterstützt die Annahme eines externen IdP: über den **impliziten OIDC-Modus**, mit gesetztem `id_token`, wobei die Benutzerzuordnung über `sub` im `id_token` erfolgt, und nur für Konten vom Typ SSO.
- Daher **fügt die Branche zur standardkonformen SAML/OIDC-Anbindung von DingTalk üblicherweise eine IDaaS-Middleware-Schicht** ein (Alibaba Cloud IDaaS, Zhuyun, Ningdun usw.) als Brücke: Die IDaaS stellt nach außen Standardprotokolle bereit und bindet nach innen über das private DingTalk-OAuth2 an.

## Gegenüberstellung in einem Satz

| Plattform (als SP) | Natives SAML | Natives Standard-OIDC | Metadata-Import | Praxis in der Realität |
|------|:--------:|:------------:|:----:|---------|
| **Feishu** | ✅ (Flaggschiff-Version) | ❌ | ❌ Felder manuell eintragen | SAML direkt konfigurieren, auf manuelle Zertifikatsrotation achten |
| **DingTalk** | ❌ | ❌ (nur privates OAuth2) | ❌ | meist über IDaaS-Brücke; dedizierte Version kann OIDC annehmen |

## Verwandte Tools und Dokumente

- [Feishu-SAML-SSO-Helfer](../tools/feishu-saml.md) — IdP-Metadata parsen / Feishu-SP-Metadata erzeugen
- [SAML-Metadata-Parser](../tools/saml-metadata.md) · [SAML-Response-Parser](../tools/saml-parse.md) · [X.509-Zertifikatsanalyse](../tools/cert.md)
- [SAML-2.0-Dokumentation](../saml/) · [OIDC-Dokumentation](../oidc/) · [OAuth-2.0-Dokumentation](../oauth2/)
