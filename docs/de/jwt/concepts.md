---
title: "Kernkonzepte"
---

# Kernkonzepte

## Die drei Segmente im Detail

Ein JWT in JWS-Form besteht aus drei Base64URL-codierten Segmenten, die mit `.` verbunden sind: `header.payload.signature`.

### Header

Beschreibt die Metainformationen des Tokens selbst; am wichtigsten ist der Signaturalgorithmus:

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "2024-key-01"
}
```

| Feld | Bedeutung |
|------|------|
| `alg` | Signatur-/Verschlüsselungsalgorithmus. Bei JWS häufig `HS256`, `RS256`, `ES256`, `PS256` (Werte siehe [Referenz](./reference.md#alg-werte)) |
| `typ` | Tokentyp, üblicherweise `JWT`; das access token nach RFC 9068 verwendet `at+jwt` |
| `kid` | Key ID, gibt an, mit welchem Schlüssel die Signatur geprüft wird; lokalisiert zusammen mit [JWKS](../oidc/concepts.md#jwks-signaturverifizierung-und-key-rotation) den öffentlichen Schlüssel |

### Payload (Claims)

Eine Menge von Aussagen. Drei Kategorien:

- **Registrierte Claims (Registered Claims)**: von RFC 7519 vordefinierte Standardfelder wie `iss`, `sub`, `aud`, `exp`, `nbf`, `iat`, `jti`.
- **Öffentliche Claims (Public Claims)**: bei IANA registriert oder mit kollisionssicherer Benennung (z. B. `email`, `name` aus OIDC).
- **Private Claims (Private Claims)**: benutzerdefinierte Felder, die Aussteller und Konsument privat vereinbaren.

```json
{
  "iss": "https://op.example.com",
  "sub": "1234567890",
  "aud": "s6BhdRkqt3",
  "exp": 1767226800,
  "iat": 1767223200,
  "roles": ["admin", "editor"]
}
```

Vollständige Feldbedeutungen siehe [Parameter & Claims – Referenz](./reference.md).

### Signature

Signatur über die ersten beiden Segmente (`base64url(header)` + `"."` + `base64url(payload)`) mit dem in `alg` des Headers angegebenen Algorithmus. Jede Änderung an Header/Payload macht die Signatur ungültig.

## Signaturalgorithmen: symmetrisch vs. asymmetrisch

| Familie | Vertreter | Schlüssel | Einsatz |
|------|------|------|------|
| **HMAC** | `HS256` / `HS384` / `HS512` | **gemeinsamer Schlüssel** (Aussteller und Prüfer nutzen denselben) | Ausstellung + Prüfung innerhalb eines einzelnen Systems; der Schlüssel muss streng geheim bleiben |
| **RSA** | `RS256` / `PS256` … | **Privatschlüssel signiert, öffentlicher Schlüssel prüft** | Szenarien über Parteien hinweg: OP signiert mit Privatschlüssel, beliebiger RP prüft mit öffentlichem Schlüssel (OIDC-Standard `RS256`) |
| **ECDSA** | `ES256` / `ES384` … | Privatschlüssel signiert, öffentlicher Schlüssel prüft (elliptische Kurven) | wie RSA, kürzere Signaturen und bessere Performance |

::: tip Warum OIDC standardmäßig asymmetrisch verwendet
Bei asymmetrischen Algorithmen muss der OP nur den öffentlichen Schlüssel veröffentlichen (über [JWKS](../oidc/concepts.md#jwks-signaturverifizierung-und-key-rotation)); jeder RP kann damit die Signatur prüfen, ohne ein gemeinsames Geheimnis zu teilen. Genau das braucht man, wenn "ein OP unzählige RPs bedient". Mit dem [JWK-Generator](../tools/jwk.md) können Sie Test-Schlüsselpaare erstellen.
:::

## Ablauf der Signaturprüfung

Nach Erhalt eines JWT sollte der Konsument (z. B. RP oder Ressourcenserver) der Reihe nach:

1. **In drei Segmente zerlegen**, den Header Base64URL-decodieren und `alg` sowie `kid` auslesen.
2. **Schlüssel bestimmen**: bei HMAC den vereinbarten gemeinsamen Schlüssel; bei asymmetrischen Verfahren nach `kid` den passenden öffentlichen Schlüssel aus JWKS holen.
3. **Signatur verifizieren**: das dritte Segment mit dem in `alg` angegebenen Algorithmus prüfen.
4. **Claims validieren**: `exp` nicht abgelaufen, `nbf`/`iat` plausibel (geringe Zeitabweichung tolerieren, üblicherweise ≤ 5 Minuten); `iss`, `aud` gleich den erwarteten Werten.
5. Erst wenn alles erfolgreich war, ist der Payload vertrauenswürdig.

::: danger Drei fatale Fallstricke bei der Signaturprüfung
1. **`alg: none` akzeptieren**: Ein Angreifer ändert den Algorithmus auf `none` und entfernt die Signatur. **Man muss eine `alg`-Whitelist pflegen und `none` niemals akzeptieren.**
2. **Algorithmusverwechslung (RS256 → HS256)**: Ein Angreifer ändert einen asymmetrischen Algorithmus auf HMAC und **verwendet den öffentlich bekannten RSA-Public-Key als gemeinsamen HMAC-Schlüssel**, um eine Signatur zu fälschen. **Der Prüfer muss die erwartete Algorithmusfamilie festlegen und darf sich nicht blind auf das `alg` im Token verlassen.**
3. **Nur decodieren, nicht verifizieren**: dem Payload direkt vertrauen. Die ersten beiden Segmente kann jeder ändern; ohne Signaturprüfung gibt es keinerlei Sicherheit.

Verwenden Sie ausgereifte Bibliotheken (jose, openid-client, die offiziellen SDKs der jeweiligen Sprache) und schreiben Sie die Prüflogik nicht selbst. Mit dem [JWT-Parser](../tools/jwt.md) dieser Website können Sie den Unterschied zwischen Decodieren und Signaturprüfung live erleben.
:::

## Die drei OIDC-Tokens: Wer ist ein JWT und wer nicht

Ein OIDC-Autorisierungscode-Flow liefert bis zu drei Tokens, deren Spezifikationsvorgaben **völlig unterschiedlich** sind —— dies ist das Schlüsselszenario, um die Zugehörigkeit von JWT zu verstehen.

| Token | JWT? | Wer verifiziert/konsumiert | Kann der Client (RP) es parsen? |
|-------|---------|--------------|---------------------|
| **ID Token** | **muss sein** (JWS-signiert) | Client (RP) | ✅ muss geparst und validiert werden |
| **Access Token** | **optional** (siehe RFC 9068) | Ressourcenserver | ❌ als opak behandeln |
| **Refresh Token** | **meist nicht** | Autorisierungsserver | ❌ niemals parsen |

### ID Token —— muss ein JWT sein

Die OIDC-Spezifikation legt eindeutig fest, dass das ID Token ein signiertes JWT ist; sein Zweck ist es, "die Identität des Benutzers zu belegen". Der RP muss die Signatur prüfen und `iss`/`aud`/`exp`/`nonce` einzeln validieren. Details siehe [OIDC Kernkonzepte · Validierungsprüfliste für RP](../oidc/concepts.md#validierungsprufliste-fur-rp).

### Access Token —— die Spezifikation verlangt kein JWT

Für den RP sollte das access token **opak (undurchsichtig)** sein; der RP reicht es nur an den Ressourcenserver weiter und sollte es nicht parsen. Das tatsächliche Format hängt vom Autorisierungsserver ab:

- **opak (zufälliger String)**: Der Ressourcenserver validiert online über den **Token-Introspection**-Endpunkt ([RFC 7662](https://www.rfc-editor.org/rfc/rfc7662)).
- **JWT**: Viele moderne AS (Entra ID, Keycloak, Auth0) formen das access token nach [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068) als JWT (`typ: at+jwt`), damit der Ressourcenserver die Signatur **lokal prüfen** kann und sich jede Netzwerkanfrage spart.

::: warning Auch wenn ein access token wie ein JWT aussieht, sollte sich der Client nicht auf seinen Inhalt verlassen
Ein als JWT geformtes access token dient dem **Ressourcenserver** zur Signaturprüfung. Der Autorisierungsserver kann es jederzeit wieder auf ein opakes Format umstellen; parst Ihr Client-Code es, bricht er zusammen.
:::

### Refresh Token —— fast nie ein sinnvolles JWT

Für den Client völlig opak; sein einziger Zweck ist es, beim Autorisierungsserver ein neues access token einzutauschen. Für das Format gibt es keine Vorgabe der Spezifikation; üblicherweise ein hochentropischer Zufallsstring (der AS speichert dazu einen Datensatz) oder ein verschlüsselter String, den nur der AS selbst entschlüsseln kann. **Der Client darf es niemals parsen.**

## Wie man erkennt, ob ein Refresh Token ungültig ist

Da das Refresh Token für den Client opak ist, **können Sie kein `exp` herauslesen und daher nicht aktiv und zuverlässig vorhersagen, ob es abgelaufen ist —— Sie erfahren es erst beim Verwenden.**

### Weg 1: beim Verwenden auf den Fehler achten (am gängigsten, am zuverlässigsten)

Tauschen Sie das Refresh Token am token endpoint gegen neue Tokens; ist es bereits ungültig, antwortet der Autorisierungsserver:

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": "invalid_grant",
  "error_description": "Token is expired or revoked"
}
```

