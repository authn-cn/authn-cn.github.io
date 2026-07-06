---
title: "Typische Parameter und Antwort-Referenz"
---

# Typische Parameter und Antwort-Referenz

Diese Seite ist ein Quick-Reference Handbuch, das Anfrage-Parameter, Antwort-Felder und Fehler-Codes aller Endpoints zusammenfasst. Für Flow-Kontext siehe [Typische Flows](./flows.md), Konzept-Erklärungen siehe [Kernkonzepte](./concepts.md).

## Authorization Endpoint Anfrage-Parameter

`GET /authorize`, Parameter in Query String (Werte müssen URL-kodiert sein):

| Parameter | Erforderlich | Erklärung |
|------|------|------|
| `response_type` | Erforderlich | Authorization Code Flow ist `code` (`token` = Implicit, deprecated) |
| `client_id` | Erforderlich | Client-Identifikator erhalten bei Registrierung |
| `redirect_uri` | Bedingt erforderlich | Callback-Adresse, muss **zeichenweise exakt mit Registrierungswert übereinstimmen**; erforderlich wenn mehrere URIs registriert |
| `scope` | Empfohlen | Leerzeichen-getrennte Berechtigungs-Bereichs-Liste (nach URL-Kodierung ist Leerzeichen `%20` oder `+`) |
| `state` | Empfohlen (sollte in Praxis erforderlich sein) | Cryptographisch zufälliger Wert, wird unverändert bei Callback zurückgegeben, Client muss validieren, schützt CSRF |
| `code_challenge` | Empfohlen (OAuth 2.1 erforderlich) | PKCE Challenge-Wert: `BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | Empfohlen | Verwenden Sie `S256`; `plain` nur für Legacy-Kompatibilität, nicht verwenden |

Authorization erfolgreiche Callback: `{redirect_uri}?code={auth_code}&state={original_value}`.

## Token Endpoint Anfrage-Parameter

`POST /token`, `Content-Type: application/x-www-form-urlencoded`. Confidential Client benötigt Client-Authentifizierung (z.B. `Authorization: Basic ...`); Public Client reicht `client_id` im Body.

### grant_type=authorization_code

| Parameter | Erforderlich | Erklärung |
|------|------|------|
| `grant_type` | Erforderlich | `authorization_code` |
| `code` | Erforderlich | Authorization Code vom Authorization Endpoint, **One-Time Use** |
| `redirect_uri` | Bedingt erforderlich | Wenn in Autorisierungs-Anfrage enthalten, muss enthalten sein und Wert komplett identisch |
| `code_verifier` | PKCE erforderlich | Original zufällige Zeichenkette zum Erzeugen Challenge (43–128 Zeichen) |
| `client_id` | Public Client erforderlich | Zur Client-Identifikation ohne Client-Authentifizierung |

### grant_type=refresh_token

| Parameter | Erforderlich | Erklärung |
|------|------|------|
| `grant_type` | Erforderlich | `refresh_token` |
| `refresh_token` | Erforderlich | Zuvor signiertes Refresh Token |
| `scope` | Optional | Kann nur **reduzieren**, nicht erweitern über Original-Autorisierungs-Umfang |

### grant_type=client_credentials

| Parameter | Erforderlich | Erklärung |
|------|------|------|
| `grant_type` | Erforderlich | `client_credentials` |
| `scope` | Optional | Angeforderte Berechtigungs-Bereiche |

(Muss Client-Authentifizierung verwenden, nur für Confidential Client.)

### grant_type=urn:ietf:params:oauth:grant-type:device_code

| Parameter | Erforderlich | Erklärung |
|------|------|------|
| `grant_type` | Erforderlich | `urn:ietf:params:oauth:grant-type:device_code` |
| `device_code` | Erforderlich | Device Code vom Device Authorization Endpoint |
| `client_id` | Public Client erforderlich | Client-Identifikator |

## Token erfolgreiche Antwort-Felder

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

| Feld | Erforderlich | Erklärung |
|------|------|------|
| `access_token` | Erforderlich | Access Token, Client sollte als opake Zeichenkette behandeln |
| `token_type` | Erforderlich | Normalerweise `Bearer`; **case-insensitiv** (könnte `bearer` zurückgeben), beim Vergleich beachten |
| `expires_in` | Empfohlen | Gültigkeitsdauer in Sekunden; Client sollte vorzeitig (z.B. 30 Sekunden vorher) als abgelaufen betrachten statt nur bei 401 handeln |
| `refresh_token` | Optional | Refresh Token; Client Credentials Mode gibt nicht aus; bei aktivierter Rotation wird neuer Wert bei jeder Erneuerung zurückgegeben |
| `scope` | Bedingt erforderlich | Wenn tatsächlich gewährter Scope von angefordert abweicht, muss zurückgegeben werden; Client sollte dies als Quelle der Wahrheit nutzen |

Antwort muss `Cache-Control: no-store` enthalten, verhindert Token-Caching.

## Fehler-Antworten

### Token Endpoint Fehler (RFC 6749 §5.2)

HTTP Status normalerweise `400` (Client-Authentifizierung-Fehler ist `401`), JSON Body:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
Cache-Control: no-store

{
  "error": "invalid_grant",
  "error_description": "Authorization code is expired or already used"
}
```

