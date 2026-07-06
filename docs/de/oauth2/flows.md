---
title: "Typische Flows"
---

# Typische Flows

Diese Seite deckt aktuelle Autorisierungs-Flows (Grant Types) ab, die in modernen OAuth 2.0 Deployments verwendet werden, sowie zwei deprecated Flows, die häufig gestellt werden. Für grundlegende Konzepte (Rollen, PKCE, State etc.) siehe [Kernkonzepte](./concepts.md), für Parameter-Details siehe [Referenzseite](./reference.md).

## Authorization Code Flow (Autorisierungs-Code-Flow, mit PKCE)

**Einsatzgebiet**: Alle Szenarien mit Benutzer-Beteiligung — Web-Apps, SPAs, Mobile Apps, Desktop-Apps. Dies ist der einzige in OAuth 2.1 erhaltene Benutzer-Autorisierungs-Flow und **muss mit PKCE kombiniert werden**.

### Schritt-für-Schritt-Flow

1. Client generiert `code_verifier`, berechnet `code_challenge` (S256), generiert zufälligen `state` und speichert beides mit Benutzer-Sitzung;
2. Client leitet Benutzer-Browser auf den Authorization Endpoint des AS um:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
    &scope=calendar.read%20profile
    &state=af0ifjsldkj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: as.example.com
```

3. Benutzer meldet sich auf AS an (falls nicht bereits angemeldet) und bestätigt Autorisierungsumfang;
4. AS generiert One-Time, kurz-gültig (empfohlen ≤60 Sekunden) Authorization Code und leitet zu Client um:

```http
HTTP/1.1 302 Found
Location: https://app.example.com/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

5. Client **validiert zuerst `state`** mit gespeichertem Wert, reicht dann über Back-Channel Token Endpoint ein:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

(Confidential Client authentifiziert mit `Authorization: Basic ...`; Public Client hat kein Secret, reicht `client_id` stattdessen in Body.)

6. AS validiert Authorization Code, redirect_uri Konsistenz, PKCE Verifier, gibt Tokens zurück bei Erfolg:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "2YotnFZFEjr1zCsicMWpAA",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA",
  "scope": "calendar.read profile"
}
```

7. Client trägt Access Token bei Resource Server auf:

```http
GET /v1/calendar/events HTTP/1.1
Host: api.example.com
Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA
```

::: tip Warum „Code gegen Token austausch" in zwei Schritten
Authorization Code läuft durch Benutzer-Browser (Front-Channel), große Expositionsfläche aber nur One-Time Zweck-Anmeldedaten; echte Token werden durch Server-zu-Server Back-Channel übertragen, Austausch erfordert Client-Authentifizierung/PKCE-Nachweis. Das ist warum Authorization Code Flow sicherer als Implicit ist.
:::

### Häufige Fallstricke

- **Authorization Code kann nur einmal verwendet werden**: Wiederholter Austausch muss fehlschlagen, AS sollte bereits mit diesem Code signierte Tokens widerrufen (verhindere Replay nach Abfang). Client-seitig wenn „gelegentlich invalid_grant" auftaucht, häufig Grund: Callback wurde doppelt ausgelöst (Browser-Refresh, Frontend Re-Rendering) führt zu zweitem Austausch;
- **redirect_uri drei Orte eins**: Registrierungswert, Autorisierungsanfrage-Wert, Token-Anfrage-Wert müssen identisch sein, ein fehlender Slash oder Query-Parameter führt zu Fehler;
- **State-Validierung nicht überspringen**: Viele SDKs tun dies standardmäßig, bei Selbst-Implementierung am leichtesten übersehen;
- **Authorization Code nicht ins Log**: Callback-URLs werden häufig im Zugriffs-Log, APM vollständig erfasst, müssen anonymisiert werden;
- SPA-Szenarien: Tokens nicht in `localStorage` (XSS kann lesen), bevorzugt BFF (Backend for Frontend) Pattern oder Memory + stille Erneuerung.

## Client Credentials Flow (Client-Anmeldedaten-Flow)

**Einsatzgebiet**: Machine-to-Machine (M2M) — geplante Tasks, Microservice-Aufrufe, Backend-Service API-Zugriff. **Keine Benutzer-Beteiligung**, Client erhält Token im eigenen Namen, daher kein Refresh Token (nur direkt neu anfordern).

### Schritt-für-Schritt-Flow

1. Client (muss Confidential Client sein) fordert direkt Token Endpoint an:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&scope=inventory.read
```

