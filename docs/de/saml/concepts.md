---
title: "Kernkonzepte"
---

# Kernkonzepte

Diese Seite baut schrittweise das Konzeptsystem von SAML 2.0 auf: Rollen → Assertion → Protocol → Binding → Profile → Metadata, zusammen mit NameID, RelayState und XML-Signierung/Verschlüsselung durchgehend.

## Rollen

| Rolle | Beschreibung |
|-------|-------------|
| **Principal** (Hauptakteur) | Die authentifizierte Entität, normalerweise der Endbenutzer mit einem Browser |
| **IdP** (Identity Provider, Identitätsanbieter) | Verantwortlich für die Authentifizierung des Principal und die Ausstellung der Assertion, wie Keycloak, AD FS, Okta, Azure AD |
| **SP** (Service Provider, Diensteanbieter) | Konsumiert die Assertion und bietet dem Benutzer Geschäftsdienste an, als die „vertrauende Partei"-Anwendung |

Jeder IdP und SP ist durch eine global eindeutige **Entity ID** gekennzeichnet (normalerweise ein URI wie `https://sp.example.com/saml/metadata`), die das `<Issuer>`-Element in Protokollnachrichten trägt. Das Vertrauen zwischen SP und IdP wird hergestellt, indem **gegenseitig die Entity ID, Endpunkt-URLs und Signierzertifikate des anderen registriert werden** (siehe unten Metadata).

## Assertion (Behauptung)

Assertion ist ein von IdP ausgestelltes XML-Deklarationsdokument und ist der eigentliche Träger der „Identitätstatsachen" im gesamten Protokoll. Eine Assertion enthält hauptsächlich:

- `<Issuer>`: Aussteller (Entity ID des IdP);
- `<Subject>`: Über wen (enthält NameID und SubjectConfirmation);
- `<Conditions>`: Gültigkeitsbedingungen (Zeitfenster `NotBefore`/`NotOnOrAfter`, Zielgruppenbeschränkung `<AudienceRestriction>`);
- Eine oder mehr **Statement** (Deklarationen).

Drei Statement-Typen:

| Statement | Element | Inhalt | Häufigkeit in der Praxis |
|-----------|---------|--------|--------------------------|
| Authentifizierungserklärung | `<AuthnStatement>` | Wann (`AuthnInstant`) und wie (`AuthnContextClassRef`, z.B. Passwort, MFA) der Hauptakteur authentifiziert wurde; Sitzungsindex `SessionIndex` | Fast immer vorhanden |
| Attributerklärung | `<AttributeStatement>` | Attribute des Hauptakteurs als Schlüssel-Wert-Paare, wie E-Mail, displayName, Gruppenzugehörigkeit | Sehr häufig |
| Autorisierungsentscheidungserklärung | `<AuthzDecisionStatement>` | Entscheidung über „ob der Hauptakteur eine bestimmte Aktion auf einer bestimmten Ressource ausführen darf" (Permit/Deny) | In der Spezifikation als deprecated markiert, praktisch nicht genutzt, Autorisierung üblicherweise XACML oder Anwendung selbst |

Ein vereinfachtes Assertion-Skelett:

```xml
<saml:Assertion xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_a1b2c3d4" Version="2.0" IssueInstant="2026-07-03T08:30:00Z">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <!-- ds:Signature normalerweise hier -->
  <saml:Subject>
    <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
      alice@example.org
    </saml:NameID>
    <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
      <saml:SubjectConfirmationData Recipient="https://sp.example.com/saml/acs"
          NotOnOrAfter="2026-07-03T08:35:00Z" InResponseTo="_req001"/>
    </saml:SubjectConfirmation>
  </saml:Subject>
  <saml:Conditions NotBefore="2026-07-03T08:29:30Z" NotOnOrAfter="2026-07-03T08:35:00Z">
    <saml:AudienceRestriction>
      <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
    </saml:AudienceRestriction>
  </saml:Conditions>
  <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:00Z" SessionIndex="_sess42">
    <saml:AuthnContext>
      <saml:AuthnContextClassRef>
        urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
      </saml:AuthnContextClassRef>
    </saml:AuthnContext>
  </saml:AuthnStatement>
  <saml:AttributeStatement>
    <saml:Attribute Name="mail">
      <saml:AttributeValue>alice@example.org</saml:AttributeValue>
    </saml:Attribute>
  </saml:AttributeStatement>
</saml:Assertion>
```

