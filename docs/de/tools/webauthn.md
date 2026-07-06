---
title: WebAuthn-Demo
---

# WebAuthn / Passkey Demo

Auf dieser Seite wird die WebAuthn-API des Browsers echte aufgerufen, um einen Passkey zu erstellen und zu verwenden, dekodiert die Anzeige der vom Browser zurückgegebenen `clientDataJSON`, `authenticatorData` (flags / signCount), attestation-Format und Credential-Öffentlichschlüssel (COSE). Erfordert Browser und Authentifizierer, die WebAuthn unterstützen (Plattform-Fingerabdruck / Face ID / Security Key). Reines Frontend, Daten werden nicht hochgeladen.

<ClientOnly>
  <WebauthnDemo />
</ClientOnly>

::: tip Kompletter serverseitiger Ablauf
Diese Seite zeigt nur Browser-seitige Datenstrukturen. Um den kompletten Registrierungs-/Anmeldungs-Loop mit **serverseitiger Signaturverifizierung** zu erleben, siehe die in sich geschlossene
[Mock WebAuthn RP](https://mock.authn.tech/webauthn/).
:::

Prinzipien siehe [WebAuthn Registrierungs- und Authentifizierungs-Ablauf](../webauthn/flows.md).

<script setup>
import WebauthnDemo from '@components/WebauthnDemo.vue'
</script>
