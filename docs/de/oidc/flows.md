---
title: "Typische Flows"
---

# Typische Flows

## Authorization Code Flow (Autorisierungscode-Flow)

Dies ist der wichtigste und breiteste Flow von OIDC (Web-Apps, SPA, Mobile Apps sollten ihn verwenden; öffentliche Clients mit PKCE). Der Unterschied zu Pure OAuth 2.0 Authorization Code Flow ist gering: `scope` enthält `openid`, die Anfrage trägt `nonce`, und die Token-Antwort enthält zusätzlich `id_token`.

Beteiligte: End-User (Browser), RP (`https://rp.example.org`, client_id ist `s6BhdRkqt3`), OP (`https://op.example.com`).

### Schritt 1: RP initiiert Authentifizierungsanfrage

RP generiert zufällige `state` (verhindert CSRF) und `nonce` (bindet ID Token), speichert sie in der Sitzung und leitet den Browser zum authorization endpoint des OP um:

```http
GET /authorize?response_type=code
    &client_id=s6BhdRkqt3
    &redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
    &scope=openid%20profile%20email
    &state=af0ifjsldkj
    &nonce=n-0S6_WzA2Mj
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256 HTTP/1.1
Host: op.example.com
```

### Schritt 2: Benutzer authentifiziert sich beim OP und erteilt Genehmigung

OP authentifiziert den Benutzer (Passwort, MFA, SSO-Sitzungswiederverwendung usw.) und zeigt ggf. eine Genehmigungsseite.

### Schritt 3: OP ruft RP mit Autorisierungscode zurück

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj
```

RP validiert zunächst, dass `state` dem in der Sitzung gespeicherten Wert entspricht; wenn nicht, wird sofort beendet.

### Schritt 4: RP-Backend tauscht Code gegen Token

```http
POST /token HTTP/1.1
Host: op.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic czZCaGRSa3F0Mzo3RmpmcDBaQnIxS3REUmJuZlZkbUl3

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Frp.example.org%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

Antwort:

```json
{
  "access_token": "SlAV32hkKG",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIwMjQta2V5LTAxIn0.eyJpc3MiOi...(gekürzt).signature"
}
```

`id_token` nach Dekodierung der Payload:

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "amr": ["pwd"]
}
```

### Schritt 5: RP validiert ID Token

Führe die [Validierungsprüfliste aus Kernkonzepten](./concepts.md#validierungsprufliste-fur-rp) durch: Signaturverifizierung (JWKS), `iss`, `aud`, `exp`/`iat`, `nonce`. Nach erfolgreicher Validierung aller Punkte wird eine lokale Sitzung mit `iss + sub` als Schlüssel etabliert oder verknüpft — **damit ist die Anmeldung abgeschlossen**.

### Schritt 6 (optional): UserInfo aufrufen für weitere Informationen

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

::: warning Häufige Fallstricke bei diesem Flow
- **nonce wird nicht validiert oder nicht an Sitzung gebunden**: nonce muss in der serverseitigen Sitzung gespeichert werden, bevor die Anfrage versendet wird; bei Rückfrage abgleichen und ungültig machen; nur generieren ohne Vergleich ist wie gar kein nonce.
- **aud wird nicht validiert**: ermöglicht Token-Substitution, bei der ID Tokens einer anderen App zum Anmelden bei Ihrem System verwendet werden können.
- **`sub` von UserInfo wird nicht mit `sub` von ID Token abgeglichen**: Bei Nichtübereinstimmung muss UserInfo verworfen werden.
- **access token wird als Identitätsbescheinigung behandelt**: Identitätsbestimmung darf nur auf validierten ID Tokens basieren; access token wird nur zum API-Aufruf verwendet.
- **öffentliche Clients (SPA/Mobile) mit fehlendem PKCE**: Autorisierungscode könnte abgefangen und wiederverwendet werden; `S256` muss verwendet werden.
:::

## response_type und die drei Flows

OIDC Core definiert drei Flows, bestimmt durch `response_type`, mit Unterschieden, wo Tokens zurückgegeben werden:

| Flow | response_type | Vom authorization endpoint | Vom token endpoint | Status |
|------|---------------|----------------|-------------------|------|
| Authorization Code | `code` | code | id_token + access_token | **Empfohlen, einzige Wahl** |
| Implicit | `id_token` oder `id_token token` | id_token (+ access_token) | — | Veraltet, nicht empfohlen |
| Hybrid | `code id_token`, `code token`, `code id_token token` | code + einige Tokens | restliche Tokens | Spezielle Szenarien, selten verwendet |

::: warning Implicit Flow ist nicht mehr empfohlen
Der Implicit Flow gibt das Token direkt im Fragment der Umleitungs-URL zurück und hat große Sicherheitsprobleme: großer Leakebereich (Browser-Verlauf, Referer, Logs), kann nicht mit PKCE konfiguriert werden, access token hat keine Sender Constraints usw. OAuth 2.0 Security BCP und OAuth 2.1 haben diese Methode eindeutig aufgegeben. **Historisch SPAs mit Implicit nur wegen CORS-Beschränkungen; heute sollte alles Authorization Code + PKCE verwenden.** Hybrid Flow wird nur in wenigen Szenarien verwendet, die "ID Token zuerst abrufen zum Rendering, dann Code tauschen" erfordern; Frontend-ID Tokens müssen vollständig validiert werden (must `nonce` validieren, `code id_token` Kombination sollte `c_hash` validieren).
:::

## Discovery + JWKS-Abrufluss

Standard-Aktion beim Starten oder erstmaligen Verbinden zu OP:

1. Konfiguriere die einzige Eingabe: issuer, z. B. `https://op.example.com`.
2. Metadaten abrufen: `GET https://op.example.com/.well-known/openid-configuration`.
3. **Validiere, dass das `issuer` Feld in der Antwort genau mit dem issuer aus Schritt 1 übereinstimmt** (Nichtübereinstimmung zeigt Konfigurationsfehler oder Issuer-Verwechslungsangriff).
4. Extrahiere `authorization_endpoint`, `token_endpoint`, `userinfo_endpoint`, `jwks_uri`, `end_session_endpoint` aus dem Dokument.
5. JWKS abrufen und zwischenspeichern: `GET jwks_uri`.
6. Danach bei jeder Signaturverifizierung nach `kid` im Cache nachschlagen; bei unbekanntem `kid` JWKS einmal auffrischen (mit Drosselung), um Key Rotation reibungslos zu handhaben.