2. AS validiert Client-Anmeldedaten, gibt Token zurück:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "inventory.read"
}
```

### Häufige Fallstricke

- **Token auf Client zwischenspeichern bis kurz vor Ablauf**, nicht bei jedem API-Aufruf neuen Token anfordern (würde AS überlasten und selbst verlangsamen);
- In diesem Flow: Token repräsentiert **den Client selbst** und keinen Benutzer, RS-seitige Berechtigungsmodelle müssen „Service-Identität" vs „Benutzer-Identität" unterscheiden;
- Für hohe Sicherheit `private_key_jwt` oder mTLS statt gemeinsamer Secret verwenden;
- client_secret nicht in Code-Repo hochladen — mit Key Management Service injizieren.

## Device Authorization Flow (Gerät-Autorisierungs-Flow)

**Einsatzgebiet**: Geräte ohne Browser oder mit Eingabe-Schwierigkeiten — Smart-TVs, Set-Top-Boxen, CLI-Tools, IoT. Kern-Idee: **Lassen Sie Benutzer auf einem anderen Gerät (Handy/Computer) Autorisierung abschließen**. RFC 8628 definiert.

### Schritt-für-Schritt-Flow

1. Gerät fordert Device Authorization Endpoint des AS an:

```http
POST /device_authorization HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

client_id=1406020730&scope=profile
```

2. AS gibt Device Code und User Code zurück:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://as.example.com/device",
  "verification_uri_complete": "https://as.example.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,
  "interval": 5
}
```

3. Gerät zeigt auf dem Bildschirm: "Besuchen Sie bitte auf Ihrem Handy `as.example.com/device` und geben Sie Code **WDJB-MJHT** ein" (oder zeigen Sie QR-Code von `verification_uri_complete`);
4. Benutzer schließt Login und Autorisierung im Handy-Browser ab;
5. Gleichzeitig fragt Gerät Token Endpoint in `interval` Sekunden Intervallen ab:

```http
POST /token HTTP/1.1
Host: as.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=1406020730
```

6. Wenn Benutzer Autorisierung noch nicht abgeschlossen hat, gibt AS `{"error": "authorization_pending"}` zurück; falls `slow_down` zurückgegeben, muss Polling-Intervall +5 Sekunden erhöht werden; nach Benutzer-Autorisierung gibt AS normale Token-Antwort zurück.

### Häufige Fallstricke

- Muss `authorization_pending` / `slow_down` / `expired_token` / `access_denied` vier Polling-Ergebnisse verarbeiten, `slow_down` ohne Verzögerung wird von AS limitiert;
- `user_code` sollte Zeichensatz verwenden um Mehrdeutigkeit zu vermeiden (0/O, 1/I entfernen) und segmentiert anzeigen;
- Vorsicht vor **Autorisierungs-Phishing**: Angreifer könnte Device Flow initiieren und Benutzer täuschen, User Code einzugeben, AS-Autorisierungsseite sollte Client-Info und Konsequenzen klar anzeigen.

## Refresh Token Flow

**Einsatzgebiet**: Access Token nach Ablauf stille erneuern, ohne dass Benutzer sich wiederholt anmelden muss.

### Schritt-für-Schritt-Flow

1. Client erkennt Access Token ist abgelaufen (oder erhält RS `401` + `error="invalid_token"`), initiiert Erneuerung an Token Endpoint:

```http
POST /token HTTP/1.1
Host: as.example.com
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=tGzv3JOkF0XG5Qx2TlKWIA
```

