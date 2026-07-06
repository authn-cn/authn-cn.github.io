---
title: "Typische Flows"
---

# Typische Flows

Diese Seite behandelt die drei wichtigsten Flows: SP-initiated SSO, IdP-initiated SSO und Single Logout (SLO). Vor dem Lesen wird empfohlen, sich mit Binding und Assertion-Struktur auf der [Kernkonzepte](./concepts.md)-Seite vertraut zu machen.

Die folgenden Beispiele vereinbaren:

- SP Entity ID: `https://sp.example.com/saml/metadata`, ACS-Adresse: `https://sp.example.com/saml/acs`
- IdP Entity ID: `https://idp.example.org/saml/metadata`, SSO-Adresse: `https://idp.example.org/sso`

## SP-initiated SSO (Redirect + POST)

Die häufigste Kombination: AuthnRequest nutzt HTTP-Redirect Binding, Response nutzt HTTP-POST Binding.

### Schritt-für-Schritt Flow

1. Der Benutzer greift auf eine geschützte Ressource `https://sp.example.com/app/dashboard` zu, SP stellt fest, dass keine lokale Sitzung existiert.
2. SP generiert `<AuthnRequest>`, speichert seine `ID` (später zur Validierung von `InResponseTo`), speichert die gewünschte Rücksprungtiefenverbindung in RelayState (oder speichert lokal, RelayState nur Schlüssel).
3. SP führt AuthnRequest durch **deflate-Kompression → Base64-Kodierung → URL-Kodierung** durch, hängt es an IdP SSO Endpunkt als Abfrageparameter an, 302-Umleitung des Browsers.
4. Browser fragt IdP an. IdP validiert AuthnRequest (ist Issuer ein registrierter SP, ist `AssertionConsumerServiceURL` konsistent mit Metadaten, ist Signatur erforderlich).
5. Benutzer authentifiziert sich beim IdP (Passwort/MFA eingeben; wenn IdP bereits eine Sitzung hat, Anmeldeseite überspringen).
6. IdP konstruiert `<Response>` (enthält signierte Assertion, `InResponseTo` mit AuthnRequest ID), Base64-kodiert und in automatisch eingereichte Formular gestellt, an Browser zurückgegeben.
7. Browser POSTet automatisch Formular (`SAMLResponse` + `RelayState`) zu SPs ACS (Assertion Consumer Service) Endpunkt.
8. SP führt alle Validierungen durch (siehe unten Validierungsprüfliste), erstellt lokale Sitzung, springt gemäß RelayState zu `https://sp.example.com/app/dashboard`.

### AuthnRequest Beispiel

```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_req_8f3a2b1c9d4e"
    Version="2.0"
    IssueInstant="2026-07-03T08:29:55Z"
    Destination="https://idp.example.org/sso"
    AssertionConsumerServiceURL="https://sp.example.com/saml/acs"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>
  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef>
      urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
</samlp:AuthnRequest>
```

### Redirect URL Kodierungsmethode

Im Redirect Binding wird der `SAMLRequest`-Parameter wie folgt generiert (Reihenfolge ist kritisch):

1. **DEFLATE-Kompression**: Raw deflate auf XML-Klartext (RFC 1951, **kein zlib-Header**, d.h. Python `zlib.compress(data, 9)[2:-4]` oder `wbits=-15`);
2. **Base64-Kodierung** (Standard-Alphabet, nicht URL-safe Variante);
3. **URL-Kodierung** (Prozent-Kodierung, da Base64-Ergebnis `+` `/` `=` enthält).

```http
GET /sso?SAMLRequest=fZJNb9swDIbv%2BRUC77bl2E1qIU6...
    &RelayState=%2Fapp%2Fdashboard
    &SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256
    &Signature=GtN2t7Jf...%3D HTTP/1.1
Host: idp.example.org
```

Zum Signieren der Anfrage: Berechnen Sie die Signatur über den String `SAMLRequest=<v>&RelayState=<v>&SigAlg=<v>` (jeder Wert ist URL-kodiert, in dieser festen Reihenfolge, nur mit tatsächlich vorhandenen Parametern), Base64-kodieren Sie ihn, und hängen Sie ihn als `Signature`-Parameter an. **Redirect Binding Signatur ist NICHT innerhalb des XML**.

::: warning Häufige Kodierungsfehler
- Deflate vergessen, oder Kompression mit zlib-Header → IdP meldet „unable to inflate/parse request";
- URL-safe Base64 verwendet → Dekodierungsfehler;
- Bereits URL-kodierte Strings doppelt kodiert, oder Framework auto-dekodiert und dann manuell dekodiert → `%` Parsing-Fehler.
:::

