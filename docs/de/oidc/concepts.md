---
title: "Kernkonzepte"
---

# Kernkonzepte

## Rollen: OP, RP und End-User

OIDC verwendet ein Namenssystem für Rollen, das auf OAuth 2.0 aufbaut. Die Zuordnung ist wie folgt:

| OIDC-Rolle | Entsprechende OAuth 2.0-Rolle | Erklärung |
|-----------|--------------------|------|
| **OP** (OpenID Provider, Identitätsanbieter) | Authorization Server (Autorisierungsserver) | Der Service, der Benutzer authentifiziert und ID Token / access token ausstellt, wie Keycloak, Entra ID, Okta |
| **RP** (Relying Party, Abhängige Partei) | Client (Client) | Eine Anwendung, die sich auf den OP für die Benutzerauthentifizierung verlässt, d. h. "Ihre Anwendung" |
| **End-User** (Endbenutzer) | Resource Owner (Ressourceneigentümer) | Die Person, die authentifiziert wird |

OP trägt auch die vollständige Verantwortung des OAuth 2.0-Autorisierungsservers. Ein einzelner OIDC-Flow kann daher sowohl ID Token (damit RP die Benutzeridentität bestätigt) als auch access token (damit RP APIs wie UserInfo Endpoint aufruft) produzieren.

## ID Token im Detail

ID Token ist das Kernprodukt von OIDC: ein **vom OP signiertes JWT**, das für RP behauptet, "ein Benutzer wurde zu einem bestimmten Zeitpunkt authentifiziert". Es besteht aus drei Base64URL-codierten Teilen, die durch `.` verbunden sind: `header.payload.signature`.

### Vollständiges Beispiel

Header (dekodiert):

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

Payload (dekodiert):

```json
{
  "iss": "https://op.example.com",
  "sub": "248289761001",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "auth_time": 1767223180,
  "nonce": "n-0S6_WzA2Mj",
  "acr": "urn:mace:incommon:iap:silver",
  "amr": ["pwd", "otp"],
  "azp": "s6BhdRkqt3",
  "name": "张三",
  "email": "zhangsan@example.com",
  "email_verified": true
}
```

### Erforderliche Claims

| Claim | Bedeutung |
|-------|------|
| `iss` | Issuer (Aussteller), die Kennung des OP und eine HTTPS-URL, die genau mit dem `issuer` im Discovery-Dokument übereinstimmen muss |
| `sub` | Subject (Betreff), eindeutige Kennung des Benutzers im OP. **Dies ist der Primärschlüssel des Benutzers; verwenden Sie nicht die E-Mail als Primärschlüssel** |
| `aud` | Audience (Zielgruppe), muss die `client_id` des RP enthalten; kann ein String oder ein Array sein |
| `exp` | Expiration (Ablauf), Ablaufzeit (Unix-Sekunden); nach Ablauf muss das Token abgelehnt werden |
| `iat` | Issued At (Ausgestellt am), Ausstellungszeit (Unix-Sekunden) |

### Häufig vorkommende optionale Claims

| Claim | Bedeutung |
|-------|------|
| `nonce` | Ein zufälliger Wert, den RP in der Authentifizierungsanfrage übergibt und den OP unverändert zurückgibt; wird verwendet, um ID Token an diese Sitzung zu binden und Replay-Angriffe zu verhindern. Wenn die Anfrage nonce enthält, muss die Antwort sie enthalten |
| `auth_time` | Die Zeit, zu der der Benutzer tatsächlich authentifiziert wurde. Muss zurückgegeben werden, wenn die Anfrage `max_age` oder `auth_time` als essential claim enthält |
| `acr` | Authentication Context Class Reference (Authentifizierungskontextklasse-Referenz), z. B. Authentifizierungsgrad (wie z. B. erforderliche Stärke) |
| `amr` | Authentication Methods References (Authentifizierungsmethoden-Referenzen), ein Array, z. B. `["pwd","otp"]` (Passwort + Einmalpasswort) |
| `azp` | Authorized Party (Autorisierte Partei); wenn `aud` mehrere Zielgruppen enthält, zeigt dies an, welche `client_id` das Token tatsächlich erhielt |

### Validierungsprüfliste für RP

Nach dem Empfang eines ID Tokens **muss** RP jeden Punkt validieren (bei Fehlschlag sollte Login verweigert werden):

