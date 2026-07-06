---
title: Kernkonzepte
---

# Kernkonzepte

Diese Seite erläutert wiederholt auftretende Begriffe und Modelle in WebAuthn. Es wird empfohlen, zuerst die [Übersicht](./README.md) zu lesen, dann diese Seite und zum Schluss [Ablauf](./flows.md) und [Referenz](./reference.md).

## Public-Key-Anmeldedaten-Modell

Der Kern von WebAuthn ist ein **asymmetrisches Schlüsselpaar**. Jedes Mal, wenn sich ein Benutzer auf einer **Relying Party (RP, abhängige Partei)** registriert, generiert der Authentifizierer **ein brandneues Schlüsselpaar**:

- **Privater Schlüssel (private key)**: Gespeichert in der sicheren Hardware innerhalb des **Authenticators (Authentifizierers)**, **verlässt den Authentifizierer niemals**. Weder RP noch Browser bekommen Zugriff.
- **Öffentlicher Schlüssel (public key)**: Wird an die RP zurückgegeben und von der RP zusammen mit dem Benutzerkonto gespeichert.

Schlüsseleigenschaften:

- **Ein RP, ein Konto, ein Schlüsselpaar**: Schlüssel werden nach `(rpId, Benutzerkonto)` isoliert. Anmeldedaten von verschiedenen Sites sind unabhängig und können nicht zum Cross-Site-Tracking verwendet werden.
- **Anmeldung über Signatur**: Bei der Authentifizierung signiert der Authentifizierer die vom RP stammende Herausforderung mit dem privaten Schlüssel. Der RP validiert die Signatur mit dem gespeicherten öffentlichen Schlüssel. Der Server speichert niemals etwas, das zum Anmelden verwendet werden kann.

::: tip
Das ist der Grund, warum WebAuthn gegen Serveroffenlegungen resistent ist: Die Datenbank enthält nur öffentliche Schlüssel. Selbst wenn diese offengelegt werden, können Angreifer keine Signaturen fälschen oder den privaten Schlüssel rekonstruieren.
:::

## Credential ID und credentialPublicKey

Nach erfolgreicher Registrierung muss die RP zwei Dinge speichern:

- **Credential ID**: Ein eindeutiger Handle, den der Authentifizierer diesem Schlüsselpaar zuweist (Bytezeichenfolge, häufig Base64URL-kodiert gespeichert). Bei der Authentifizierung gibt die RP ihn über `allowCredentials` an den Authentifizierer zurück, wodurch der Authentifizierer den entsprechenden privaten Schlüssel lokalisiert.
- **credentialPublicKey**: Der öffentliche Schlüssel des Benutzers, kodiert im **COSE (CBOR Object Signing and Encryption)Key**-Format (RFC 8152). Es ist eine CBOR-Map, die den Schlüsseltyp (`kty`), den Algorithmus (`alg`, z.B. -7 für ES256) sowie Kurven-/Koordinaten- oder Modulus-Parameter enthält.

Die RP-Server parst normalerweise den öffentlichen Schlüssel und persistiert ihn in einer signaturfreundlichen Form (z.B. PEM oder natives COSE).

## Attestation und Assertion

Dies sind zwei extrem leicht zu verwechselnde, aber völlig unterschiedliche Wörter:

- **Attestation (Beglaubigung)**: Findet bei der **Registrierungszeremonie** statt. Der Authentifizierer kann zusammen mit dem neuen öffentlichen Schlüssel eine verifizierbare Aussage beifügen ("Ich bin ein Authentifizierer des Modells/Herstellers X"), die es der RP ermöglicht, die **Herkunft und Vertrauenswürdigkeit** des Authentifizierers zu bestätigen.
- **Assertion (Behauptung)**: Findet bei der **Authentifizierungszeremonie** statt. Das **Signaturobjekt** des Authentifizierers für die Herausforderung, das der RP **beweist, dass der Benutzer derzeit den entsprechenden privaten Schlüssel hat**.

Das Attestationformat wird durch das Feld `fmt` identifiziert. Häufige Formate:

