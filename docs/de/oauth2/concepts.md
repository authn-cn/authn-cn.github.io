---
title: "Kernkonzepte"
---

# Kernkonzepte

Diese Seite erläutert die grundlegenden Bausteine von OAuth 2.0: Rollen, Client-Typen, Token, Scope, Endpoints sowie State und PKCE als zwei kritische Sicherheitsmechanismen. Mit Verständnis dieser Konzepte ist das Lesen der [typischen Flows](./flows.md) sehr reibungslos.

## Vier Rollen

RFC 6749 definiert vier Rollen:

| Rolle | Erklärung | Beispiel |
|------|------|------|
| **Resource Owner (Ressourcenbesitzer)** | Die Entität, die Zugriff auf Ressourcen gewähren kann, normalerweise der Endbenutzer | Sie als Benutzer der Terminplanungs-App |
| **Client (Anwendung)** | Die Anwendung, die im Namen des Resource Owner auf geschützte Ressourcen zugreift | Terminplanungs-App |
| **Authorization Server (AS, Autorisierungsserver)** | Der Server, der den Resource Owner authentifiziert, die Zustimmung einholt und Tokens ausgibt | Google-Kontodienst, Keycloak, Auth0 |
| **Resource Server (RS, Ressourcenserver)** | Der Server, der geschützte Ressourcen hostet und nach Token-Validierung auf diese zugreift | Google Calendar API |

::: tip
Authorization Server und Resource Server können ein und dasselbe System sein (häufig bei kleineren Deployments) oder völlig getrennt (ein AS schützt mehrere APIs). „Client" bezieht sich auf die **Anwendung**, nicht auf „Client-Gerät" oder „Benutzer".
:::

## Client-Typen und Client-Authentifizierung

### Confidential vs Public

| Typ | Definition | Typisches Beispiel |
|------|------|----------|
| **Confidential Client (Vertrauenswürdiger Client)** | Kann Anmeldedaten sicher speichern (z.B. client_secret), normalerweise mit Server-Komponente | Traditionelle Web-App Backend, Backend-Services |
| **Public Client (Öffentlicher Client)** | Kann keine Geheimnisse halten — Code/Binärdatei werden an Benutzer verteilt, jeder Secret kann extrahiert werden | SPA (Browser JavaScript), Mobile App, Desktop/CLI-Anwendung |

Diese Unterscheidung bestimmt das Sicherheitsdesign: Public Client **sollte niemals client_secret haben** (Secret im Frontend-Code oder App-Paket ist gleichbedeutend mit Offenlegung), muss sich auf Mechanismen wie PKCE verlassen.

### Client-Authentifizierungsmethoden

Wenn Confidential Client den Token Endpoint aufruft, muss er seine Identität gegenüber dem AS nachweisen:

| Methode | Mechanismus | Erklärung |
|------|------|------|
| `client_secret_basic` | HTTP Basic Authentication Header: `Authorization: Basic base64(client_id:client_secret)` | RFC 6749 empfohlene Standard-Methode; beachten Sie, dass ID/Secret erst URL-kodiert werden müssen |
| `client_secret_post` | Platzieren Sie `client_id` und `client_secret` im Request Body | Kompatibilitätslösung, nicht so standardisiert wie Basic |
| `private_key_jwt` | Client signiert selbst ein JWT (RFC 7523) mit eigenem Private Key, reicht als `client_assertion` ein | Secret verlässt Client nie, unterstützt Key Rotation, erste Wahl für Finanz-Grade (FAPI) Szenarien |
| mTLS (`tls_client_auth`) | Bidirektionales TLS, authentifiziert mit Client-Zertifikat (RFC 8705) | Kann Token auch an Zertifikat binden (Certificate-Bound Token), verhindert Token-Diebstahl |

::: tip Auswahlempfehlung
Allgemein reicht `client_secret_basic` für Web-Backends; für Sicherheit-kritische Szenarien (Open Banking, B2B-Integration) bevorzugen Sie `private_key_jwt` oder mTLS, um gemeinsame symmetrische Schlüssel zu vermeiden.
:::

## Token

### Access Token (Zugangstoken)

Das Anmeldedatum, das Client beim Zugriff auf Resource Server präsentiert. Wichtige Punkte:

- **Bearer Semantik** (RFC 6750): „Inhaber-Token" — **wer ihn hat, kann ihn verwenden**, keine Validierung des Ausstellers. Deshalb ist Leckageschutz (durchgehend TLS, nicht im Log, nicht in der URL) so kritisch.
- **Kurze Gültigkeitsdauer**: Normalerweise 5 Minuten bis 1 Stunde, wird durch Refresh Token erneuert.
- **Begrenzte Berechtigungen**: Deckt nur die während der Autorisierung genehmigten Scopes ab.

