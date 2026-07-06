---
title: MFA und Einmalpasswörter im Überblick
---

# MFA und Einmalpasswörter im Überblick

Multi-Faktor-Authentifizierung (Multi-Factor Authentication, MFA) stärkt die Sicherheit durch die Anforderung von zwei oder mehr **voneinander unabhängigen** Authentifizierungsfaktoren zur Identitätsbestätigung und bietet damit Verteidigungsmechanismen in der Tiefe gegen kompromittierte Passwörter. Dieses Kapitel konzentriert sich auf die häufigste Form des zweiten Faktors in der Praxis — das Einmalpasswort (One-Time Password, OTP) — mit Fokus auf die Algorithmen HOTP und TOTP.

## Was ist MFA

Die grundlegende Schwäche der reinen Passwortauthentifizierung liegt darin, dass Passwörter **statisch** und **kopierbar** sind. Einmal durch Datenbanklecks, Phishing, Datenbankleaks oder Keylogging gestohlen, können Angreifer sie unbegrenzt wiederholen. MFA verfolgt den Ansatz, Authentifizierungsfaktoren aus verschiedenen **Kategorien** zu kombinieren, sodass Angreifer mehrere unabhängige Kanäle gleichzeitig kompromittieren müssen.

### Drei Kategorien von Authentifizierungsfaktoren

Authentifizierungsfaktoren werden traditionell in drei Kategorien eingeteilt. MFA setzt voraus, dass die verwendeten Faktoren aus **verschiedenen Kategorien** stammen (zwei Passwörter gelten nicht als echte MFA):

| Kategorie | Englisch | Bedeutung | Typische Beispiele |
|------|------|------|----------|
| Wissen (Knowledge)| something you know | Ein vom Benutzer auswendig gelerntes Geheimnis | Passwort, PIN, Sicherheitsfrage |
| Besitz (Possession)| something you have | Ein vom Benutzer besessenes Gerät oder Objekt | TOTP-Authenticator-App, Hardware-Token, Mobiltelefon (SMS/Push), FIDO-Sicherheitsschlüssel |
| Eigenschaft (Inherence)| something you are | Eine biometrische Eigenschaft des Benutzers | Fingerabdruck, Gesicht, Iris, Stimme |

::: tip
Die Kombination "Wissen + Besitz" ist derzeit die dominierende MFA-Konstellation: Passwort (Wissen) + TOTP-Authenticator-App (Besitz). Das OTP in diesem Kapitel gehört zur Kategorie "Besitz" — es bestätigt, dass der Benutzer das Gerät mit dem gemeinsamen Schlüssel besitzt.
:::

## Welche Probleme löst OTP

Ein Einmalpasswort (OTP) ist ein **dynamisches Passwort, das nur einmal verwendet und schnell abläuft**. Im Vergleich zu statischen Passwörtern liegt sein Wert in folgendem:

1. **Schutz vor Wiedergabe**: Jedes OTP ist nur für ein sehr kurzes Zeitfenster gültig (TOTP typischerweise 30 Sekunden). Selbst wenn es abgefangen wird, ist das Wiedergabefenster für Angreifer minimal.
2. **Nicht vorhersehbar**: OTP wird durch einen kryptografischen Algorithmus basierend auf einem gemeinsamen Schlüssel erzeugt. Angreifer können die nächste OTP nicht aus früheren Werten ableiten.
3. **Offline-Generierung**: Berechnung basierend auf dem lokalen gemeinsamen Schlüssel, kein Netzwerk-Roundtrip erforderlich, unabhängig von SMS-Kanälen (SMS-OTP birgt Risiken wie SIM-Entführung).

Es gibt zwei standardisierte OTP-Algorithmen, beide von der IETF definiert und mit demselben dynamischen Kürzungsalgorithmus:

- **HOTP** (HMAC-based One-Time Password, RFC 4226): basierend auf einem **inkrementierenden Zähler**.
- **TOTP** (Time-based One-Time Password, RFC 6238): basierend auf der **aktuellen Zeit**, eine zeitgebundene Variante von HOTP.

## Beziehung und Unterschied zwischen HOTP und TOTP

TOTP ist kein unabhängiger Algorithmus, sondern ersetzt den "Zähler" von HOTP durch "Zeitschritte". Ihre Beziehung lässt sich wie folgt zusammenfassen:

```
TOTP(K) = HOTP(K, T), wobei T = floor((aktuelle Unix-Zeit - T0) / period)
```

Mit anderen Worten: HOTP ist die Grundlage, TOTP ändert den variablen Faktor von "Zähler" zu "Zeitscheiben-Nummer".

| Dimension | HOTP(RFC 4226)| TOTP(RFC 6238)|
|------|------|------|
| Variabeler Faktor | Ereigniszähler counter | Zeitschritt T |
| Wann ändert sich | Bei jeder Generierung inkrementiert sich counter | Ändert sich automatisch alle Zeitschritte (standard 30 Sekunden) |
| Serverseitiger Zustand | Zähler muss persistiert und synchronisiert werden | Nur Schlüssel erforderlich, keine Zählerspeicherung |
| Desynchronisierungsrisiko | Client- und Server-Zähler können nicht synchronisiert sein, erfordert Look-ahead-Fenster | Nur Taktabweichungen |
| Gültigkeitsdauer | Gültig bis zur nächsten Verwendung | Nur im aktuellen Zeitschritt (+ Fehlertoleranzmarge) |
| Typische Verwendung | Hardware-Token Tastendruck, Offline-Szenarien | Authenticator-App, die überwiegende Mehrheit der Online-MFA |