| Fehler-Code | Bedeutung | Häufige Auslöser |
|--------|------|----------|
| `invalid_request` | Anfrage fehlende Parameter, doppelte Parameter oder Format-Fehler | Fehlender `grant_type`; Body nicht Form-kodiert, sondern JSON gesendet |
| `invalid_client` | Client-Authentifizierung fehlgeschlagen (HTTP 401) | client_secret falsch/rotiert; Authentifizierungs-Methode passt nicht zu Registrierungs-Config |
| `invalid_grant` | Autorisierungs-Anmeldedaten ungültig | Authorization Code abgelaufen/bereits verwendet; redirect_uri stimmt nicht überein; Refresh Token widerrufen oder rotiert; PKCE Verifier Validierung fehlgeschlagen |
| `unauthorized_client` | Client nicht berechtigt, diese grant_type zu verwenden | Client-Registrierung hat diese Grant-Type nicht aktiviert |
| `unsupported_grant_type` | AS unterstützt diese grant_type nicht | Tippfehler; AS hat Device Flow etc nicht aktiviert |
| `invalid_scope` | Scope ungültig, unbekannt oder außerhalb Bereich | Nicht-existenter Scope angefordert; Erneuerung versucht zu erweitern |

`error_description` (menschenlesbarer Text) und `error_uri` (Dokumentations-Link) sind optional, verlassen Sie sich nicht auf deren Inhalte für Code-Logik.

### Authorization Endpoint Fehler (RFC 6749 §4.1.2.1)

Fehler werden durch Redirect zurück zu `redirect_uri` zurückgegeben: `{redirect_uri}?error=access_denied&state=...`.
(Aber wenn `client_id` oder `redirect_uri` selbst ungültig, darf AS **nicht umleiten**, zeigen Sie direkt Fehlerseite.)