| fmt | Bedeutung |
|-----|------|
| `none` | Keine Attestation bereitgestellt, Authentifizierer-Herkunft nicht verifizierbar. **In den meisten Verbraucherszenarios empfohlen**, beste Privatsphäre. |
| `packed` | FIDO2-Universalformat, kann Authentifizierer-Signatur und X.509-Zertifikatskette enthalten. |
| `fido-u2f` | Format kompatibel mit älteren U2F-Sicherheitsschlüsseln. |
| `tpm` | TPM-basierte Beglaubigung. |
| `apple` | Anonymisierte Attestation für Apple-Plattform-Authentifizierer. |
| `android-key` / `android-safetynet` | Android-Plattform-Beglaubigung. |

::: warning
Nur in Enterprise-/High-Assurance-Szenarien (müssen den Authentifizierer auf ein bestimmtes Hersteller-Modell beschränken) ist es notwendig, Attestation-Zertifikatsketten zu parsen und zu validieren. Die meisten Anwendungen sollten `attestation: "none"` anfordern, um unnötige Datenschutzbelastung und Implementierungskomplexität zu vermeiden.
:::

## Ceremony: Registrierung und Authentifizierung

Der WebAuthn-Standard verwendet **ceremony (Zeremonie)**, um einen kompletten interaktiven Prozess zu bezeichnen, der Benutzer, Browser, Authentifizierer und RP umfasst. Es gibt zwei Arten:

1. **Registration ceremony (Registrierungszeremonie)**: Eine neue Anmeldedaten erstellen, `navigator.credentials.create()` aufrufen, Attestation produzieren.
2. **Authentication ceremony (Authentifizierungszeremonie)**: Bestehende Anmeldedaten zum Anmelden verwenden, `navigator.credentials.get()` aufrufen, Assertion produzieren.

Die Server-Logik beider ist symmetrisch: Sie müssen zuerst Optionen mit einer Herausforderung ausstellen, dann die Antwort des Authentifizierers validieren. Details siehe [Ablauf](./flows.md).

## Challenge und Schutz vor Wiederholung

**Challenge (Herausforderung)** ist eine **kryptographisch zufällige Zahl**, die die RP zu Beginn jeder Zeremonie erzeugt (empfohlen ≥ 16 Bytes). Sie wird dem Browser ausgegeben, schließlich in `clientDataJSON` geschrieben und in den Bereich der Authentifizierer-Signatur aufgenommen.

Wichtige Punkte zum Schutz vor Wiederholung:

- Die Herausforderung muss **vom Server erzeugt, an die aktuelle Sitzung gebunden und nur einmal verwendet werden**. Nach der Validierung sollte sie sofort verworfen werden.
- Bei der Validierung muss die RP die zurückgegebene Herausforderung mit der ausgegebenen **byte-für-byte vergleichen**.
- Verwenden Sie keine vorhersehbaren Werte (Zeitstempel, auto-inkrementelle IDs) als Herausforderung.

## rpId und Origin-Bindung

Die Grundlage der Phishing-Resistenz sind zwei Ebenen der Bindung:

- **rpId**: Die Kennung der RP, muss die **registrierbare Domäne (registrable domain)** oder deren Subdomain der aktuellen Seite sein. Wenn die Origin beispielsweise `https://login.example.com` ist, kann `rpId` `login.example.com` oder `example.com` sein, aber nicht `example.org`. Der Authentifizierer nimmt SHA-256 von `rpId` und erhält `rpIdHash`, das in `authenticatorData` geschrieben wird und an die Anmeldedaten gebunden ist.
- **Origin**: Der Browser schreibt die vollständige Origin der aktuellen Seite (z.B. `https://login.example.com`) in `clientDataJSON.origin`. Dieser Wert wird **vom Browser** gefüllt und kann von der Seite JS nicht gefälscht werden.

Phishing-Resistenzprinzip: Eine Phishing-Site `example.evil.com` kann `rpId` nicht auf `example.com` setzen (erfüllt nicht die Domäne-Anforderung). Selbst wenn der Authentifizierer verleitet wird, gibt er keine Signatur zurück, die für `example.com` verwendet werden kann. Gleichzeitig stellt die RP bei der Signaturvalidierung fest, dass `clientDataJSON.origin` nicht die erwartete gültige Origin ist und lehnt ab.

