---
title: otpauth URI und Parametrerreferenz
---

# otpauth URI und Parametrerreferenz

Diese Seite ist ein Schnellreferenzhandbuch für OTP-Verteilung und Parameter: `otpauth://` URI-Format, Standard-Parameterwerte, QR-Code-Konventionen, Authenticator-Kompatibilität, Base32-Kodierungsregeln und Fehlersuchübersicht zu "Code stimmt nicht überein". Algoritmusdetails siehe [HOTP / TOTP Algorithmen im Detail](./totp.md).

## otpauth:// URI-Format

Authenticator-Apps (wie Google Authenticator) importieren den gemeinsamen Schlüssel über einen `otpauth://` URI. Dies ist ein De-facto-Standard (definiert von Google Authenticator und weit verbreitet). Der URI wird als QR-Code kodiert.

```
otpauth://TYPE/LABEL?secret=...&issuer=...&algorithm=...&digits=...&period=...&counter=...
```

Komponenten:

- **TYPE**: `totp` oder `hotp`, bestimmt den Typ des variablen Faktors.
- **LABEL**: Ein Anzeigenamen zur Kontoidentifikation, Format `issuer:account` (z.B. `Example:alice@example.com`). Vor dem Doppelpunkt ist der Aussteller, danach der Kontoname. LABEL muss URL-kodiert sein (Doppelpunkt kann als `%3A` geschrieben werden, Leerzeichen als `%20`).
- **Query-Parameter**: Schlüssel und optionale Algorithmusparameter, siehe Tabelle unten.

Komplettes Beispiel:

```
otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&algorithm=SHA1&digits=6&period=30
```

HOTP-Beispiel (beachten Sie `counter` statt `period`):

```
otpauth://hotp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&counter=0
```

## Parametertabelle und Standardwerte

| Parameter | Anwendungstyp | Erforderlich | Erlaubte Werte | Standardwert | Beschreibung |
|------|----------|----------|--------|--------|------|
| `secret` | totp/hotp | **Erforderlich** | Base32-Zeichenkette | Keine | Gemeinsamer Schlüssel, RFC 4648 Base32, Großbuchstaben, ohne Füllung |
| `issuer` | totp/hotp | Dringend empfohlen | Zeichenkette | Keine | Aussteller, sollte sowohl im LABEL-Präfix als auch in diesem Parameter vorkommen und kongruent sein |
| `algorithm` | totp/hotp | Optional | `SHA1` / `SHA256` / `SHA512` | `SHA1` | HMAC-Hash-Algorithmus |
| `digits` | totp/hotp | Optional | `6` / `8` | `6` | Anzahl der generierten Code-Ziffern |
| `period` | **totp** | Optional | Positive ganze Zahl (Sekunden)| `30` | Zeitschrittweite, nur TOTP |
| `counter` | **hotp** | HOTP erforderlich | Nicht-negative ganze Zahl | Keine | Anfänglicher Zähler, nur HOTP |

::: tip issuer-Konsistenz an zwei Stellen
Best Practice ist, dass `issuer` sowohl als LABEL-Präfix (`Example:alice@...`) als auch als unabhängiger `issuer=Example` Parameter vorkommt, und die beiden Zeichenketten übereinstimmen. Damit kann die App den Aussteller korrekt anzeigen, selbst wenn sie nur einen der beiden ausliest, und verhindert Verwechslungen bei gleichnamigen Konten.
:::

## QR-Code-Kodierungskonventionen

- Kodieren Sie den kompletten `otpauth://` URI (reinen Text) als QR-Code, Benutzer scannen den Code mit der Authenticator-App zum Importieren.
- Fehlerkorrektur-Level wird normalerweise auf **M** (mittel) gesetzt; bei längeren URIs mit längeren Schlüsseln kann **L** gewählt werden, um die Grafik zu verkleinern.
- QR-Code sollte nur bei Bindung angezeigt werden, **sollte nicht dauerhaft gespeichert oder zwischengespeichert werden**, sollte nach der Anzeige aus dem Speicher gelöscht werden; Vermeiden Sie Vorkommen in Logs, Screenshots, CDN-Cache.
- Stellen Sie auch die Schlüsselzeichenkette (Base32) bereit, um manuelle Eingabe zu ermöglichen, wenn Scannen nicht geht.

## Kompatibilität großer Authenticator-Apps

| App | Nicht-Standard-algorithm (SHA256/512)| digits=8 | Benutzerdefiniertes period | Bemerkungen |
|-----|------|------|------|------|
| Google Authenticator | Frühere Versionen ignorieren oft, behandeln als SHA1 | Unstabile Unterstützung | Unstabile Unterstützung | Konservativste Kompatibilität, empfohlen nur Standardwerte |
| Microsoft Authenticator | Teilweise Unterstützung | Teilweise Unterstützung | Teilweise Unterstützung | Standardkombination am sichersten |
| Authy | Gute Unterstützung | Unterstützt | Unterstützt | Höhere Parametertolleranz |
| FreeOTP / andOTP | Gute Unterstützung | Unterstützt | Unterstützt | Open-Source-Implementierung, vollständige Parameter |
| 1Password | Gute Unterstützung | Unterstützt | Unterstützt | — |