2. AS gibt neuen Access Token zurück, und (bei aktivierter Rotation) **neuen Refresh Token**:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{
  "access_token": "kJ9x2wLmN8pQr4sTuv6yZa",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8dNvzXbGh4T2q",
  "scope": "calendar.read profile"
}
```

3. Client **überschreibt sofort alten Refresh Token mit neuem**.

### Refresh Token Rotation (Umlauf)

RFC 9700 erfordert Refresh Token von Public Clients erfüllt eines: Sender Constraints (z.B. mTLS Binding) oder **Rotation**. Rotationsmechanismus:

- Jede Erneuerung gibt neuen Refresh Token, alter verfällt sofort;
- Falls AS erkennt **already revoked Refresh Token wird erneut verwendet**, urteilt als Token-Leckagemerkmal, widerruft ganze Token-Familie unter dieser Autorisierung (alle nachgelagerten Tokens), erzwingt Neu-Autorisierung;
- Client muss Concurrency-Schutz machen: mehrere Tabs/Anfragen gleichzeitig erneuernd triggert Fehlalarm, häufiges Muster: Erneuerungs-Lock (Single-Flight) + sehr kurze Gnadenfrist für altes Token (manche AS unterstützen).

### Häufige Fallstricke

- Erneuerungsfehlschlag (`invalid_grant`) bedeutet Refresh Token ist abgelaufen/widerrufen/rotiert, **einzig richtige Handlung ist Benutzer zu Neu-Autorisierungs-Code-Flow leiten**, nicht endloses Retry;
- Bei Erneuerung kann `scope` Parameter Berechtigung reduzieren, aber nicht erweitern;
- Refresh Token ist hochwertige Anmeldedaten: Backend mit Verschlüsselung speichern, Mobile in System Keychain (Keychain/Keystore), **nie an Resource Server senden**.

## Deprecated Flows

::: danger Implicit Flow (Impliziter Flow, `response_type=token`) — Deprecated
Ehemals für SPA: Token direkt im Fragment der Redirect-URL des Authorization Endpoint zurückgegeben, Skip Authorization Code Austausch. Deprecated Gründe:

- Access Token offengelegt in URL — in Browser-Chronik, könnte durch Referer Header ausgeleitet werden, von bösartigen Skripten gelesen;
- Keine Client-Authentifizierung und kein PKCE, kann nicht bestätigen ob legitimer Client Token nahm;
- Token-Injection-Angriff schwer zu verteidigen, unterstützt nativ kein Refresh Token.

**Alternative Lösung**: Authorization Code + PKCE. Nach CORS-Weit-Verbreitung können SPAs direkt Token Endpoint aufrufen, technische Vorbedingung die Implicit brauchte existiert nicht mehr. RFC 9700 verbietet explizit, OAuth 2.1 hat gelöscht.
:::

::: danger Resource Owner Password Credentials (Passwort-Flow, `grant_type=password`) — Deprecated
Client sammelt direkt Benutzer-Name und -Passwort, tauscht gegen Token. Deprecated Gründe:

- Client kontaktiert Benutzer-Klartext-Passwort, verletzt komplett OAuth Design-Absicht (siehe [Übersicht](./README.md));
- Trainiert Benutzer Passwort in beliebige App einzugeben, fördert Phishing;
- Kann MFA, Social Login, SSO, Captcha nicht unterstützen modernes Authentifizierungs-Mittel;
- Keine echte „Benutzer-Zustimmung" Phase.

**Alternative Lösung**: Verwenden Sie überall Authorization Code + PKCE (auch First-Party Apps nicht ausnahme — Nutzen Sie System-Browser/Eingebettete Autorisierungs-Seite für Login). RFC 9700 verbietet explizit, OAuth 2.1 hat gelöscht.
:::

## Flow-Auswahl Quick Reference

| Szenario | Wählen Sie Flow |
|------|----------|
| Web-App (mit Backend) | Authorization Code + PKCE (Confidential Client) |
| SPA | Authorization Code + PKCE (Public Client, bevorzugt BFF Pattern) |
| Mobile / Desktop-App | Authorization Code + PKCE (System-Browser, folgen RFC 8252) |
| Service-zu-Service, keine Benutzer | Client Credentials |
| TV / CLI / IoT | Device Authorization Flow |
| Token-Erneuerung | Refresh Token (Public Client aktiviert Rotation) |

## Nächste Schritte

- [Typische Parameter und Antwort-Referenz](./reference.md): Schnellreferenz für alle oben genannten Anfragen/Antworten Parameter und Fehler-Codes
