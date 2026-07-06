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
