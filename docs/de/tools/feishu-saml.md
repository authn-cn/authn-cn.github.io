---
title: Feishu-SAML-SSO-Helfer
---

# Feishu-SAML-SSO-Helfer

Wenn Feishu als SP an einen Unternehmens-IdP angebunden wird, **unterstützt es nur SAML 2.0 und kann keine IdP-Metadata importieren** — die Felder müssen im Admin-Backend manuell eingetragen werden. Dieses Tool beseitigt die beiden Reibungspunkte dieses Hin und Her:

- **IdP-Metadata → Feishu-Felder parsen**: Fügen Sie die von Okta / Entra ID / ADFS / IDaaS exportierte Metadata ein, und die für Feishu benötigten Werte werden automatisch extrahiert: **Issuer, Login-Adresse, Logout-Adresse, NameID-Format** sowie das Public Certificate **ohne die `-----BEGIN/END-----`-Kopf- und Fußzeilen** (das Feishu-Feld akzeptiert nur nacktes base64).
- **Feishu-SP-Metadata erzeugen**: Die SP-Parameter von Feishu sind **pro Region fest** (China feishu.cn / Global / Singapur / Japan) und im Tool hinterlegt. Region wählen — **ACS URL / SP Entity ID** werden automatisch eingetragen und zu einer standardkonformen SP-Metadata (inklusive Zertifikat und NameIDFormat) zusammengesetzt, die Sie an einen IdP mit Importunterstützung hochladen können.

<ClientOnly>
  <FeishuSamlHelper />
</ClientOnly>

::: warning Falle bei der Zertifikatsrotation
Das Signaturzertifikat des IdP ist in Feishu **fest hinterlegt**. Nachdem der IdP sein Signaturzertifikat rotiert hat, muss dieses Zertifikat in Feishu **manuell aktualisiert** werden, sonst schlägt der Login ohne jede Vorwarnung fehl. Alle Berechnungen erfolgen lokal im Browser; Metadata und Zertifikat werden nicht hochgeladen.
:::

Zum vollständigen Hintergrund von Feishu-SP-SSO (warum nur SAML, Feldzuordnung, Unterschiede zu DingTalk) siehe [SSO-Anbindung chinesischer Plattformen](../cn-sso/). Zur allgemeinen Analyse der Metadata-Struktur siehe [SAML-Metadata-Parser](./saml-metadata.md).

<script setup>
import FeishuSamlHelper from '@components/FeishuSamlHelper.vue'
</script>