### Response Beispiel

IdP sendet Response über automatisch eingereichte Formular an SP zurück:

```http
POST /saml/acs HTTP/1.1
Host: sp.example.com
Content-Type: application/x-www-form-urlencoded

SAMLResponse=PHNhbWxwOlJlc3BvbnNlIC4uLg%3D%3D&RelayState=%2Fapp%2Fdashboard
```

`SAMLResponse` nach Base64-Dekodierung (POST Binding **nur Base64, kein deflate**):

```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_resp_5e6f7a8b"
    Version="2.0"
    IssueInstant="2026-07-03T08:30:10Z"
    Destination="https://sp.example.com/saml/acs"
    InResponseTo="_req_8f3a2b1c9d4e">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_asrt_9c0d1e2f" Version="2.0"
                  IssueInstant="2026-07-03T08:30:10Z">
    <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_asrt_9c0d1e2f">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>Kx7...=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>hR4k...=</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        alice@example.org
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            Recipient="https://sp.example.com/saml/acs"
            NotOnOrAfter="2026-07-03T08:35:10Z"
            InResponseTo="_req_8f3a2b1c9d4e"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2026-07-03T08:29:40Z"
                     NotOnOrAfter="2026-07-03T08:35:10Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:10Z"
                         SessionIndex="_sess_20260703_42">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="mail"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>alice@example.org</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Alice Zhang</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

### SP-seitige Validierungsprüfliste (alle erforderlich)

1. `Status/StatusCode` ist `Success`;
2. Signaturverifikation (Metadaten-registriertes Zertifikat verwenden; Richtlinie erfordert Assertion und/oder Response signiert);
3. `Issuer` ist gleich erwartete IdP Entity ID;
4. `Destination` und `SubjectConfirmationData/@Recipient` sind gleich SPs ACS URL;
5. `InResponseTo` entspricht einer unbenutzten AuthnRequest ID des SP, nachdem Abgleich wird diese ID sofort als verbraucht markiert;
6. Zeitfenster `<Conditions>` gültig, `<Audience>` enthält SPs Entity ID;
7. Assertion `ID` wurde noch nicht verarbeitet (Wiederholungsschutz, Cache bereits gesehener IDs innerhalb des Gültigkeitsfensters).

### Häufige Fallstricke

::: warning Häufige Fallstricke
- **Zeitabweichung**: IdP und SP Uhren weichen um Dutzende Sekunden ab, treffen `NotBefore`/`NotOnOrAfter` Grenzen. Beide sollten NTP aktivieren; SP-Validierung sollte 2-3 Minuten Clock-Skew-Toleranz erlauben, nicht aber 5+ Minuten.
- **Audience-Validierung fehlt**: Ohne `<Audience>` Validierung kann ein von IdP für Anwendung A ausgestelltes Assertion zum Anmelden bei Anwendung B (gleicher IdP) missbraucht werden (horizontale Eskalation). Audience ist **SP Entity ID**, nicht ACS URL.
- **InResponseTo-Validierung fehlt**: Ohne Validierung kein Wiederholungsschutz/Injection-Schutz, Angreifer können abgefangene Responses in beliebige Sitzungen injizieren. Beachte: IdP-initiated Flow hat kein InResponseTo, SP muss zwei Richtlinien unterscheiden.
- **ACS URL ist HTTP oder Wildcard**: ACS muss exakte HTTPS-Adresse sein.
- **RelayState Open-Redirect**: Siehe [Kernkonzepte](./concepts.md#relaystate).
:::

## IdP-initiated SSO

Benutzer klickt auf das Symbol einer Anwendung im IdP-Portal (Anwendungsliste), um direkt zum SP zu gelangen, **ohne AuthnRequest-Phase**.

### Schritt-für-Schritt Flow

1. Benutzer meldet sich im IdP-Portal an, klickt auf das Zielapp-Symbol;
2. IdP konstruiert direkt eine signierte Response für den SP (**ohne `InResponseTo`**), RelayState wird gemäß IdP-Konfiguration gefüllt (normalerweise Ziel-URL);
3. Browser POSTet Formular zu SPs ACS;
4. SP validiert und etabliert Sitzung (überspringt InResponseTo-Validierung, andere Validierungsitems sind gleich wie SP-initiated).

### Sicherheitsaspekte

::: danger Inhärente Schwäche von IdP-initiated
Da Response nicht einer von SP ausgelösten Anforderung entspricht, kann SP die Nachricht nicht durch `InResponseTo` an seinen eigenen Flow binden, daher:

- **Kann nicht natürlich gegen Response-Injection/CSRF-Anmeldung schützen** (Angreifer können eine gültige Assertion des Opfers in den Browser des Opfers POSTen, damit das Opfer beim Angreifer „angemeldet" wird, also Login CSRF);
- Kann sich nur darauf verlassen: Assertion mit sehr kurzer Gültigkeitsdauer, strenge einmalige ID-Wiederholungsschutz, stabile Audience/Recipient-Validierung;
- Deaktivieren wenn möglich: Wenn kein Business-Bedarf existiert, sollte SP **IdP-initiated standardmäßig deaktivieren**. IdP-Portal-Symbole können SP-initiated Flow triggern (zu SP Login-Initiierungs-URL springen) um Experience mit Sicherheit zu verbinden.
:::

## Single Logout (SLO)

Ziel von SLO: Benutzer-Sitzungen bei IdP und allen angemeldeten SPs beenden. Nachrichten sind `<LogoutRequest>`/`<LogoutResponse>`, Frontend-Kanal üblicherweise HTTP-Redirect Binding. IdP nutzt `SessionIndex` und NameID aus Assertion beim Anmelden, um zu beendende Sitzungen zu lokalisieren.

### Von SP eingeleitetes SLO

1. Benutzer klickt „Abmelden" auf SP1. SP1 beendet lokale Sitzung, sendet signierte `<LogoutRequest>` zu IdP SLO Endpunkt (Redirect Binding, enthält NameID und SessionIndex);
2. IdP validiert, durchläuft andere SPs (SP2, SP3 …) dieser IdP-Sitzung, sendet über Browser-Umleitung `<LogoutRequest>` an jede, jede beendet Sitzung und antwortet `<LogoutResponse>`;
3. IdP beendet eigene Sitzung, gibt letztlich `<LogoutResponse>` an Initiator SP1 zurück (Status kann Success oder PartialLogout sein);
4. SP1 zeigt „Abgemeldet"-Seite.

`LogoutRequest` Beispiel:

```xml
<samlp:LogoutRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_lo_3c4d5e6f" Version="2.0"
    IssueInstant="2026-07-03T09:00:00Z"
    Destination="https://idp.example.org/slo">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
    alice@example.org
  </saml:NameID>
  <samlp:SessionIndex>_sess_20260703_42</samlp:SessionIndex>
