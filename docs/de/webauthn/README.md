---
title: WebAuthn Übersicht
---

# WebAuthn Übersicht

## Was ist WebAuthn

**WebAuthn (Web Authentication)** ist ein von W3C festgelegter Browser-Standard-API, der es Web-Anwendungen ermöglicht, **Public-Key-Kryptographie** zur Registrierung und Anmeldung anstelle von traditionellen Passwörtern zu verwenden. Es ist Teil des **FIDO2**-Projekts der FIDO Alliance:

- **WebAuthn**: W3C-Standard, definiert die Schnittstelle zwischen Browser und Web-Anwendung (JavaScript), d.h. `navigator.credentials.create()` und `navigator.credentials.get()`.
- **CTAP (Client to Authenticator Protocol)**: FIDO Alliance Standard, definiert das Kommunikationsprotokoll zwischen Client (Browser/Betriebssystem) und externem **Authenticator (Authentifizierer)** (z.B. USB-, NFC-, Bluetooth-verbundene Sicherheitsschlüssel).

WebAuthn + CTAP2 zusammen werden **FIDO2** genannt. Für Web-Ingenieure ist die tägliche Arbeit hauptsächlich mit der WebAuthn-API, wobei CTAP von Browser und Betriebssystem auf niedriger Ebene behandelt wird.

## Welche Probleme werden gelöst

Traditionelle Passwörter haben strukturelle Mängel: Sie können zum Phishing verwendet werden, sind anfällig für Brute-Force-Attacken und können nach einer Serveroffenlegung wiederverwendet werden. WebAuthn löst diese Probleme durch folgende Designs:

- **Passwortlos / Multi-Faktor-Authentifizierung**: Der private Schlüssel wird im Authentifizierer gespeichert und verlässt das Gerät nie; der Server speichert nur den öffentlichen Schlüssel. Selbst wenn die Datenbank kompromittiert ist, ist ein Login unmöglich.
- **Phishing-Resistenz**: Anmeldedaten sind an **origin (Quelle)** gebunden. Eine für `bank.com` registrierte Anmeldedaten funktioniert nicht auf `bank.evil.com`. Der Browser erzwingt die Validierung auf Protokollebene und Benutzer können nicht "betrogen" zur Offenlegung von Anmeldedaten werden.
- **Schutz vor Replay-Angriffen**: Jede ceremony (Zeremonie) verwendet einen einmaligen **challenge (Herausforderung)** vom Server. Das Signaturobjekt kann nicht wiedergespielt werden.

::: tip
"Phishing-Resistenz" ist der Kernvorteil von WebAuthn gegenüber SMS-Codes und TOTP-Einmal-Passwörtern: Letztere können von Man-in-the-Middle-Phishing-Websites in Echtzeit weitergeleitet werden, während die Origin-Bindung von WebAuthn diese Angriffe auf kryptographischer Ebene blockiert.
:::

## Was ist Passkey

**Passkey (Durchgangschlüssel)** ist der von der FIDO Alliance und großen Plattformanbietern geprägte **Markenname auf Verbraucherebene** für WebAuthn-Anmeldedaten. Technisch ist es eine Art **discoverable credential (erkennbare Anmeldedaten, auch resident key genannt)** und hat normalerweise **geräteübergreifende Synchronisierungsfähigkeit**.

- **Erkennbar**: Anmeldedaten zusammen mit Benutzerinformationen werden im Authentifizierer gespeichert. Bei der Anmeldung braucht ein Benutzername nicht vorab eingegeben werden – der Authentifizierer kann direkt verfügbare Konten "erkennen" und auflisten, um **username-less (namenslose)** Anmeldung zu ermöglichen.
- **Synchronisierbar**: Plattformen (wie Apple iCloud Keychain, Google Password Manager, Windows Hello) synchronisieren Passkeys zwischen Geräten mit demselben Konto mit Ende-zu-Ende-Verschlüsselung und verhindern so "Anmeldedaten verlieren beim Gerätewechsel".

Die Beziehung zwischen Passkey und WebAuthn:

| Konzept | Positionierung |
|------|------|
| WebAuthn | W3C-Technologiestandard und Browser-API |
| Passkey | Verbraucherorientiertes Produktkonzept, zugrunde liegende erkennbare WebAuthn-Anmeldedaten |
| Synced Passkey (synchronisiert) | Cloud-Synchronisierung, geräteübergreifend, hohe Komfort |
| Gerätebindung (device-bound) | Bleibt auf einem einzelnen Gerät (z.B. Hardware-Sicherheitsschlüssel), höhere Angriffsresistenz |

::: warning
Code-weise sind die API-Aufrufe zur Registrierung synchronisierter Passkeys und traditioneller WebAuthn-Anmeldedaten nahezu identisch, mit Unterschieden hauptsächlich in Parametern wie `authenticatorSelection.residentKey`. Nehmen Sie nicht an, dass Passkeys immer "an ein einzelnes Gerät gebunden" sind; synchronisierte Passkeys können auf mehreren Geräten erscheinen.
:::