::: danger
Einmal für eine Anmeldedaten gesetzt, kann `rpId` nicht mehr geändert werden. Wenn Sie später unterdomänenübergreifende Verwendung benötigen, sollten Sie bei der Registrierung die registrierbare Domäne (z.B. `example.com`) statt des konkreten Hostnamens verwenden, andernfalls können bestehende Anmeldedaten nicht in anderen Subdomänen verwendet werden.
:::

## User Verification (UV) und User Presence (UP)

Der Authentifizierer meldet in `authenticatorData.flags` zwei wichtige Bits:

- **UP (User Presence, Benutzerpräsenz)**: Beweist "dass eine physische Person den Authentifizierer betätigt hat" (z.B. einen Sicherheitsschlüssel berührt). Nahezu alle Zeremonien erfordern UP=1.
- **UV (User Verification, Benutzerverifizierung)**: Beweist "dass der Bediener der Kontoinhaber ist" durch lokale Verifizierung mit PIN, Fingerabdruck, Gesichtserkennung usw. UV=1 bedeutet, dass dies **Multi-Faktor ist** (Authentifizierer-Besitz + Biometrie/PIN).

Die RP drückt Erwartungen durch den Parameter `userVerification` aus: `required` (UV erforderlich), `preferred` (UV wenn möglich), `discouraged` (nicht erforderlich, nur UP). Bei der Signaturvalidierung **muss die RP Flags nach Geschäftsanforderungen überprüfen** und darf nicht nur auf Anfrageparameter vertrauen.

## Resident Key / Discoverable Credential

- **Non-resident (nicht-ansässige)** Anmeldedaten: Der private Schlüssel wird nicht in aufzählbarem Authentifizierer-Speicher gespeichert. Bei der Authentifizierung muss die RP die Credential ID über `allowCredentials` bereitstellen, um sie zu verwenden. Geeignet für Szenarien mit "Benutzername-Eingabe zuerst, dann Authentifizierung" als zweiter Faktor.
- **Resident key / Discoverable credential (ansässige / erkennbare Anmeldedaten)**: Anmeldedaten und Benutzerhandle werden im Authentifizierer gespeichert und können vom Browser direkt aufgezählt werden. Unterstützt **namenslose Anmeldung**. Dies ist die technische Grundlage von **Passkey**. Wird über `authenticatorSelection.residentKey` (`required`/`preferred`/`discouraged`) angefordert.

## Signatur-Zähler zur Klonbekämpfung

`authenticatorData` enthält einen **signature counter (Signatur-Zähler)** `signCount`, der mit jeder Signatur des Authentifizierers monoton zunimmt. Die RP sollte den letzten gesehenen Zählwert speichern:

- Ist der neue Wert **> alter Wert**: Normal, Update-Speicher.
- Ist der neue Wert **≤ alter Wert** (und nicht durchgehend 0): Möglicherweise ist eine **Anmeldedaten-Klonage** aufgetreten. Die RP sollte warnen oder ablehnen.

::: warning
Einige Plattform-Authentifizierer (besonders synchronisierte Passkeys) geben immer `signCount = 0` zurück. In diesem Fall ist der Zähler bedeutungslos. Die RP sollte nicht grundsätzlich basierend darauf ablehnen, sondern nur "echte Rückfälle" wie "von Null zu kleinerem Nicht-Null springen" handhaben.
:::

## Datenschutzüberlegungen zu Attestation

Wenn Attestation-Zertifikate **eindeutig** für einen Authentifizierer-Batch sind, können sie zu einer standortübergreifend verknüpfbaren Kennung werden und beeinträchtigen die Benutzer-Privatsphäre. Daher:

- FIDO-Spezifikationen erfordern, dass Attestation-Zertifikate mindestens 100.000 Geräte umfassen (Batch-Attestation, batch attestation), um zu vermeiden, dass einzelne Maschinen identifizierbar sind.
- Plattform-Authentifizierer verwenden häufig anonymisierte Attestation (z.B. Apples anonyme CA, Androids anonymization CA).
- Sofern nicht ausdrücklich ein Enterprise-Compliance-Bedarf besteht, sollte die RP `attestation: "none"` anfordern, damit der Browser Identifizierungsinformationen nicht überträgt oder entfernt.

Nächste Schritte: Siehe [Registrations- und Authentifizierungsablauf](./flows.md) für vollständige Zeremonie und Codebeispiele.