</samlp:LogoutRequest>
```

### Von IdP eingeleitetes SLO

1. Benutzer klickt „Globale Abmeldung" im IdP-Portal (oder Admin erzwingt Abmeldung);
2. IdP sendet nacheinander `<LogoutRequest>` an alle SPs dieser Sitzung, sammelt `<LogoutResponse>` von jedem;
3. IdP beendet eigene Sitzung und zeigt Ergebnis.

### Häufige Fallstricke

::: warning Häufige Fallstricke
- **SLO ist notorisch fragil**: Frontend-Kanal SLO nutzt Browser-Umleitung durch alle SPs. Wenn ein SP-Endpunkt down/timeout/Zertifikat-Fehler ist, bricht die Kette, nachfolgende SPs bekommen kein Logout-Signal. Muss `PartialLogout`-Status richtig handhaben und melden, nicht dem Benutzer „alles abgemeldet" lügen.
- **SessionIndex nicht gespeichert**: Wenn SP beim Anmelden nicht `SessionIndex` in lokale Sitzung speichert, kann LogoutRequest nicht gefüllt werden, manche IdPs lehnen dann ab oder melden alle Benutzer-Sitzungen ab.
- **LogoutRequest muss validiert**: Unsigniertes/unvalidiertes LogoutRequest wird DoS — Angreifer können Benutzer beliebig abmelden.
- **Third-Party Cookie Limit**: Browser-Beschränkungen auf Third-Party Cookies in iframe beeinträchtigen iframe-basiertes paralleles SLO, vorzugsweise sequenzielle Umleitung nutzen.
- **Timeout-Fallback**: Viele reale Einsätze wählen letztlich „nur lokales Logout + kurze IdP-Sitzungsdauer" pragmatischer Ansatz; wenn genutzt, muss Sicherheitsteam explizit die restlichen Risiken akzeptieren (andere SP-Sitzungen bleiben aktiv).
:::

---

Detaillierte Erklärung jedes Elements/Parameters in [Typische Parameter und Nachrichtenreferenz](./reference.md).
