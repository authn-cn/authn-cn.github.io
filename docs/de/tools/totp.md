---
title: TOTP-Tool
---

# TOTP-Code-Generator / Verifizierungstool

Generieren Sie TOTP-Geheimschlüssel (Base32), berechnen Sie in Echtzeit den aktuellen Verifizierungscode und Countdown, generieren Sie `otpauth://` URI und QR-Code (können mit Google Authenticator / Authy usw. gescannt werden), und validieren Sie einen Verifizierungscode. Alles wird lokal im Browser berechnet, der Schlüssel wird nicht hochgeladen.

Zum Entwickler-Debuggen bietet auch:

- **QR-Code-Import** — Laden Sie eine `otpauth://` QR-Code-Bilddatei (lokale `jsQR`-Decodierung) oder fügen Sie direkt `otpauth://` URI ein, Felder werden automatisch ausgefüllt.
- **Als Lesezeichen speichern** — "In die Adressleiste" kodiert die aktuelle TOTP in das URL-Fragment (`#t=…`), drücken Sie <kbd>Strg</kbd>+<kbd>D</kbd> um zu speichern, nächstes Mal öffnen Sie das Lesezeichen stellt die Einstellungen automatisch wieder her; können auch den Bookmark-Link kopieren.
- **Lokale Liste** — "In lokale Liste speichern" speichert mehrere TOTPs in Browser `localStorage`, jeder Listeneintrag generiert Code in Echtzeit, können Verifizierungscode mit einem Klick kopieren, bearbeiten oder löschen. Praktisch zum gleichzeitigen Debuggen mehrerer Konten.

::: warning Sicherheitsmitteilung
Bookmark-Links und lokale Listen speichern **Geheimschlüssel im Klartext** (in URL / Lesezeichen / localStorage), nur zum Testen von Schlüsseln, bitte speichern Sie nicht TOTP-Schlüssel aus der Produktionsumgebung.
:::

<ClientOnly>
  <TotpTool />
</ClientOnly>

::: tip Mock-Zusammenarbeit
Die [Mock TOTP Verifizierungstelle](https://mock.authn.tech/totp/) dieses Standorts kann mit demselben Schlüssel Server-seitig Code berechnen / validieren:
`curl "https://mock.authn.tech/totp/code?secret=<dein_secret>"`
:::

Prinzipien siehe [HOTP / TOTP Algorithmus Detail-Erklärung](../mfa/totp.md).

<script setup>
import TotpTool from '@components/TotpTool.vue'
</script>