## Drei große Rollen

1. **Relying Party (RP, abhängige Partei)**: Deine Web-Anwendung und deren Server. Die RP ist verantwortlich für die Erzeugung von Herausforderungen, die Ausgabe von Optionen, die Validierung der vom Authentifizierer zurückgegebenen Attestationen/Assertions und die Speicherung des öffentlichen Schlüssels des Benutzers. Die RP wird durch **rpId** identifiziert (normalerweise ein gültiger Domänenname wie `example.com`).
2. **Authenticator (Authentifizierer)**: Die Entität, die den privaten Schlüssel hält und kryptographische Signaturen ausführt. Sie ist in zwei Kategorien unterteilt:
   - **Platform authenticator (Plattform-Authentifizierer)**: Im Gerät integriert, wie Touch ID / Face ID, Windows Hello, Android-Fingerabdruck.
   - **Roaming authenticator (Roaming-Authentifizierer)**: Externe Sicherheitsschlüssel für den Einsatz über Geräte hinweg, wie YubiKey, verbunden über USB/NFC/BLE.
3. **Client / Browser**: Browser und Betriebssystem, die die WebAuthn-API tragen. Zuständig für die Validierung der Origin, das Zusammenstellen von `clientDataJSON`, die Kommunikation mit dem Authentifizierer über CTAP und die Weitergabe zwischen RP und Authentifizierer.

Datenfluss-Übersicht:

```
RP-Server  <--HTTPS-->  Browser (WebAuthn API)  <--CTAP-->  Authentifizierer
   |                          |                              |
Herausforderung ausgeben   Origin validieren/Daten      Schlüsselpaar generieren/unterzeichnen
Signatur validieren         Credential zurückgeben      Private Schlüssel bleiben im Gerät
```

## Beziehung und Positionierung zu Passwort / TOTP / OIDC

| Mechanismus | Typ | Phishing-resistent | Serveroffenlegungsrisiko | Beziehung zu WebAuthn |
|------|------|--------|----------------|------------------|
| Passwort password | Gemeinsamer Erinnerungsschlüssel | Nein | Hoch (Hash kann Offline-Brute-Force) | Wird ersetzt |
| TOTP (z.B. Google Authenticator) | Zeit-basiertes Einmal-Passwort | Nein (Real-Zeit-Phishing möglich) | Mittel (Samendateien verlieren Wirkung) | Als zweiter Faktor, kann durch WebAuthn ersetzt oder ergänzt werden |
| SMS-Verifizierungscode | Out-of-Band-Einmal-Passwort | Nein | Mittel (SIM-Swap) | Kann durch WebAuthn ersetzt werden |
| WebAuthn / Passkey | Public-Key-Challenge-Response | Ja | Niedrig (nur öffentliche Schlüssel gespeichert) | Dieses Kapitel |
| OIDC (OpenID Connect) | Verbundenes Identitätsprotokoll | Hängt vom IdP ab | — | Komplementär: WebAuthn wird häufig als Authentifizierungsmittel **innerhalb des IdP** verwendet |

::: tip
WebAuthn und OIDC konkurrieren nicht. In typischen Architekturen authentifiziert der Identitätsprovider (IdP) Benutzer intern mit WebAuthn/Passkey und stellt ID Tokens über OIDC für Geschäftsanwendungen aus. Siehe [../oidc/](../oidc/). Für das Gesamtdesign der Multi-Faktor-Authentifizierung siehe [../mfa/](../mfa/).
:::

## Anwendbare Szenarien

- **Passwortlose Anmeldung**: Passwörter vollständig durch Passkeys ersetzen, kombiniert mit erkennbaren Anmeldedaten für namenslose Anmeldung.
- **Starker zweiter Faktor (2FA)**: Fügen Sie über Passwörtern einen Anti-Phishing-Hardware-/Plattform-Authentifizierer hinzu und ersetzen Sie TOTP und SMS.
- **Zweite Bestätigung für hochwertige Operationen**: Erfordern Sie eine WebAuthn-Authentifizierung vor sensiblen Operationen wie Überweisungen und Sicherheitseinstellungsänderungen (Step-up).
- **Enterprise-Intranet / Zero Trust**: Verwenden Sie Roaming-Sicherheitsschlüssel für gerätunabhängige starke Authentifizierung.

## Kapitelnavigation

- [Kernkonzepte](./concepts.md) – Public-Key-Anmeldedaten-Modell, Attestation/Assertion, Challenge, Origin-Bindung, UV/UP und andere Begriffe.
- [Registrations- und Authentifizierungsablauf](./flows.md) – Vollständige schrittweise Durchgangsreife, JS/JSON-Beispiele und Server-Validierungscheckliste.
- [Parameter- und Datenstruktur-Referenz](./reference.md) – Options-Feldtabelle, `clientDataJSON`, `authenticatorData`-Struktur, COSE-Algorithmentabelle und Fehlerbehebungs-Schnellansicht.
