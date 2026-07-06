---
title: Registrations- und Authentifizierungsablauf
---

# Registrations- und Authentifizierungsablauf

WebAuthn hat zwei **ceremony (Zeremonien)**: Registrierung und Authentifizierung. Beide haben symmetrische Struktur – die RP stellt zuerst Optionen mit **challenge (Herausforderung)** aus, der Browser treibt die Authentifizierer-Erstellung an, und die RP führt dann strikte Validierung durch. Für Terminologie siehe [Kernkonzepte](./concepts.md), für Felddetails siehe [Referenz](./reference.md).

## Eins. Registrierungszeremonie

### Schrittweiser Ablauf

1. **RP-Server erzeugt `PublicKeyCredentialCreationOptions`**: Enthält eine einmalige `challenge`, `rp` (RP-Information), `user` (Benutzerhandle), `pubKeyCredParams` (akzeptable Algorithmen) sowie optionale `authenticatorSelection`, `excludeCredentials`, `attestation`. `challenge` und `user.id` sind binär und müssen in Base64URL für das Frontend kodiert werden.
2. **Frontend dekodiert und ruft `navigator.credentials.create()` auf**: Nach dem Dekodieren von Base64URL-Feldern zu `ArrayBuffer` aufrufen. Browser validiert die Übereinstimmung zwischen `rp.id` und aktueller Origin.
3. **Browser + Authentifizierer**: Browser stellt `clientDataJSON` zusammen und fordert über CTAP den Authentifizierer auf. Der Authentifizierer validiert Benutzer (UP/UV), generiert ein neues Schlüsselpaar, speichert den privaten Schlüssel und produziert `attestationObject`.
4. **Authentifizierer gibt `PublicKeyCredential` zurück**: Sein `response` ist `AuthenticatorAttestationResponse`, enthält `attestationObject` und `clientDataJSON`.
5. **Frontend sendet Ergebnis (Base64URL-kodiert) POST an RP**.
6. **RP validiert und persistiert**: Challenge/Origin/Type/Flags validieren, `attestationObject` parsen um `credentialPublicKey`, `credentialId`, `signCount` zu extrahieren und zusammen mit dem Benutzerkonto zu speichern.

### Frontend-Beispiel: Registrierung einleiten

```js
// options von RP, challenge / user.id / excludeCredentials[].id sind Base64URL-Strings
const options = await fetch('/webauthn/register/options', {
  method: 'POST', credentials: 'include',
}).then(r => r.json());

// Base64URL zu ArrayBuffer konvertieren
const b64urlToBuf = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer;

options.challenge = b64urlToBuf(options.challenge);
options.user.id = b64urlToBuf(options.user.id);
if (options.excludeCredentials) {
  options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const cred = await navigator.credentials.create({ publicKey: options });

// Ergebnis zurück zu Base64URL kodieren und an RP senden
const bufToB64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

await fetch('/webauthn/register/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type, // "public-key"
    response: {
      clientDataJSON: bufToB64url(cred.response.clientDataJSON),
      attestationObject: bufToB64url(cred.response.attestationObject),
      transports: cred.response.getTransports?.() ?? [],
    },
  }),
});
```

### JSON-Beispiel: `PublicKeyCredentialCreationOptions` (von RP ausgegeben, Felder sind Base64URL)

```json
{
  "rp": { "id": "example.com", "name": "Example Corp" },
  "user": {
    "id": "S3v9Y2k...Base64URL...",
    "name": "alice@example.com",
    "displayName": "Alice"
  },
  "challenge": "b3Blbi1jaGFsbGVuZ2UtcmFuZG9t",
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "excludeCredentials": [
    { "type": "public-key", "id": "ZXhpc3RpbmctY3JlZC1pZA", "transports": ["internal"] }
  ],
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "preferred"
  },
  "attestation": "none"
}
```

### JSON-Beispiel: Registrierungsrückgabe (Frontend POST an RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwi...",
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YV...",
    "transports": ["internal", "hybrid"]
  }
}
```

::: tip
`excludeCredentials` listet bereits registrierte Anmeldedaten dieses Benutzers auf und verhindert eine **Neu-Registrierung auf demselben Authentifizierer**. Wenn der Authentifizierer eine entsprechende vorhandene Anmeldedaten findet, weigert er sich und meldet `InvalidStateError`.
:::

## Zwei. Authentifizierungszeremonie

### Schrittweiser Ablauf

1. **RP erzeugt `PublicKeyCredentialRequestOptions`**: Enthält eine neue einmalige `challenge`, `rpId`, optionale `allowCredentials` (Credential ID-Liste des registrierten Benutzers), `userVerification`. Für namenslose Passkey-Anmeldung kann `allowCredentials` leer gelassen werden.
2. **Frontend ruft `navigator.credentials.get()` auf**: Browser validiert Origin erneut und fordert Benutzer auf, einen Authentifizierer auszuwählen/zu validieren.
3. **Authentifizierer**: Lokalisiert den privaten Schlüssel (über `allowCredentials` oder erkennbare Anmeldedaten), validiert UP/UV, signiert `authenticatorData ‖ SHA-256(clientDataJSON)` mit dem privaten Schlüssel.
4. **Gibt `PublicKeyCredential` zurück**: `response` ist `AuthenticatorAssertionResponse`, enthält `authenticatorData`, `clientDataJSON`, `signature` und im Szenario erkennbarer Anmeldedaten `userHandle`.
5. **Frontend sendet POST an RP**.
6. **RP validiert**: Ruft den gespeicherten öffentlichen Schlüssel über Credential ID (oder `userHandle`) ab, validiert Challenge/Origin/Type/Flags/Counter, validiert die Signatur mit dem öffentlichen Schlüssel. Bei Erfolg ist die Anmeldung erfolgreich und `signCount` wird aktualisiert.

### Frontend-Beispiel: Authentifizierung einleiten

```js
const options = await fetch('/webauthn/login/options', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice@example.com' }), // kann bei namenloser Anmeldung weggelassen werden
}).then(r => r.json());