::: tip
Die meisten Client-Bibliotheken verpacken Schritte 2–6 in einer Initialisierungszeile (wie `Issuer.discover()` bei openid-client). Manuelle Festcodierung von Endpunkten wird nur verwendet, wenn OP Discovery nicht unterstützt.
:::

**Häufige Fallstricke**: Trailing Slash in issuer ist inkonsistent und führt zu `iss`-Validierungsfehlern (`https://op.example.com` ≠ `https://op.example.com/`); fehlende JWKS-Cache-Ablaufstrategie führt zu vollständigen Signaturverifizierungsfehlern nach Key Rotation.

## RP-Initiated Logout Flow

1. Benutzer klickt "Abmeldung" bei RP, RP zerstört **seine eigene** Sitzung (Cookie/serverseitige Session).
2. RP leitet Browser zu `end_session_endpoint` des OP (aus Discovery-Dokument) um:

```http
GET /logout?id_token_hint=eyJhbGciOi...(gespeichertes ID Token von Anmeldung)
    &post_logout_redirect_uri=https%3A%2F%2Frp.example.org%2Floggedout
    &state=xj2kdi93 HTTP/1.1
Host: op.example.com
```

3. OP identifiziert Benutzer und Client nach `id_token_hint`, beendet die OP-Sitzung (zeigt möglicherweise Bestätigungsseite; wenn Front/Back-Channel Logout konfiguriert, benachrichtigt OP auch andere RPs).
4. OP leitet Browser zu `post_logout_redirect_uri` zurück (mit ursprünglichem `state`):

```http
HTTP/1.1 302 Found
Location: https://rp.example.org/loggedout?state=xj2kdi93
```

**Häufige Fallstricke**:

- `post_logout_redirect_uri` muss vorher auf OP-Seite registriert werden, sonst lehnt OP ab oder bleibt auf seiner Abmeldungsseite stecken.
- Vergessen, erst RP-Sitzung zu löschen — nach Klick "Abmelden" zeigt Seitenaktualisierung noch Anmeldestatus.
- `id_token_hint` nicht übergeben — manche OPs zeigen "Sind Sie sicher?" Interaktionsseite an; Konsistenzproblem; beim Anmelden sollte ID Token (oder eine Referenz) für Abmeldung gespeichert werden.
- Nur RP-Sitzung gelöscht, nicht zu OP umgeleitet — nächster Login wird von OP SSO-Sitzung stillschweigend erneut angemeldet; sieht aus wie "kann nicht abmelden".

---

Vollständige Paramter- und Fehlercodedeifinitionen finden Sie in der [Parameter- und Claims-Referenz](./reference.md); ID-Token-Validierungsdetails finden Sie in [Kernkonzepten](./concepts.md).