| Fehler-Code | Bedeutung |
|--------|------|
| `invalid_request` | Anfrage-Parameter fehlend oder ungültig |
| `unauthorized_client` | Client nicht berechtigt diese response_type zu verwenden |
| `access_denied` | Benutzer oder AS lehnt Autorisierung ab (Benutzer klickt „Ablehnen") |
| `unsupported_response_type` | Nicht unterstützte response_type |
| `invalid_scope` | Angeforderte Scope ungültig |
| `server_error` | AS interner Fehler (equiv 500, aber durch Redirect mitgeliefert) |
| `temporarily_unavailable` | AS überbelastet oder in Wartung (equiv 503) |

### Device Flow Polling spezieller Fehler (RFC 8628)

| Fehler-Code | Bedeutung | Client-Aktion |
|--------|------|-----------|
| `authorization_pending` | Benutzer hat Autorisierung noch nicht abgeschlossen | Weiter polling nach `interval` |
| `slow_down` | Polling zu schnell | Intervall **+5 Sekunden** dann weiter |
| `expired_token` | device_code abgelaufen | Neue Device Authorization Anfrage |
| `access_denied` | Benutzer lehnt Autorisierung ab | Beenden, Benutzer informieren |

## grant_type Überblick

| grant_type Wert | Name | Status | Szenario |
|---------------|------|------|------|
| `authorization_code` | Authorization Code Flow | **Empfohlen** (muss mit PKCE) | Alle Szenarien mit Benutzer-Beteiligung |
| `client_credentials` | Client Credentials Flow | Empfohlen | M2M, Service-zu-Service Aufrufe |
| `refresh_token` | Refresh Token | Empfohlen | Token-Erneuerung |
| `urn:ietf:params:oauth:grant-type:device_code` | Device Authorization | Empfohlen (wenn anwendbar) | Eingabe-begrenzte Geräte |
| `urn:ietf:params:oauth:grant-type:jwt-bearer` | JWT Bearer (RFC 7523) | Spezialisiert | Verbundene Identität, Service-Konto Impersonation |
| `urn:ietf:params:oauth:grant-type:token-exchange` | Token Exchange (RFC 8693) | Spezialisiert | Microservice Token-Delegation/Downgrade |
| `password` | Passwort Flow | **Deprecated** | Verwenden Sie Authorization Code + PKCE |
| (`response_type=token`) | Implicit (nicht grant_type, Authorization Endpoint direkt Token) | **Deprecated** | Verwenden Sie Authorization Code + PKCE |

## Bearer Token drei Transport-Methoden (RFC 6750)

| Methode | Beispiel | Bewertung |
|------|------|------|
| **Authorization Header** | `Authorization: Bearer 2YotnFZFEjr1zCsicMWpAA` | **Einzige Empfehlung**. Nicht ins Log/Chronik, unterstützt beliebige HTTP Methoden |
| Form Body Parameter | `access_token=2Yotn...` (Form-kodiert Body) | Nicht empfohlen. Nur für Legacy-Szenarien ohne Header-Unterstützung |
| URL Query Parameter | `GET /api?access_token=2Yotn...` | **Verboten**. Token in Zugriffs-Log, Browser-Chronik, Referer Header, RFC 6750 selbst nicht empfohlen, RFC 9700 verbietet explizit |

RS lehnt Anfrage ab sollte `WWW-Authenticate` Header zurückgeben:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token", error_description="The access token expired"
```

| RS Fehler-Code | HTTP Status | Bedeutung |
|-----------|-----------|------|
| `invalid_request` | 400 | Anfrage-Format-Fehler (z.B. zwei Token) |
| `invalid_token` | 401 | Token abgelaufen, widerrufen oder ungültig → Client sollte erneuern oder Neu-Autorisierung |
| `insufficient_scope` | 403 | Token gültig aber Scope nicht ausreichend |

## Troubleshooting Quick Reference

| Symptom | Wahrscheinlichste Ursache |
|------|--------------|
| Authorization Endpoint zeigt direkt Fehlerseite, kein Redirect | `client_id` existiert nicht, oder `redirect_uri` passt nicht zu Registrierungswert (überprüfen Sie Protokoll, Port, Trailing Slash, Groß-/Kleinschreibung) |
| Callback meldet `error=access_denied` | Benutzer lehnt Autorisierung ab; oder AS-Richtlinie lehnt ab (Benutzer hat keine Berechtigung, Client ist deaktiviert) |
| Token-Austausch meldet `invalid_grant` | Authorization Code bereits verwendet (Callback zweimal ausgelöst?) oder abgelaufen; `redirect_uri` passt nicht zu Autorisierungs-Anfrage; PKCE Verifier passt nicht zu Challenge |
| Token-Austausch meldet `invalid_client` (401) | Secret falsch oder rotiert; verwendet `client_secret_post` aber AS akzeptiert nur Basic (oder umgekehrt); Basic Header nicht URL-kodiert für id/secret |
| Meldet `invalid_request` | Body verwendete JSON statt `application/x-www-form-urlencoded`; Parameter doppelt übermittelt |
| Erneuerung meldet `invalid_grant` | Refresh Token abgelaufen/widerrufen; Rotation-Szenario hat altes Token verwendet (Concurrency-Schutz nicht gesperrt); Benutzer änderte Passwort triggert globalen Widerruf |
| RS gibt 401 `invalid_token` zurück | Access Token abgelaufen → erneuern; Uhr-Versatz führt zu JWT `nbf`/`exp` Validierungs-Fehler; RS konfigurierter Issuer/Audience passt nicht |
| RS gibt 403 `insufficient_scope` zurück | Bei Autorisierung diese Scope nicht angefordert, oder Benutzer hat nicht genehmigt; überprüfen Sie tatsächliche zurückgegebene `scope` in Token-Antwort |
| Device Flow bleibt immer `authorization_pending` | Benutzer hat Autorisierung nicht abgeschlossen; überprüfen Sie angezeigte `verification_uri` und `user_code` richtig |
| Gelegentlich Erfolg/Fehler | Multi-Instanz AS Sitzung/Speicher nicht synchron; Lastverteilung hat zu anderem Umfeld umgeleitet; Client Uhr-Drift |

## Verwandte Seiten

- [OAuth 2.0 Übersicht](./README.md)
- [Kernkonzepte](./concepts.md)
- [Typische Flows](./flows.md)