## Protocol (Protokollnachrichten)

Die Core-Spezifikation definiert eine Reihe von Request/Response-Protokollnachrichten (Namensraum `urn:oasis:names:tc:SAML:2.0:protocol`, üblicherweise Präfix `samlp`):

| Nachrichtenpaar | Zweck |
|-----------------|--------|
| `<AuthnRequest>` → `<Response>` | SP fordert IdP auf, den Benutzer zu authentifizieren; IdP gibt eine Response mit einer Assertion zurück. **Rückgrat des Web SSO** |
| `<LogoutRequest>` → `<LogoutResponse>` | Single Logout, kann von SP oder IdP initiiert werden |
| `<ArtifactResolve>` → `<ArtifactResponse>` | Im Artifact Binding wird eine kurze Referenz durch einen Backend-Kanal gegen die echte Nachricht ausgetauscht |
| `<AttributeQuery>` → `<Response>` | Backend-Kanal Attributabfrage bei Bedarf, in der Praxis selten |
| `<ManageNameIDRequest>` usw. | NameID-Verwaltung/Zuordnung, in der Praxis selten |

Alle Protokollnachrichten teilen eine Reihe gemeinsamer Attribute: `ID` (eindeutige Kennung, verwendet für Wiederholungsschutz und `InResponseTo`-Zuordnung), `Version="2.0"`, `IssueInstant` (Ausstellungszeit, UTC), `Destination` (Empfänger-Endpunkt-URL, Empfänger muss überprüfen, dass es mit sich selbst übereinstimmt).

## Binding (Bindung)

Binding gibt vor, wie Protokollnachrichten auf die konkrete Transportschicht abgebildet werden. Welches Binding verwendet wird, wird von den Metadaten deklariert.

| Binding | Transportmethode | Merkmale und Limits | Typischer Einsatz |
|---------|------------------|---------------------|------------------|
| **HTTP-Redirect** | Nachricht wird DEFLATE-komprimiert + Base64 + URL-kodiert und in Abfrageparameter platziert, dann mit 302-Umleitung übergeben | Begrenzt durch URL-Längenbeschränkung, nur für kleine Nachrichten geeignet; Signatur wird als separate `SigAlg`/`Signature` Abfrageparameter angehängt (keine XML-Signatur) | Versand von `AuthnRequest`, `LogoutRequest` |
| **HTTP-POST** | Nachricht wird Base64-kodiert und in ein automatisch eingereichte HTML-Formularfeld (`SAMLRequest`/`SAMLResponse`) platziert und zum anderen Endpunkt gesendet | Keine Längenbeschränkung, kann große Nachrichten mit eingebetteter XML-Signatur tragen | Rückgabe von `Response` (sehr häufig), kann auch `AuthnRequest` senden |
| **HTTP-Artifact** | Frontend-Kanal überträgt nur eine kurze Referenz, der Empfänger ruft über einen Backend-SOAP-Kanal `ArtifactResolve` auf, um die echte Nachricht abzurufen | Nachricht geht nicht über Browser, besserer Schutz vor Manipulation/Lecks, erfordert aber Netzwerkkonnektivität zwischen SP und IdP, komplexere Bereitstellung | Hochsicherheitsszenarien, in der Praxis seltener |
| **SOAP** | Direkte Server-zu-Server-SOAP-Aufrufe | Reiner Backend-Kanal | ArtifactResolve, Backend-SLO, AttributeQuery |

::: tip Praktische Kombination
Die verbreitetste Kombination ist: **AuthnRequest nutzt HTTP-Redirect, Response nutzt HTTP-POST**. Der Grund ist einfach: AuthnRequest ist klein und passt leicht in eine URL; Response enthält signierte Assertions, die oft mehrere KB bis Dutzende KB groß sind, passen also nur in POST.
:::

## Profile (Profil)

Profile kombiniert Core-Nachrichten und Binding zu End-to-End-Anwendungsfällen:

- **Web Browser SSO Profile**: Das Kernprofil, definiert die Flows SP-initiated und IdP-initiated unter Browserbeteiligung, einschließlich zulässiger Binding-Kombinationen und erzwungener Validierungsregeln (wie bearer SubjectConfirmation `Recipient`/`NotOnOrAfter`/`InResponseTo` Validierung).
- **Single Logout Profile**: Definiert, wie Logout-Nachrichten zwischen den Beteiligten einer Sitzung verbreitet werden.
- Andere: Enhanced Client or Proxy (ECP, Nicht-Browser-Clients), Identity Provider Discovery, Assertion Query usw., weniger häufig verwendet.