::: warning
Die Zählersynchronisierung bei HOTP ist eine technische Herausforderung: Ein Benutzer könnte versehentlich den Token aktivieren und den Zähler voranbringen, der Server muss ein "Look-ahead-Fenster" setzen. TOTP ersetzt den Zähler durch Zeit und umgeht dieses Problem von Natur aus. Daher verwenden Online-Services fast universell TOTP.
:::

## TOTP in der Praxis

TOTP ist derzeit der am meisten eingesetzte Software-Zweitfaktor:

- **Authenticator-Apps**: Google Authenticator, Microsoft Authenticator, Authy, 1Password, FreeOTP etc. implementieren alle TOTP und importieren gemeinsame Schlüssel durch QR-Code-Scan.
- **Login-Integration**: In OIDC (OpenID Connect) / SAML Enterprise-Login-Flüssen wird TOTP oft als zweiter Verifikationsschritt nach dem Passwort (Step-up / Zwei-Faktor-Verifikation) verwendet, ausgelöst durch den IdP (Identitätsanbieter) nach dem ersten Faktor.
- **Standardisierung und Interoperabilität**: Da sowohl der Algorithmus als auch das `otpauth://`-URI-Format offene Standards sind, können beliebige Authenticator-Apps und Server interoperabel arbeiten, ohne an einen bestimmten Anbieter gebunden zu sein.

## Vergleich mit WebAuthn

TOTP ist einfach bereitzustellen und vertraut, hat aber eine grundlegende Limitation: **Es ist nicht Phishing-resistent**. Der TOTP-Code ist nicht an den Zugriffsnamen gebunden, Benutzer werden den 6-stelligen Code auf einer Phishing-Seite eingeben, Angreifer können ihn in Echtzeit weiterleiten (Real-Time Phishing / MITM). WebAuthn / FIDO2 nutzt Public-Key-Kryptografie und bindet Anmeldedaten an die Herkunftsdomäne (Origin), was Phishing auf Protokollebene blockiert.

| Merkmal | TOTP | WebAuthn / Passkey |
|------|------|------|
| Phishing-Resistenz | Nein (Code kann weitergeleitet werden)| Ja (Anmeldedaten gebunden an origin)|
| Gemeinsamer Schlüssel | Ja (Server speichert auch Schlüssel, Undichtheit ermöglicht Klonen)| Nein (privater Schlüssel verlässt Gerät nicht)|
| Resistenz gegen Server-Kompromittierung | Schwach | Stark (Server speichert nur öffentlichen Schlüssel)|
| Benutzeraktion | Manuelles Eingeben von 6-stelligem Code | Biometrische Authentifizierung/PIN Ein-Klick |
| Bereitstellungskosten | Niedrig | Mittel (erfordert Browser-/Plattformunterstützung)|
| Offline-Verfügbarkeit | Ja | Abhängig vom Authenticator |

::: tip
TOTP kann als "stärker als Passwort, aber schwächer als WebAuthn" angesehen werden. In Szenarien mit hohen Sicherheitsanforderungen sollte WebAuthn priorisiert werden (siehe [../webauthn/](../webauthn/)); TOTP eignet sich als breite Baseline-Authentifizierung oder Fallback-Lösung, wenn WebAuthn nicht verfügbar ist.
:::

## Anwendungsfälle

- **TOTP wird empfohlen**: Öffentlich zugängliche SaaS benötigt einen kostenlosen, plattformübergreifenden Zweitfaktor ohne Hardware-Anforderungen; Unternehmen möchten MFA schnell für bestehende Konten ausrollen; Als Fallback-Lösung für WebAuthn.
- **HOTP wird empfohlen**: Verteilung spezieller Hardware-Tokens, Offline-Geräte ohne stabile Uhr.
- **Vorsicht/Nicht empfohlen**: Nur SMS-OTP als einziger Zweitfaktor für Konten mit hohem Wert (SIM-Entführung, SS7-Angriffsrisiken); Szenarien mit strikten Phishing-Schutzanforderungen sollten WebAuthn einsetzen.

## Navigationsanleitung dieses Kapitels

- [HOTP / TOTP Algorithmen im Detail](./totp.md) —— Gemeinsame Schlüssel, HMAC dynamische Kürzung, TOTP Zeitschritte, Verifikationsfenster und komplettes JS-Beispiel.
- [otpauth URI und Parametrerreferenz](./reference.md) —— `otpauth://` URI-Format, Parameter-Standardwerte, QR-Code-Konventionen, Authenticator-Kompatibilität und Fehlersuche.

Verwandte Kapitel: [OAuth 2.0](../oauth2/) · [WebAuthn](../webauthn/)
