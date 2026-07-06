---
title: Parameter- und Datenstruktur-Referenz
---

# Parameter- und Datenstruktur-Referenz

Diese Seite ist eine Feldebenen-Schnellansicht. Konzeptionische Erklärungen siehe [Kernkonzepte](./concepts.md), Verwendung siehe [Ablauf](./flows.md). Sofern nicht anders angegeben, sind binäre Felder im Browser-API `ArrayBuffer`/`BufferSource`, in JSON-Übertragung vertragt sich auf **Base64URL (kein Padding)** Kodierung.

## PublicKeyCredentialCreationOptions (Registrierung)

Übergeben an `navigator.credentials.create({ publicKey })`.

| Feld | Typ | Erforderlich | Beschreibung |
|------|------|------|------|
| `rp` | Objekt | Ja | RP-Information. `rp.id` ist rpId (Standard ist gültige Domäne der aktuellen Origin), `rp.name` ist Anzeigename. |
| `user` | Objekt | Ja | `user.id` (binär, Benutzer opaque Handle, keine PII wie E-Mail), `user.name` (Anmeldename), `user.displayName` (Anzeigename). |
| `challenge` | BufferSource | Ja | Einmalige Zufalls-Herausforderung, ≥ 16 Bytes. |
| `pubKeyCredParams` | Array | Ja | Von RP akzeptierte Algorithmen, nach Priorität, jeder Eintrag `{ type: "public-key", alg }`, `alg` ist COSE-Kennung (siehe unten). |
| `timeout` | number | Nein | Millisekunden, empfohlen 60000. Nur Hinweis, Browser kann ignorieren. |
| `excludeCredentials` | Array | Nein | Bereits registrierte Anmeldedaten-Liste, verhindert Doppel-Registrierung auf demselben Authentifizierer. Jeder Eintrag `{ type, id, transports? }`. |
| `authenticatorSelection` | Objekt | Nein | Authentifizierer-Filter, siehe unten. |
| `attestation` | string | Nein | `none` (Standard/empfohlen), `indirect`, `direct`, `enterprise`. |
| `extensions` | Objekt | Nein | Erweiterungen, z.B. `credProps` (bericht ob resident key erstellt wurde). |

### authenticatorSelection Unterfelder

| Feld | Wert | Beschreibung |
|------|------|------|
| `authenticatorAttachment` | `platform` / `cross-platform` | Begrenzen auf Plattform-Authentifizierer oder Roaming-Sicherheitsschlüssel; weglassen = keine Begrenzung. |
| `residentKey` | `required` / `preferred` / `discouraged` | Erkennbare Anmeldedaten erstellen (Passkey). `required` erzwingt Residenz. |
| `requireResidentKey` | boolean | Altes Feld, zur Kompatibilität behalten; `true` entspricht `residentKey: "required"`. |
| `userVerification` | `required` / `preferred` / `discouraged` | Benutzerverifizierung (UV) erforderlich. |

## PublicKeyCredentialRequestOptions (Authentifizierung)

Übergeben an `navigator.credentials.get({ publicKey })`.

| Feld | Typ | Erforderlich | Beschreibung |
|------|------|------|------|
| `challenge` | BufferSource | Ja | Einmalige Zufalls-Herausforderung. |
| `timeout` | number | Nein | Millisekunden, Hinweis. |
| `rpId` | string | Nein | RP-Kennung, Standard ist gültige Domäne der aktuellen Origin; muss bei Registrierung konsistent sein. |
| `allowCredentials` | Array | Nein | Zulässige Anmeldedaten-Liste `{ type, id, transports? }`. Bei namenloser Passkey-Anmeldung leer lassen. |
| `userVerification` | string | Nein | `required` / `preferred` / `discouraged`. |
| `extensions` | Objekt | Nein | Authentifizierungs-Erweiterungen. |

## clientDataJSON

Von **Browser** erzeugt JSON (als UTF-8 Bytes zurückgegeben), Seiten-JS kann nicht manipulieren.

| Feld | Beschreibung |
|------|------|
| `type` | Registrierung ist `"webauthn.create"`, Authentifizierung ist `"webauthn.get"`. |
| `challenge` | Base64URL-Kodierung von RP-ausgegebener Herausforderung. |
| `origin` | Vollständige Origin der Anfrage-Seite, z.B. `https://login.example.com`. |
| `crossOrigin` | Ob in Cross-Origin iframe ausgelöst, normalerweise `false`. |
| `topOrigin` | Nur wenn `crossOrigin` ist `true`, oberste Level Origin. |

Beispiel:

```json
{
  "type": "webauthn.get",
  "challenge": "YXV0aC1jaGFsbGVuZ2UtcmFuZG9t",
  "origin": "https://login.example.com",
  "crossOrigin": false
}
```

## authenticatorData Struktur

Binäre Daten, sowohl bei Registrierung als auch Authentifizierung zurückgegeben (bei Registrierung in `attestationObject` verpackt). Byte-Layout:

| Offset | Länge | Feld | Beschreibung |
|------|------|------|------|
| 0 | 32 B | `rpIdHash` | `SHA-256(rpId)`, RP muss überprüfen. |
| 32 | 1 B | `flags` | Bit-Flaggen, siehe unten. |
| 33 | 4 B | `signCount` | Big-Endian 32-Bit Signatur-Zähler. |
| 37 | Variabel | `attestedCredentialData` | Nur wenn `AT` Bit 1 ist (Registrierung), enthält AAGUID (16B), credentialId Länge (2B), credentialId, credentialPublicKey (COSE). |
| Danach | Variabel | `extensions` | Nur wenn `ED` Bit 1, CBOR kodiert. |

### flags Bit-Definition

| Bit | Name | Bedeutung |
|----|------|------|
| Bit 0 (0x01) | `UP` | User Present (Benutzer anwesend). |
| Bit 2 (0x04) | `UV` | User Verified (Benutzer verifiziert, Multi-Faktor). |
| Bit 3 (0x08) | `BE` | Backup Eligible (Anmeldedaten können gesichert/synchronisiert werden). |
| Bit 4 (0x10) | `BS` | Backup State (Anmeldedaten derzeit gesichert/synchronisiert). |
| Bit 6 (0x40) | `AT` | Attested credential data included (Registrierung auf 1 setzen). |
| Bit 7 (0x80) | `ED` | Extension data included. |

::: tip
`BE`/`BS` unterscheiden **synchronisierte Passkeys** (geräteübergreifend) von **gerätebindenden Anmeldedaten**. Wenn Geschäftsanforderung ist, dass Anmeldedaten nicht das Gerät verlassen können, überprüfen Sie `BE=0`.
:::

## COSE Algorithmus-Kennungen

`pubKeyCredParams[].alg` verwendet COSE Algorithm-Werte (IANA registriert, alle negativ):

| alg | Name | Beschreibung | Empfehlung |
|-----|------|------|------|
| `-7` | ES256 | ECDSA + P-256 + SHA-256 | Erste Wahl, fast alle Authentifizierer |
| `-8` | EdDSA | Ed25519 | Falls unterstützt, optional, gute Leistung |
| `-35` | ES384 | ECDSA + P-384 + SHA-384 | Selten |
| `-36` | ES512 | ECDSA + P-521 + SHA-512 | Selten |
| `-257` | RS256 | RSASSA-PKCS1-v1_5 + SHA-256 | Älter TPM/Windows Hello kompatibel, empfohlen mit bereitgestellt |
| `-258` | RS384 | RSASSA-PKCS1-v1_5 + SHA-384 | Sehr selten |
| `-259` | RS512 | RSASSA-PKCS1-v1_5 + SHA-512 | Sehr selten |
| `-37` | PS256 | RSASSA-PSS + SHA-256 | Einige TPM |

::: tip
In der Praxis reicht die Bereitstellung von `[-7, -257]` für fast alle Authentifizierer: `-7` (ES256) deckt moderne Plattformen und Sicherheitsschlüssel ab, `-257` (RS256) ist mit einigen Windows Hello / TPM Szenarien kompatibel.
:::

## Fehlerbehebelts-Schnellansicht-Tabelle

| Symptom / Fehler | Häufige Ursache | Verarbeitung |
|-------------|----------|------|
| `SecurityError` (create/get) | `rp.id`/`rpId` ist nicht gültige Domäne der aktuellen Origin; nicht HTTPS (außer localhost) | rpId zu registrierbarer Domäne korrigieren; HTTPS verwenden |
| `NotAllowedError` | Benutzer abgebrochen, Timeout, oder Origin/Berechtigungsrichtlinie nicht erlaubt | Wiederholung vorschlagen; `timeout` und `Permissions-Policy: publickey-credentials-*` überprüfen |
| `InvalidStateError` (Registrierung) | Dieser Authentifizierer bereits registriert (trifft `excludeCredentials`) | "Dieses Gerät ist bereits registriert" vorschlagen, zur Anmeldung führen |
| `ConstraintError` | `residentKey: required` oder UV-Anforderung Authentifizierer kann nicht erfüllen | Zu `preferred` lockern oder Authentifizierer wechseln |
| Server Challenge stimmt nicht überein | Challenge nicht gespeichert/abgelaufen; Base64URL Dekodierungsfehler | Server speichert und bindet Sitzung; Base64URL bestätigen |
| Server Origin Überprüfung fehlgeschlagen | Whitelist fehlt diese Origin; Protokoll/Port inkonsistent | Zulässiges Origin-Set genau konfigurieren |
| Signatur-Validierung fehlgeschlagen | Signatur-Datenkettungsfehler (sollte `authData ‖ SHA-256(clientDataJSON)` sein); Algorithmus nicht konsistent mit gespeichert; ECDSA-Signatur ist DER kodiert braucht richtiges Parsing | Signatur-Prozess überprüfen, bevorzugt etablierte Bibliothek verwenden |
| `signCount` immer 0 | Synchronisierte Passkey / Einige Plattform-Authentifizierer | Normal ansehen, nicht danach ablehnen |
| Base64URL verworrene Zeichen | Mit Standard-Base64 gemischt `+//=` | Base64URL ohne Padding Kodierung vereinheitlichen |

Verwandte Lesungen: [Übersicht](./README.md) · [Kernkonzepte](./concepts.md) · [Registrations- und Authentifizierungsablauf](./flows.md). Multi-Faktor und Verbund-Anmeldung siehe [../mfa/](../mfa/), [../oidc/](../oidc/).