**`invalid_grant` ([RFC 6749 §5.2](https://www.rfc-editor.org/rfc/rfc6749#section-5.2)) ist das Standardsignal für "dieses Refresh Token ist nicht mehr verwendbar"**; es unterscheidet nicht, ob das Token abgelaufen, widerrufen oder durch Rotation entwertet wurde —— für den Client ist das Ergebnis dasselbe: **lokale Sitzung löschen und zur erneuten Anmeldung weiterleiten**. Die Standardlogik lautet "optimistisch annehmen, dass es gültig ist, und erst reagieren, wenn man eines Besseren belehrt wird":

```
access token abgelaufen
  → mit dem refresh token ein neues eintauschen
     → Erfolg: neue Tokens speichern (Achtung Rotation, siehe unten), fortfahren
     → invalid_grant: auch das refresh token ist weg → erneut anmelden
```

### Weg 2: bei der Ausstellung `expires_in` festhalten (nur schätzbar, unzuverlässig)

Manche AS geben ein **nicht standardisiertes** Feld zurück (je Anbieter unterschiedlich), das auf die Lebensdauer des Refresh Tokens hinweist:

```json
{
  "access_token": "...",
  "expires_in": 3600,
  "refresh_token": "...",
  "refresh_token_expires_in": 2592000
}
```

Nur als Anhaltspunkt: Die meisten AS geben es nicht zurück; selbst wenn doch, kann das Refresh Token durch Widerruf, Passwortänderung, Nebenläufigkeitsgrenzen, Rotation usw. **vorzeitig ungültig** werden.

### Wichtiger Fallstrick: Refresh Token Rotation

Moderne AS (besonders für SPA / Mobile) aktivieren meist die Rotation: Bei jedem Eintausch eines Refresh Tokens **wird das alte sofort entwertet und gleichzeitig ein neues Refresh Token ausgegeben**. Folgen:

1. Sie müssen **jedes zurückgegebene neue Refresh Token persistieren**, sonst verwenden Sie beim nächsten Mal ein bereits entwertetes.
2. Wird ein bereits benutztes altes Refresh Token erneut verwendet (Verdacht auf Kompromittierung), **entwertet der AS die gesamte Token-Kette** —— dann erhalten Sie selbst bei "nicht abgelaufen" ein `invalid_grant`.

::: tip Praxisfazit
Versuchen Sie nicht, vorherzusagen, ob ein Refresh Token abgelaufen ist. **Behandeln Sie `invalid_grant` als einzige Quelle der Wahrheit**: Bei Erhalt Sitzung löschen und zur Anmeldung weiterleiten; bei aktivierter Rotation stets das neu zurückgegebene Refresh Token speichern.
:::

## Weiterführende Lektüre

- [Parameter & Claims – Referenz](./reference.md) —— registrierte Claims, `alg`-Werte, RFC-Index
- [OIDC Kernkonzepte](../oidc/concepts.md) —— ID-Token-Validierungsprüfliste, JWKS und Key Rotation
- [OAuth 2.0-Dokumentation](../oauth2/) —— Position von access token und refresh token im Autorisierungsablauf