options.challenge = b64urlToBuf(options.challenge);
if (options.allowCredentials) {
  options.allowCredentials = options.allowCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const assertion = await navigator.credentials.get({ publicKey: options });

await fetch('/webauthn/login/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: assertion.id,
    rawId: bufToB64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufToB64url(assertion.response.clientDataJSON),
      authenticatorData: bufToB64url(assertion.response.authenticatorData),
      signature: bufToB64url(assertion.response.signature),
      userHandle: assertion.response.userHandle
        ? bufToB64url(assertion.response.userHandle) : null,
    },
  }),
});
```

### JSON-Beispiel: `PublicKeyCredentialRequestOptions` (von RP ausgegeben)

```json
{
  "challenge": "YXV0aC1jaGFsbGVuZ2UtcmFuZG9t",
  "timeout": 60000,
  "rpId": "example.com",
  "allowCredentials": [
    { "type": "public-key", "id": "AbCd...credentialId-base64url", "transports": ["internal"] }
  ],
  "userVerification": "preferred"
}
```

### JSON-Beispiel: Authentifizierungsrückgabe (Frontend POST an RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi...",
    "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MdAAAAAA",
    "signature": "MEUCIQD...der-encoded-ecdsa-signature",
    "userHandle": "S3v9Y2k...Base64URL"
  }
}
```

## Drei. RP-Server-Validierungscheckliste

Unabhängig von Registrierung oder Authentifizierung **muss** der Server jeden Punkt validieren (vertrauen Sie nicht dem Frontend):

1. **Parsen Sie `clientDataJSON`** zu JSON.
2. **`type` korrekt**: Registrierung muss `"webauthn.create"` sein, Authentifizierung muss `"webauthn.get"` sein.
3. **Challenge stimmt überein**: `clientDataJSON.challenge` (Base64URL) dekodiert und **byte-für-byte** identisch mit dieser Sitzung ausgegebener Challenge; diese Challenge wurde noch nicht verwendet.
4. **Origin stimmt überein**: `clientDataJSON.origin` gehört zu einem berechtigten Origin-Set der RP (genaue Zeichenfolge, einschließlich Protokoll und Port).
5. **(Optional) `crossOrigin`** Wenn `true`, muss es den Geschäftserwartungen entsprechen, normalerweise sollte es `false` sein.
6. **`rpIdHash` validieren**: Erste 32 Bytes von `authenticatorData` entsprechen `SHA-256(rpId)`.
7. **Flags validieren**: `UP` Bit muss 1 sein. Wenn Multi-Faktor erforderlich ist, muss `UV` Bit 1 sein.
8. **Signatur-Zähler**: Vergleichen Sie `signCount` mit gespeichertem Wert. Neuer Wert sollte größer sein (außer für Authentifizierer mit konstant 0).
9. **Signatur-Validierung (nur Authentifizierungszeremonie)**: Verwenden Sie den gespeicherten öffentlichen Schlüssel, um `signature` gegen `authenticatorData ‖ SHA-256(clientDataJSON)` zu validieren.
10. **Algorithmus konsistent**: Der Validierungsalgorithmus stimmt mit bei Registrierung aufgezeichnetem `alg` überein.

::: tip
Es wird dringend empfohlen, etablierte Bibliotheken zu verwenden (wie Server `@simplewebauthn/server`, Frontend `@simplewebauthn/browser`, Gos `go-webauthn`, Javas `webauthn4j`) um CBOR-Parsing, COSE-Public-Key-Konvertierung und Signatur-Validierung zu handhaben, statt diese kryptographischen Details manuell zu schreiben.
:::

## Vier. Häufige Fallstricke

::: warning
- **Challenge ist nicht einmalig**: Nicht nach Validierung verworfen, führt zu Wiederholung. Muss vom Server gespeichert, an Sitzung gebunden und nach Verwendung gelöscht werden.
- **Origin nicht exakt verglichen**: Mit `endsWith` oder ignorierten Ports/Protokollen verglichen, kann umgangen werden. Muss exakt die ganze Zeichenfolge vergleichen.
- **Counter-Verarbeitung fehlerhaft**: Synchronisierte Passkeys mit konstant 0 direkt wegen "nicht steigernd" ablehnen; oder echte Rückfallserkennung verpassen.
- **rpId stimmt nicht mit Origin überein**: `rp.id` ist nicht die registrierbare Domäne der aktuellen Domäne oder deren übergeordnet, `create()`/`get()` wirft direkt `SecurityError`.
- **Base64 und Base64URL gemischt**: WebAuthn verwendet **Base64URL ohne Padding**; Verwechslung mit standardmäßigem Base64 führt zu Dekodierungsverwerfung.
- **`excludeCredentials` vergessen**: Dasselbe Authentifizierer wird doppelt registriert, erzeugt redundante Anmeldedaten.
- **Nur auf `userVerification` in Anfrageparametern vertrauen**: Muss UV-Flag in der Antwort auf dem Server überprüfen, nicht annehmen, dass der Authentifizierer die Anforderung befolgt hat.
- **Keine Benutzer-Präsenz Timeout/Wiederholung-Verarbeitung**: `create()`/`get()` wirft möglicherweise `NotAllowedError` bei Timeout oder Benutzer-Abbruch. Frontend sollte freundlich vorgehen.
:::

Weiterlesen: [Parameter- und Datenstruktur-Referenz](./reference.md).