### Refresh Token (Aktualisierungstoken)

Wird verwendet, um **neue Access Tokens nach Ablauf** zu erhalten, ohne dass der Benutzer sich wiederholt anmelden muss:

- Wird nur an Client ausgegeben, wird nur gegen den Token Endpoint des AS verwendet, **nie an Resource Server gesendet**;
- Lange Gültigkeitsdauer (Tage bis Monate), daher höherer Wert, sichere Speicherung erforderlich;
- Moderne Praktiken erfordern **Rotation (Umlauf)** für Public Clients: Bei jeder Nutzung verfällt und ein neues Refresh Token wird ausgegeben, Wiederverwendung alter Tokens gilt als Leckagemerkmal, führt zum Widerruf der gesamten Token-Familie (siehe [Flows-Seite](./flows.md#refresh-token-flow)).

### opaque vs JWT

| Format | Validierungsmethode | Vorteile | Nachteile |
|------|----------|------|------|
| **Opaque (undurchsichtig)** | RS ruft AS Introspection Endpoint auf (RFC 7662) | Sofortiger Widerruf möglich; keine Offenlegung interner Informationen | Netzwerk-Overhead bei jeder Validierung |
| **JWT (selbstenthalten)** | RS validiert mit Public Key des AS lokal (RFC 9068 standardisiert JWT Access Token) | Kein Netzwerk-Overhead, geeignet für hohen Durchsatz/Microservices | Nach Ausstellung nicht sofort widerrufbar, nur durch kurze Gültigkeitsdauer abgefedert |

::: warning
Das Token-Format ist ein Abkommen zwischen AS und RS. **Client sollte den Inhalt von Access Token nicht analysieren**, auch wenn es zufällig JWT ist — behandeln Sie es als opake Zeichenkette. Für Benutzerinformationen verwenden Sie den ID Token oder UserInfo Endpoint von OIDC.
:::

## Scope (Berechtigungsbereich)

`scope` ist eine leerzeichen-getrennte Zeichenkettenliste, die die angeforderten Berechtigungsbereiche des Clients ausdrückt, z.B.:

```text
scope=calendar.read calendar.write profile
```

- AS kann die vom Client angeforderten Scopes **reduzieren** (Benutzer lehnt einige Berechtigungen ab), die endgültig gültigen Scopes werden in der Token-Antwort zurückgegeben;
- Designprinzip: **Minimale Berechtigung**, Trennung von Lesen/Schreiben (`resource.read` / `resource.write`), angemessene Granularität (zu fein macht die Genehmigungsseite unlesbar, zu grob gibt zu viele Berechtigungen);
- Scope drückt aus, „was der Client tun kann", bedeutet nicht „was der Benutzer tun kann" — RS muss immer noch seine eigene Benutzer-Level-Berechtigungsprüfung überlagern.

## redirect_uri und exakte Übereinstimmung

`redirect_uri` ist die Adresse, an die der AS den Authorization Code nach Fertigstellung zurücksendet. **Es ist der Schlüssel zur Sicherheit des Authorization Code Flows**: Wenn ein Angreifer den AS dazu bringt, den Code an eine von ihm kontrollierte Adresse zu senden, kann er die Genehmigung stehlen.

::: danger Exakte Übereinstimmung erforderlich
Der Client registriert die vollständige redirect_uri bei der Registrierung, der Wert in der Autorisierungsanfrage muss **zeichenweise exakt übereinstimmen** (RFC 9700 / OAuth 2.1 erzwingt dies). Verboten:

- Präfix-Matching, Subdomain-Wildcards (`https://*.example.com/cb`);
- Nur Domain-Validierung ohne Pfad;
- Erlauben Sie `redirect_uri` mit beliebigen Query-Parametern und dann „loose matching".

Historisch stammen zahlreiche kritische OAuth-Lecks (offene Weiterleitung → Code-Lecks) von lockerem redirect_uri Checking.
:::

## Endpoints

| Endpoint | Aufgerufen durch | Zweck | Definition |
|------|--------|------|------|
| **Authorization Endpoint** (Autorisierungs-Endpoint) | Benutzer-Browser (Front-Channel) | Benutzer-Login, Autorisierungszustimmung, Authorization Code ausstellen | RFC 6749 |
| **Token Endpoint** (Token-Endpoint) | Client (Back-Channel, Server-zu-Server) | Authorization Code/Refresh Token/Client-Anmeldedaten gegen Token austauchen | RFC 6749 |
| **Revocation Endpoint** (Widerruf-Endpoint) | Client | Unnötige Access/Refresh Tokens aktiv annullieren (z.B. Benutzer Logout, App-Deinstallation) | RFC 7009 |
| **Introspection Endpoint** (Überprüfungs-Endpoint) | Resource Server (authentifizierung erforderlich) | Abfrage, ob Token gültig ist und Metadaten (Scope, Ablaufzeit, Benutzer) | RFC 7662 |

Endpoint-Adressen können über **AS Metadata** (RFC 8414) automatisch erkannt werden: Rufen Sie `https://as.example.com/.well-known/oauth-authorization-server` auf, um ein JSON-Konfigurationsdokument zu erhalten, vermeiden Sie Hardcoding.

## State Parameter und CSRF-Schutz

`state` ist ein zufälliger, nicht erratbarer Wert, den der Client in der Autorisierungsanfrage mitbringt, und den AS bei der Rückleitung unverändert zurückgibt. Der Client muss validieren, dass der `state` im Callback mit dem in der Sitzung gespeicherten Wert übereinstimmt.

Er schützt vor Angriff (Login-CSRF / Session Confusion): Angreifer könnten mit **ihrem eigenen** Authorization Code eine Callback-URL konstruieren und das Opfer täuschen, die Sitzung des Opfers wird stillschweigend an das Angreifer-Konto gebunden, nachfolgende Daten, die das Opfer eingibt (z.B. Datei-Upload, Zahlungsmethode), fallen auf das Angreifer-Konto.

Anforderungen:

- Bei jeder Autorisierungsanfrage einen neuen, cryptographisch zufälligen `state` (≥128 Bit Entropie) generieren und an Benutzer-Sitzung binden;
- Bei Callback **zuerst State validieren, sofort abbrechen bei Nichtübereinstimmung**;
- Nach Verwendung von PKCE kann PKCE auch diese Angriffsfläche abdecken, aber `state` ist immer noch empfohlen (kann auch Replay-Schutz und Kontextwiedererstellung spielen; wenn Sie es für Geschäftsstatus verwenden, setzen Sie nur nicht-fälschbare Referenzen statt Klartext).

## PKCE

**PKCE** (Proof Key for Code Exchange, RFC 7636, ausgesprochen "pixy") fügt Code-Austausch einen dynamischen Nachweis hinzu und schützt vor **Authorization Code Abfang-Angriffen**.

### Prinzip

1. Client generiert vor jeder Autorisierung eine zufällige Zeichenkette `code_verifier` (43–128 Zeichen, cryptographisch zufällig);
2. Berechnen Sie `code_challenge = BASE64URL(SHA256(code_verifier))`, die **S256** Methode;
3. Autorisierungsanfrage enthält `code_challenge` und `code_challenge_method=S256`, AS speichert diese mit dem issued Authorization Code;
4. Wenn Client Code gegen Token austauscht, reichen Sie den ursprünglichen `code_verifier` ein;
5. AS führt dieselbe SHA256-Operation auf erhaltene Verifier durch, vergleicht mit zuvor gespeichertem Challenge, lehnt ab bei Nichtübereinstimmung.

Selbst wenn Angreifer Authorization Code abfängt (bösartige App registriert gleiche Custom URL Scheme, System-Log-Lecks, Browser-Chronik), haben sie kein entsprechendes `code_verifier` und können Austausch nicht abschließen.

```text
code_verifier  = dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk   (zufällig generiert, nur Client kennt)
code_challenge = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM   (nach SHA256 base64url)
```

::: warning Verwenden Sie nicht die Plain-Methode
`code_challenge_method=plain` (Challenge ist gleich Verifier) ist nur für legacy fallback, verliert Einweg-Schutz. Verwenden Sie immer **S256**.
:::

### Warum für alle Clients empfohlen

PKCE wurde ursprünglich für Public Clients wie Mobile Apps entwickelt, aber **RFC 9700 und OAuth 2.1 erfordern, dass alle Clients mit Authorization Code Mode (einschließlich Confidential Clients mit client_secret) PKCE verwenden**, Gründe:

- client_secret kann nur nachweisen „das ist dieser Client", kann **diesen einen Authorization Code** nicht an **diese eine Anfrage** binden; PKCE bietet Bindung auf Transaktions-Ebene;
- PKCE kann Authorization Code Injection verteidigen (Angreifer injiziert gestohlene Code in Opfer-Callback) — solche Angriffe sind auch für Confidential Clients gültig;
- Implementierungs-Kosten sind minimal (zwei Hash-Operationen), einheitlich aktivieren hat keinen Overhead.

## Nächste Schritte

- [Typische Flows](./flows.md): Sehen Sie, wie diese Konzepte sich zu vollständigen Autorisierungs-Flows kombinieren
- [Typische Parameter und Antwort-Referenz](./reference.md): Schnellreferenz für Parameter und Fehler-Codes aller Endpoints