1. **Signatur**: Mit der öffentlichen Schlüssel des OP aus JWKS nach `alg`/`kid` im Header validieren; `alg` muss auf einer erwarteten Whitelist sein (**niemals `none` akzeptieren**).
2. **iss** ist gleich dem erwarteten OP-issuer (konsistent mit dem `issuer` im Discovery-Dokument).
3. **aud** enthält die eigene `client_id`; wenn `aud` ein Array mit mehreren Werten ist, muss auch `azp` gleich der eigenen `client_id` sein.
4. **exp** ist nicht abgelaufen; **iat** ist angemessen (kann kleine Zeitabweichungen zulassen, normalerweise ≤ 5 Minuten).
5. **nonce** ist konsistent mit dem Wert, der beim Senden der Authentifizierungsanfrage in der Sitzung gespeichert wurde (nach Gebrauch ungültig machen).
6. Falls `max_age` angefordert wurde: Validieren Sie, dass `auth_time + max_age` nicht überschritten wurde.
7. Falls die Geschäftslogik eine bestimmte Authentifizierungsstärke erfordert: Validieren Sie, dass `acr` die Anforderungen erfüllt.

::: warning Validierungen nicht überspringen
Viele OIDC-bezogene Sicherheitslücken entstehen, weil RP faul ist: Keine Signaturverifizierung, keine `aud`-Validierung, keine `nonce`-Validierung. Verwenden Sie reife Authentifizierungsbibliotheken (wie openid-client, Spring Security, offizielle SDKs in verschiedenen Sprachen) und schreiben Sie keine JWT-Parsing-Logik selbst.
:::

## Standard-Scopes und entsprechende Claims

OIDC verwendet Scopes, um eine Gruppe von Benutzereigenschaften (Claims) in Batch zu beantragen:

| Scope | Bedeutung | Entsprechende Claims (Auszug) |
|-------|------|--------------------|
| `openid` | **Erforderlich**, signalisiert, dass es eine OIDC-Authentifizierungsanfrage ist | `sub` (und das ID Token selbst) |
| `profile` | Grundlegende Informationen | `name`, `given_name`, `family_name`, `nickname`, `preferred_username`, `picture`, `birthdate`, `locale`, `updated_at` usw. |
| `email` | E-Mail | `email`, `email_verified` |
| `address` | Adresse | `address` (JSON-Objekt) |
| `phone` | Telefon | `phone_number`, `phone_number_verified` |
| `offline_access` | Ein Refresh Token anfordern, damit RP neue Tokens abrufen kann, wenn der Benutzer offline ist | —(produziert keine Claims) |

Eine typische Anfrage: `scope=openid profile email`. Die Claims, die den Scopes profile/email entsprechen, werden vom OP bestimmt — entweder im ID Token oder nur über UserInfo Endpoint zurückgegeben (die meisten OPs geben diese standard im UserInfo zurück).

## UserInfo Endpoint

UserInfo Endpoint ist eine OAuth2-geschützte REST-API, mit der RP einen access token gegen Benutzer-Claims tauscht:

```http
GET /userinfo HTTP/1.1
Host: op.example.com
Authorization: Bearer SlAV32hkKG
```

```json
{
  "sub": "248289761001",
  "name": "张三",
  "preferred_username": "zhangsan",
  "email": "zhangsan@example.com",
  "email_verified": true,
  "picture": "https://op.example.com/avatars/248289761001.jpg"
}
```

::: warning sub abgleichen
RP muss überprüfen, dass `sub` in der UserInfo-Antwort mit `sub` im ID Token übereinstimmt. Bei Nichtübereinstimmung müssen UserInfo-Daten verworfen werden. Dies verhindert Verwechslungen/Austausch von Antworten.
:::

## Discovery: /.well-known/openid-configuration

Die OIDC Discovery-Spezifikation schreibt vor, dass OP Metadaten unter einem festen Pfad veröffentlicht. RP muss nur eine issuer URL konfigurieren und kann alle Endpunkte und Fähigkeiten automatisch erkennen:

```http
GET /.well-known/openid-configuration HTTP/1.1
Host: op.example.com
```

Auszug der Antwort:

```json
{
  "issuer": "https://op.example.com",
  "authorization_endpoint": "https://op.example.com/authorize",
  "token_endpoint": "https://op.example.com/token",
  "userinfo_endpoint": "https://op.example.com/userinfo",
  "jwks_uri": "https://op.example.com/.well-known/jwks.json",
  "end_session_endpoint": "https://op.example.com/logout",
  "scopes_supported": ["openid", "profile", "email", "offline_access"],
  "response_types_supported": ["code", "id_token", "code id_token"],
  "subject_types_supported": ["public", "pairwise"],
  "id_token_signing_alg_values_supported": ["RS256", "ES256"],
  "token_endpoint_auth_methods_supported": ["client_secret_basic", "private_key_jwt"],
  "code_challenge_methods_supported": ["S256"]
}
```