Spezifische Flows werden auf der [Typische Flows](./flows.md)-Seite ausführlich behandelt.

## Metadata (Metadaten)

Die Metadata-Spezifikation definiert ein Standard-XML-Format für Entitätskonfigurationen mit `<EntityDescriptor>` als Wurzelelement (Namensraum `urn:oasis:names:tc:SAML:2.0:metadata`), enthält:

- `entityID`: Entitätsidentifikatoren;
- `<IDPSSODescriptor>` oder `<SPSSODescriptor>`: Rollenbeschreiber, deklarieren unterstützte Bindings und Endpunkte (wie IdP `<SingleSignOnService>`, SP `<AssertionConsumerService>`, beider `<SingleLogoutService>`);
- `<KeyDescriptor use="signing|encryption">`: Eingebettete X.509-Zertifikate, deklarieren öffentliche Schlüssel für Signaturverifikation und Verschlüsselung;
- SP-Seite kann auch `AuthnRequestsSigned`, `WantAssertionsSigned` und andere Richtlinienschalter deklarieren.

**Zertifikataustausch ist der Kern der Vertrauensaufbau**: SP ruft das IdP-Signaturzertifikat aus den IdP-Metadaten ab, um Response/Assertion-Signaturen zu verifizieren; IdP ruft das SP-Zertifikat aus den SP-Metadaten ab, um AuthnRequest-Signatur zu verifizieren und Assertion zu verschlüsseln. In der Praxis werden normalerweise Metadaten-XML-Dateien oder Metadaten-URLs direkt ausgetauscht, um Fehler bei manueller Eingabe zu vermeiden.

::: warning Zertifikatrotation
SAML-Vertrauen basiert auf den ausgetauschten Zertifikaten selbst (nicht auf der CA-Kette). Wenn Zertifikate ablaufen oder rotiert werden und die Remote-Metadaten nicht synchron aktualisiert werden, führt dies direkt zu Signaturvalidierungsfehlern und allen Benutzern wird der Zugang verweigert. Bei der Rotation sollten zuerst neue und alte `<KeyDescriptor>` zusammen in den Metadaten existieren, und nach der Remote-Aktualisierung sollten die alten Zertifikate entfernt werden.
:::

## NameID und NameID Format

`<NameID>` ist das Kernelement in Assertion, das den Hauptakteur identifiziert. Das `Format`-Attribut deklariert seine Semantik. Häufige Formate:

| Format URI (Kurzform) | Bedeutung |
|----------------------|-----------|
| `...:1.1:nameid-format:emailAddress` | E-Mail-Form |
| `...:1.1:nameid-format:unspecified` | Unspezifiziert, wird zwischen den Parteien vereinbart |
| `...:2.0:nameid-format:persistent` | Persistente Pseudonyme: stabil für den gleichen SP, unterschiedlich über SPs hinweg, schützt Privatsphäre |
| `...:2.0:nameid-format:transient` | Transiente Kennung: unterschiedlich pro Sitzung, bedeutsam nur innerhalb einer Sitzung |