::: danger Interoperabilität Hauptprinzip
Ohne starke Sicherheitsanforderungen, halten Sie sich an die **SHA1 / 6-stellig / 30-Sekunden** Standard-Kombination. Viele Apps (besonders frühere Google Authenticator) **ignorieren stillschweigend** `algorithm`-, `digits`- und `period`-Parameter und berechnen immer nach Standard — in diesem Fall stimmen die von der App generierten Codes niemals mit Ihren Server-Codes überein (wenn Sie SHA256/8-stellig berechnen), und es gibt keine Fehlermeldung, extrem schwer zu debuggen.
:::

## Base32-Kodierungsbeschreibung (RFC 4648)

Der `secret` verwendet Base32-Kodierung mit folgende Konventionen:

- **Alphabet**: `A–Z` + `2–7`, 32 Zeichen insgesamt (ohne `0`, `1`, `8`, `9`, um Verwechslungen mit Buchstaben zu vermeiden).
- **Großbuchstaben**: Authenticator zeigt und gibt Großbuchstaben ein; beim Dekodieren sollte Groß-/Kleinschreibung ignoriert werden.
- **Keine Füllung**: otpauth-Szenarien **entfernen Padding-`=` am Ende**.
- **Kodierungseinheit**: Jedes 5-Bit-Symbol wird auf ein Zeichen abgebildet, daher kodieren 8 Zeichen 5 Bytes.
- **Empfohlene Länge**: Schlüssel mindestens 160 Bit (20 Bytes) = 32 Base32-Zeichen.

```
Bytes (5)  : 0x48 0x65 0x6C 0x6C 0x6F
Base32    : JBSWY3DP
```

## Standard-Parameterwerte Übersicht

| Element | Standard |
|----|------|
| TYPE | totp |
| algorithm | SHA1 |
| digits | 6 |
| period | 30 Sekunden |
| T0 (Zeit-Bezugspunkt)| 0 (Unix-Epoche)|
| Verifikations-Toleranzfenster | ±1 Schritt (etwa ±30 Sekunden)|
| secret-Kodierung | Base32, Großbuchstaben, keine Füllung |
| secret-Länge | ≥160 Bit (20 Bytes)|

## Fehlersuche Schnellübersicht: Code stimmt nicht überein

Überprüfen Sie nach Häufigkeit:

| Symptom / Ursache | Erkennungsmethode | Lösung |
|------|----------|------|
| **Zeittaktabweichung Client** | Häufigste Ursache. Geräteuhr ungenau oder Zeitzone/Autosync ist aus | "Automatische Zeiteinstellung" auf dem Gerät einschalten; Server kann temporär window vergrößern zur Diagnose |
| **Server-Zeittaktabweichung** | Server nicht mit NTP synchronisiert | NTP bereitstellen; verwenden Sie Standard-Test-Vektoren zur Selbstprüfung |
| **Schlüssel-Kodierungsfehler** | Base32 als rohe Bytes oder umgekehrt bei Speicherung/Abruf | Verdeutlichen Sie die Schlüsseldarstellung an drei Positionen: Datenbank, URI, HMAC-Eingabe; HMAC-Eingabe muss **dekodierte rohe Bytes** sein |
| **Base32 Füllung/Groß-/Kleinschreibung** | secret enthält `=` oder Kleinbuchstaben, App-Parse-Fehler | Entfernen Sie Füllung, konvertieren Sie zu Großbuchstaben vor URI |
| **Algorithmus/Ziffern-Mismatch** | Server benutzt SHA256 oder 8-stellig, aber App ignoriert Parameter und berechnet SHA1/6-stellig | Vereinigen Sie auf Standard SHA1/6-stellig; oder verwenden Sie App mit höherer Parametertolleranz |
| **period Inkonsistenz** | Server period nicht gleich URI, oder App ignorierte benutzerdefiniertes period | Vereinigen Sie auf 30 Sekunden |
| **Counter Desynchronisierung (HOTP)** | Benutzer betätigt Token versehentlich, counter springt vor | Server setzt Look-ahead-Fenster, synchronisiert counter nach Treffer |
| **Toleranzfenster nicht implementiert** | Vergleicht nur aktuellen Zeitschritt, scheitert über Fenstergrenze | Verifikation prüft ±1 Schritt |
| **Wiedergabe-Blockierungs-Fehlurteil** | Wiedergabe-Logik lehnt legitime erste Verwendung als Wiedergabe ab | Überprüfen Sie "letzter verwendeter Zeitschritt" Aufzeichnungslogik |
| **counter/period Feldverwechslung** | HOTP fällt period fälschlicherweise ein oder TOTP fällt counter fälschlicherweise ein | Verwenden Sie entsprechenden Parameter basierend auf TYPE |

::: tip Selbstprüfungsempfehlung
Überprüfen Sie Ihre Server-Implementierung mit HOTP-Test-Vektoren aus RFC 4226 Anhang D (Schlüssel `"12345678901234567890"`, counter 0 → `755224`) und TOTP-Test-Vektoren aus RFC 6238 Anhang B, um schnell festzustellen, ob das Problem in der Algorithmus-Implementierung oder in der Konfiguration/Zeitsynchronisation liegt.
:::

Zurück: [MFA Überblick](./README.md) · [Algorithmen Detail](./totp.md)