RP sollte überprüfen, dass `issuer` im Dokument genau dem angeforderten issuer entspricht (um Issuer-Verwechslungsangriffe zu verhindern) und kann das Dokument zwischenspeichern (unter Beachtung der HTTP-Cache-Header).

## JWKS, Signaturverifizierung und Key Rotation

`jwks_uri` verweist auf die **JWKS** (JSON Web Key Set, eine Menge öffentlicher Schlüssel) des OP:

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "2024-key-01",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZpt...(Base64URL Modulus)",
      "e": "AQAB"
    }
  ]
}
```

Signaturverifizierungsprozess: Nehmen Sie `kid` aus dem ID-Token-Header, finden Sie den entsprechenden öffentlichen Schlüssel in JWKS und validieren Sie die Signatur nach `alg`.

**Key Rotation (Schlüsselwechsel)**: OP wechselt Signaturschlüssel regelmäßig. JWKS behält normalerweise neue und alte Schlüssel bei; RP sollte JWKS zwischenspeichern und bei unbekanntem `kid` einmal neu abrufen (mit Frequenzlimit, um zu verhindern, dass böswillige Tokens den OP überlasten). Reife Client-Bibliotheken haben diese Logik eingebaut.

## Stabilität von sub: public und pairwise

`sub` ist stabil und wird nie wiederverwendet innerhalb von "gleicher OP + gleicher Benutzer". Es ist der einzig richtige Schlüssel auf der RP-Seite, um lokale Konten zu verknüpfen. OP hat zwei Subjecttypen:

| Typ | Verhalten | Anwendbar |
|------|------|------|
| `public` | Alle RPs sehen denselben `sub` | Häufig Standard; erforderlich für Multi-App-Kontoabstimmung |
| `pairwise` | Jede RP (nach Sektor) sieht einen anderen `sub` | Datenschutzverbesserung: Verhindert, dass mehrere RPs sich abstimmen und ein Benutzerprofil zusammensetzen |

::: danger Verwenden Sie nicht E-Mail als Benutzer-Primärschlüssel
E-Mail kann von Benutzern geändert werden; manche OPs ermöglichen sogar E-Mail-Rückforderung und Neuzuteilung (frühere Mitarbeiterin erhält neue Mitarbeiter). **Lokale Konten müssen die Kombination `iss + sub` als Primärschlüssel verwenden**; E-Mail wird nur für Anzeige/Kontakt verwendet.
:::

## Sitzungen und Abmeldung

In OIDC gibt es zwei Schichten von Sitzungen: **OP-Sitzung** (die SSO-Sitzung nach Benutzer-Anmeldung beim OP, normalerweise ein Cookie unter OP-Domäne) und **RP-Sitzung** (Ihr Anmeldestatus der Anwendung). Die Abmeldungskomplexität entsteht dadurch, dass beide Schichten koordiniert bereinigt werden müssen:

- **RP-Initiated Logout**: Wenn der Benutzer bei RP auf "Abmeldung" klickt, bereinigt RP seine lokale Sitzung und leitet den Browser zu `end_session_endpoint` des OP weiter (mit `id_token_hint` und `post_logout_redirect_uri`), um OP auch die Sitzung zu beenden. Dies ist die häufigste und notwendige Methode, siehe [Typische Flows](./flows.md).
- **Front-Channel Logout**: Wenn eine OP-Sitzung endet, rendert OP auf der Abmeldungsseite für jeden angemeldeten RP einen versteckten iframe, der `frontchannel_logout_uri` jedes RP lädt. RP bereinigt seine Sitzung nach Erhalt der Anfrage. Einfach zu implementieren, aber **unter Third-Party-Cookie-Einschränkungen anfällig**, niedrige Zuverlässigkeit.
- **Back-Channel Logout**: OP sendet direkt Server-zu-Server HTTP POST zu `backchannel_logout_uri` jedes RP mit einem signierten **Logout Token** (ein spezielles JWT mit `sub`/`sid` und `events` Claim, ohne `nonce`). Nach Signaturverifizierung wird die RP-Sitzung zerstört. Nicht vom Browser abhängig, **höchste Zuverlässigkeit**, erfordert aber, dass RP-Sitzungen nach `sid` (Session ID) adressierbar sind, nicht freundlich für stateless JWT-Sitzungsarchitekturen.

Empfehlung: Implementieren Sie RP-Initiated Logout für alle Projekte; nur bei strikten Single-Sign-out-Anforderungen (wie Finanz-, Enterprise-Compliance) Back-Channel Logout hinzufügen.

---

Nächste Schritte: [Typische Flows](./flows.md) lesen, um zu sehen, wie diese Konzepte in einem vollständigen Login zusammenkommen, oder die [Parameter- und Claims-Referenz](./reference.md) konsultieren.