Der SP deklariert das erwartete Format in `<NameIDPolicy>` der `AuthnRequest`. Die vollständige Liste siehe [Referenzseite](./reference.md#nameid-format-一览).

::: tip
Bei der Kontenzuordnung in Geschäftssystemen sollte **nicht auf E-Mail als unveränderlichen Primärschlüssel vertraut werden** (E-Mail-Adressen ändern sich). Bevorzugt sollte IdP persistent NameID oder in Attributen unveränderliche Mitarbeiter-ID/immutable ID bereitstellen.
:::

## RelayState

RelayState ist ein undurchsichtiger Parameter, der mit SAML-Nachrichten übertragen wird, **gehört aber nicht zur SAML-Nachricht selbst** (im Redirect Binding als Abfrageparameter, im POST Binding als Formularfeld), auf max. 80 Bytes begrenzt.

- **SP-initiated Flow**: Der SP gibt RelayState bei Versand der AuthnRequest mit, IdP muss es unverändert zurückgeben. Der SP verwendet es normalerweise, um sich die „Tiefenverbindung, die der Benutzer vor der Anmeldung besuchen möchte" zu merken, und springt nach erfolgreicher Anmeldung dorthin zurück.
- **IdP-initiated Flow**: RelayState wird von IdP-Seite konfiguriert, normalerweise die Ziel-URL oder ein von SP vereinbarter Identifizierer.

::: danger Sicherheitshinweis
RelayState ist nicht signaturgeschützt und kommt aus einer nicht vertrauenswürdigen Quelle. Der SP muss vor der Umleitung eine **Open-Redirect-Validierung** durchführen (nur relative Pfade oder Whitelist-Domänen zulassen), sonst wird es zu einer Phishing-Schleife. Ein sichererer Weg ist, nur einen zufälligen Schlüssel zu übergeben und die echte URL lokal in der SP-Sitzung/im Cache zu speichern.
:::

## XML-Signierung und Verschlüsselung

### Wo wird signiert

SAML verwendet XML-DSig **enveloped signature** (Signatur ist innerhalb des signierten Elements eingebettet, `<ds:Signature>` folgt unmittelbar auf `<Issuer>`), kann auf drei Ebenen vorkommen:

1. **Assertion-Signatur**: Signierung auf `<saml:Assertion>`, am wichtigsten, fast alle IdPs aktivieren dies standardmäßig;
2. **Response-Signatur**: Signierung auf äußerem `<samlp:Response>`, kann mit Assertion-Signatur gleichzeitig existieren;
3. **AuthnRequest / LogoutRequest Signatur**: Im POST Binding XML-Signatur; **im Redirect Binding ist es keine XML-Signatur**, sondern eine separate Signatur über die Verkettung `SAMLRequest=...&RelayState=...&SigAlg=...`, platziert im `Signature`-Abfrageparameter.

Bei Signaturalgorithmen sollte `rsa-sha256` oder höher verwendet werden, **lehnen Sie `rsa-sha1` ab**; das gleiche für Digest.

### Was der SP beim Signaturverifikation tun muss

1. Verwenden Sie das in den **Metadaten registrierte Zertifikat** zur Verifikation, nicht das in der Nachricht eingebettete `<ds:KeyInfo>`-Zertifikat (eingebettete Zertifikate können nur zur Schlüsselauswahl verwendet werden, nicht als Vertrauensquelle);
2. Stellen Sie sicher, dass die `Reference` der Signatur genau das aktuelle Assertion/Response-Element abdeckt (verhindert **XML Signature Wrapping** Angriffe: Angreifer verschieben legitime Signaturknoten und injizieren gefälschte Knoten. Die Gegenmaßnahme ist „lokalisieren Sie zuerst das signierte Element nach ID, validieren Sie die Referenzeindeutigkeit, lesen Sie dann Geschäftsdaten von diesem Knoten" und verwenden Sie eine gut gepflegte SAML-Bibliothek statt manueller DOM-Verarbeitung);
3. Wenn die Konfiguration erfordert, dass Assertion signiert sein muss, dann **kann eine äußere Response-Signatur die Assertion-Signaturanforderung nicht ersetzen**. Umgekehrt genauso. Führen Sie streng nach lokaler Richtlinie aus.

### Verschlüsselung

Zusätzlich zur Signierung kann IdP die gesamte Assertion mit dem Verschlüsselungszertifikat des SP verschlüsseln, ergibt `<saml:EncryptedAssertion>` (XML-Enc, normalerweise RSA-OAEP mit Hybrid-Verschlüsselung zur Umhüllung von AES-Sitzungsschlüsseln); ähnlich gibt es `<EncryptedID>`, `<EncryptedAttribute>`. Verschlüsselung adressiert **Vertraulichkeit bei Nachrichtendurchleitung durch Browser** (im POST Binding landet die Response im Browser). Die Transportschicht muss immer HTTPS sein, Verschlüsselung ist tiefe Verteidigung darüber. Wird empfohlen, wenn Assertion sensible Attribute enthält.

---

Nächster Schritt: Lesen Sie [Typische Flows](./flows.md), um zu sehen, wie diese Konzepte zu vollständiger Anmeldungs-/Abmeldungsinteraktion zusammenkommen, oder konsultieren Sie direkt [Parameter und Nachrichtenreferenz](./reference.md).
