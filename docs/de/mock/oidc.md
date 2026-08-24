---
title: OIDC Mock
---

# OIDC / OAuth2 Mock

OAuth 2.0 (RFC 6749) hat drei ansprechbare Service-Rollen: **Authorization Server** (OIDC nennt es OpenID Provider / OP), **Client** (OIDC nennt es Relying Party / RP), **Resource Server**. Terminologie und Gesamtübersicht siehe [Mock-Überblick](./README.md).

**Service-Adresse: <https://mock.authn.tech/>**

## Authorization Server (OIDC: OpenID Provider / OP)

| Endpunkt | Pfad |
|------|------|
| Discovery | [`/.well-known/openid-configuration`](https://mock.authn.tech/.well-known/openid-configuration) |
| Authorization | `/oidc/authorize` |
| Token | `/oidc/token` |
| UserInfo | `/oidc/userinfo` |
| JWKS | [`/oidc/jwks.json`](https://mock.authn.tech/oidc/jwks.json) |

- **Zero Registration**: Beliebige `client_id` / `redirect_uri` werden akzeptiert, client secret wird nicht verifiziert.
- Authorization Code Flow + **PKCE** (S256 / plain); `refresh_token` (wenn scope `offline_access` enthält) und `client_credentials` grant.
- Zwei feste Test-Benutzer **alice** / **bob**; Autorisierungsanfrage mit `&user=alice` kann Benutzerauswahlseite überspringen (CI-freie Interaktion).
- CORS vollständig offen, kann direkt von Browser-Frontend aufgerufen werden.

## Client (OIDC: Relying Party / RP)

**Konsole: <https://mock.authn.tech/rp/>**

Nutzen Sie diesen Mock als **Client**, verbinden Sie sich mit **jeden beliebigen externen OP** (Keycloak, Auth0, Okta, Azure AD oder Mock OP dieser Site), durchlaufen Sie komplett Authorization Code + PKCE Login: Geben Sie externen OP issuer und `client_id` ein → Discovery automatisch abrufen → Login initiieren → Rückruf um Token zu tauschen → Verwenden Sie OP JWKS um ID Token-Signatur zu validieren → Verifizieren Sie `iss`/`aud`/`nonce`/`exp` → UserInfo aufrufen, zeigen Sie schrittweise an.

> Rückruf-Adresse `https://mock.authn.tech/rp/callback` muss zur Whitelist des externen OP hinzugefügt werden.

### Manueller Schritt-für-Schritt-Modus (OP hinter Unternehmensnetz / WAF)

**Konsole: <https://mock.authn.tech/rp/manual>**

Der obige automatische Modus setzt voraus, dass **diese Site Ihren OP direkt erreichen kann**. Liegt der OP hinter einem Unternehmensnetz, einem VPN oder einer WAF / einem Login-Portal, kommt diese öffentlich gehostete Site schlicht nicht an ihn heran — Discovery, Token-Tausch und JWKS-Abruf schlagen allesamt fehl.

Typisches Symptom: Das Security-Gateway liefert eine HTML-Sperrseite mit **HTTP 200** (statt 401/403), das JSON-Parsing scheitert, und die Seite meldet 502. Der automatische Modus zeigt nun HTTP-Status, `content-type` und einen Auszug des Rumpfs an, damit erkennbar wird, wer die Anfrage blockiert hat.

Der manuelle Modus gibt Ihnen die Netzwerk-Hälfte zurück — **diese Site sendet keinerlei Anfragen an Ihren OP**, sie baut nur URLs und wertet offline aus:

| Schritt | Was Sie tun | Was diese Site tut |
|---------|-------------|--------------------|
| ① | `.well-known/openid-configuration` in einem Browser öffnen, der den OP *erreicht*, und das JSON hier einfügen (oder Endpunkte manuell eintragen) | Endpunkte parsen, Vollständigkeit prüfen |
| ② | Auf „Login starten" klicken | `state`/`nonce`/PKCE erzeugen, Autorisierungs-URL bauen und **302** dorthin (die Weiterleitung sendet *Ihr* Browser) |
| ③ | Das erzeugte curl kopieren, auf einem Rechner mit OP-Zugang ausführen, die Token-Antwort zurück einfügen | `state` prüfen, `code`, `code_verifier` usw. in den curl-Befehl einsetzen |
| ④ | — | ID Token offline dekodieren, `iss`/`aud`/`nonce`/`exp` prüfen |
| ⑤ | `jwks_uri` öffnen, JWKS zurück einfügen | Signatur lokal per WebCrypto verifizieren und Ergebnis ausgeben |

Weitere Hinweise:

- Erlaubt die redirect_uri-Whitelist des Clients nur eine interne Adresse, landen Sie nach dem Login auf Ihrer eigenen Anwendung — kopieren Sie die vollständige URL aus der Adresszeile in [Callback-URL einfügen](https://mock.authn.tech/rp/manual/callback), um fortzufahren.
- Ist PKCE für den Client nicht aktiviert, in Schritt ① das Häkchen entfernen; zusätzliche Autorisierungsparameter wie `prompt` oder `acr_values` auf derselben Seite zeilenweise als `key=value` eintragen.
- Der Login-Kontext ist ein signiertes JWT in einem HttpOnly-Cookie (1 Stunde gültig); eine kopierbare Zweitfassung steht auf der Seite, damit ein verlorenes Cookie Sie nicht blockiert.

## Resource Server (Ressourcenserver / geschützte API)

**Info-Seite: <https://mock.authn.tech/rs/>** · Geschützter Endpunkt `GET /rs/api`

Validieren Sie access token **Signatur, Ablauf, `token_use` und `scope`** (muss `profile` enthalten), geben Sie geschützte Ressource zurück; unzureichende Berechtigung gibt `403 insufficient_scope` zurück, fehlender / ungültiger Token gibt `401 invalid_token` zurück.

## Aufruffolge (Autorisierungscode + PKCE)

Mit "Ihr RP + Mock OP" als Beispiel:

1. **RP** generiert `code_verifier`, berechnet `code_challenge` (S256), zusammen mit `state`, `nonce` leitet Browser zu **OP** `/oidc/authorize` um.
2. **OP** zeigt Test-Benutzerauswahlseite an (oder wählt direkt mit `&user=alice`), springt mit `code` + `state` zu RP `redirect_uri` zurück.
3. **RP** vergleicht `state`, nutzt `code` + `code_verifier` POST zu **OP** `/oidc/token`.
4. **OP** validiert PKCE, gibt `id_token` / `access_token` (und optional `refresh_token`) zurück.
5. **RP** holt öffentlichen Schlüssel von **OP** `/oidc/jwks.json`, validiert Signatur von `id_token`, vergleicht `iss` / `aud` / `nonce` / `exp`.
6. **RP** nutzt `access_token` um **OP** `/oidc/userinfo` aufzurufen (oder **RS** `/rs/api` um Benutzerinformation / geschützte Ressource zu erhalten).

Möchten Sie den Effekt direkt sehen? Diese Site hat eine **echte klickbare** [OIDC-Login-Demo](./demo.md), ein Klick durchläuft den obigen Prozess und zeigt die Analyseergebnisse jedes Schritts.

Autorisierungs-Endpunkt-Beispiel (ersetzen Sie Ihre Rückruf-Adresse):

```
https://mock.authn.tech/oidc/authorize?client_id=demo&redirect_uri=https://your-app.example/callback&response_type=code&scope=openid+profile+email&state=xyz&nonce=n-abc
```

Token abrufen:

```bash
curl -X POST https://mock.authn.tech/oidc/token \
  -d grant_type=authorization_code \
  -d code=<code> \
  -d redirect_uri=https://your-app.example/callback \
  -d client_id=demo
```

Das erhaltene `id_token` können Sie direkt in den [JWT-Parser](../tools/jwt.md) werfen zum Ansehen.
