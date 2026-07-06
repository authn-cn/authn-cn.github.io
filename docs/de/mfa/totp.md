---
title: HOTP / TOTP Algorithmen im Detail
---

# HOTP / TOTP Algorithmen im Detail

Diese Seite zerlegt den Berechnungsprozess von HOTP (RFC 4226) und TOTP (RFC 6238), gibt die Bit-Operationsdetails der dynamischen Kürzung an und beilegen einer ausführbaren JavaScript-Referenzimplementierung. Es wird empfohlen, zuerst [Überblick](./README.md) zu lesen.

## Gemeinsamer Schlüssel (shared secret)

OTP ist ein **symmetrisches** Schema: Server und Benutzergerät besitzen denselben Schlüssel K (Shared Secret). Der Schlüssel ist eine ursprüngliche Byte-Sequenz, wird aber zur Vereinfachung der manuellen Eingabe und des QR-Code-Transports normalerweise mit **Base32** (RFC 4648) als Großbuchstaben `A–Z` und Ziffern `2–7` kodiert.

```
Ursprüngliche Schlüsselbytes: 0x48 0x65 0x6C 0x6C 0x6F ...
Base32 Kodierung:  JBSWY3DPEHPK3PXP   (Zeichenkette beim Eingeben in den Authenticator)
```

::: tip
Base32 wurde statt Base64 gewählt, weil Base32 keine leicht zu verwechselnden Zeichen enthält, Groß-/Kleinschreibung unempfindlich ist und sich für manuelle Eingabe eignet. Die empfohlene Schlüssellänge beträgt mindestens 160 Bit (20 Bytes, entsprechend SHA-1 Block), d.h. 32 Base32-Zeichen. Siehe [Base32-Beschreibung auf der Referenzseite](./reference.md).
:::

Der Server **muss den gemeinsamen Schlüssel verschlüsselt speichern** (z.B. mit KMS/Envelope-Verschlüsselung), da er bei Undichtheit sofort dazu führt, dass Angreifer alle Einmalpasswörter des Benutzers offline klonen können.

## HOTP-Algorithmus Schritt für Schritt (RFC 4226)

Die Eingabe für HOTP sind der Schlüssel K und ein 8-Byte-Zähler C, die Ausgabe ist ein `digits`-stelliger Dezimalcode.

### Schritte

1. **Zählerpufferkonstruktion**: Kodieren Sie den Zähler C als **8-Byte-Reihenfolge (Big-Endian)** Sequenz.
2. **HMAC berechnen**: `HS = HMAC-SHA1(K, C)`, erhält einen 20-Byte-Auszug.
3. **Dynamische Kürzung (dynamic truncation)**: Wählen Sie 4 Bytes aus den 20 Bytes basierend auf den unteren 4 Bits des letzten Bytes.
4. **Modulo**: Behandeln Sie diese 4 Bytes als 31-Bit-Ganzzahl, modulo `10^digits`, mit führenden Nullen bis `digits` Stellen.

```
HOTP(K, C) = Truncate(HMAC-SHA1(K, C)) mod 10^digits
```

### Bit-Operationsdetails der dynamischen Kürzung

Sei `HS` der 20-Byte-Auszug mit Index 0–19:

1. Nehmen Sie die **unteren 4 Bits** des letzten Bytes `HS[19]` als Offset: `offset = HS[19] & 0x0F`, Bereich 0–15.
2. Nehmen Sie 4 Bytes ab `offset`, kombinieren Sie sie zu einer 32-Bit-Ganzzahl und **löschen Sie das höchstwertige Bit** (`& 0x7F` für das erste Byte), um eine 31-Bit-Zahl ohne Vorzeichen zu erhalten und Vorzeichen-Mehrdeutigkeit zu vermeiden:

```
binCode = ((HS[offset]   & 0x7F) << 24)
        | ((HS[offset+1] & 0xFF) << 16)
        | ((HS[offset+2] & 0xFF) <<  8)
        |  (HS[offset+3] & 0xFF)
```

3. Modulo ergibt den endgültigen Code: `otp = binCode mod 10^digits`, z.B. digits=6 dann `mod 1000000`.

::: tip Beispiel (aus RFC 4226 Anhang D)
Schlüssel K = ASCII `"12345678901234567890"`, Zähler C = 0:
`HMAC-SHA1` Auszug letzte Byte unteren 4 Bits geben offset = 6, Kürzung ergibt 31-Bit-Ganzzahl, `mod 10^6 = 755224`.
Die 6-stelligen HOTP-Codes für aufeinanderfolgende Zähler 0..9 sind: `755224, 287082, 359152, 969429, 338314, 254676, 287922, 162583, 399871, 520489`. Diese Werte sind Standard-Test-Vektoren zur Überprüfung der Implementierungskorrektheit.
:::

## TOTP-Algorithmus (RFC 6238)

TOTP ersetzt einfach den Zähler in HOTP durch einen **Zeitschritt** T:

```
T = floor((aktuelle Unix-Zeit - T0) / period)
TOTP(K) = HOTP(K, T)
```

Standard-Parameterwerte:

- `T0`: Zeitreferenzpunkt, Standard **0** (Unix-Epoche).
- `period` (Zeitschrittweite, auch X genannt): Standard **30** Sekunden.
- `digits`: Standard **6**.
- Hash-Algorithmus: Standard **SHA-1**.

Mit anderen Worten: Subtrahieren Sie T0 vom aktuellen Unix-Zeitstempel (Sekunden), dividieren Sie ganzzahlig durch period und erhalten Sie die Nummer des aktuellen Zeitfensters. Nutzen Sie diese Fensternummer als Zähler für HOTP. Innerhalb eines 30-Sekunden-Fensters bleibt T unverändert und der generierte Code ist gleich. Nach Überschreitung der Fenstergrenze wird der Code automatisch aktualisiert.

## Zeittoleranzen bei der Verifikation

Das Benutzergerät und die Serveruhr können zeitversetzt sein, und die Benutzereingabe benötigt Zeit. Bei der Verifikation darf man **nicht nur den aktuellen Zeitschritt vergleichen**, sondern sollte angrenzende Zeitschritte überprüfen:

1. Berechnen Sie den aktuellen Zeitschritt des Servers `T`.
2. Berechnen und vergleichen Sie TOTP mit der Benutzereingabe im Bereich `[T - window, T + window]` (normalerweise `window = 1`, d.h. ±1 Schritt = ±30 Sekunden).
3. Bei Treffer erfolgreich; wenn alle fehlschlagen, Fehler.

::: warning
Das Toleranzfenster ist ein **Kompromiss zwischen Sicherheit und Benutzerfreundlichkeit**: Je größer das Fenster, desto nachgiebiger, aber auch das Wiedergabefenster für Angreifer vergrößert sich. Empfohlen ist `window = 1` (Gesamte gültige Spanne etwa 90 Sekunden). Vergrößern Sie das Fenster nicht übermäßig, um "Support-Tickets zu reduzieren". Ein besserer Ansatz ist, Benutzer bei der Gerätezeiteinstellung zu unterstützen.
:::

Der Vergleich sollte **Constant-Time-Vergleiche** verwenden, um zu vermeiden, dass Antwortzeiten Informationen verraten.

## Optionale Parameter

- **Hash-Algorithmus**: SHA-1 / SHA-256 / SHA-512 sind alle möglich (TOTP-Spezifikation erlaubt es). Beachten Sie, dass die HMAC-Ausgabenlänge unterschiedlich ist (20/32/64 Bytes), aber die Logik der dynamischen Kürzung ändert sich nicht (verwendet immer die unteren 4 Bits des letzten Bytes für den Offset).
- **digits**: Normalerweise 6, in einigen hochsicheren Fällen 8.
- Siehe Details auf [Parametertabelle auf der Referenzseite](./reference.md).

::: danger Kompatibilitätserinnerung
Obwohl die Spezifikation SHA-256/512 und 8-stellige Codes unterstützt, **unterstützen die meisten großen Authenticator-Apps zuverlässig nur die Standard-Kombinationen SHA-1 / 6-stellig / 30 Sekunden**. Ohne starke Anforderungen sollten Sie sich an die Standard-Kombination halten, um Interoperabilität zu gewährleisten.
:::

## Sicherheitsüberlegungen

- **Schlüssel-Entropie**: Erzeugen Sie zufällig ≥160 Bit Schlüssel mit CSPRNG (Cryptographically Secure Random Number Generator), niemals wiederverwenden oder vorhersehbare Werte nutzen.
- **Schutz vor Wiedergabe**: Speichern Sie den Zeitschritt der letzten erfolgreichen Verwendung des Benutzers und lehnen Sie Codes aus diesem oder einem früheren Zeitschritt ab, um zu verhindern, dass derselbe Code innerhalb von 30 Sekunden wiedergegeben wird.
- **Rate Limiting**: Der 6-stellige Code-Raum hat nur 1 Million Möglichkeiten, Sie müssen Versuche begrenzen (z.B. nach N Fehlschlägen sperren/Backoff), sonst kann es brute-force angegriffen werden.
- **Zeitsynchronisation**: Der Server nutzt NTP zur Uhrengenauigkeit; Taktabweichungen des Clients sind der häufigste Ausfallgrund.
- **Bindungsschutz**: Nach dem Importieren des Schlüssels den Benutzer auffordern, zuerst den aktuellen Code einzugeben zur Bestätigung, dann MFA aktivieren.
- **Übertragung und Speicherung**: Schlüssel werden nur einmal beim Binden heruntergeladen, verschlüsselt gespeichert, Frontend zeigt nicht an.

## Backup-Codes (backup / recovery codes)

Der Benutzer könnte sein Authenticator-Gerät verlieren. Bei Aktivierung von TOTP sollte eine einmalige Reihe von **Einmal-Backup-Codes** (z.B. 10 hochentropische Zufallscodes) generiert werden für den Notfall:

- Jeder Backup-Code kann **nur einmal verwendet** werden, danach ist er ungültig.
- Der Server sollte Backup-Codes wie Passwörter **mit Hash speichern** (z.B. bcrypt/argon2), nicht im Klartext.
- Benutzer auffordern, offline zu speichern (Druck/Passwort-Manager) und Neugenerierung unterstützen (alte Codes alle ungültig).

## Komplette TOTP-Referenzimplementierung (JavaScript / Node.js)

```js
const crypto = require('crypto');

// Base32 (RFC 4648) in Buffer dekodieren; Füllung und Groß-/Kleinschreibung ignorieren
function base32Decode(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.replace(/=+$/, '').toUpperCase().replace(/\s/g, '');
  let bits = 0, value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error('非法 Base32 字符: ' + ch);
    value = (value << 5) | idx;   // Jedes Zeichen trägt 5 Bit
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// HOTP: key ist Key Buffer, counter ist Integer-Zähler
function hotp(key, counter, { digits = 6, algorithm = 'sha1' } = {}) {
  // 1. Zähler in 8-Byte Big-Endian kodieren
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  // 2. HMAC
  const hs = crypto.createHmac(algorithm, key).update(buf).digest();

  // 3. Dynamische Kürzung
  const offset = hs[hs.length - 1] & 0x0f;
  const binCode =
      ((hs[offset]     & 0x7f) << 24) |
      ((hs[offset + 1] & 0xff) << 16) |
      ((hs[offset + 2] & 0xff) << 8)  |
       (hs[offset + 3] & 0xff);

  // 4. Modulo und führende Nullen
  const otp = binCode % 10 ** digits;
  return otp.toString().padStart(digits, '0');
}

// TOTP: basierend auf Zeitschritt HOTP
function totp(base32Secret, {
  time = Date.now(),   // Millisekunden
  t0 = 0, period = 30, digits = 6, algorithm = 'sha1',
} = {}) {
  const key = base32Decode(base32Secret);
  const counter = Math.floor((Math.floor(time / 1000) - t0) / period);
  return hotp(key, counter, { digits, algorithm });
}

// Verifikation: Toleranzfenster ±window Zeitschritte, Treffer gibt true zurück
function verifyTotp(token, base32Secret, {
  time = Date.now(), t0 = 0, period = 30,
  digits = 6, algorithm = 'sha1', window = 1,
} = {}) {
  const key = base32Decode(base32Secret);
  const current = Math.floor((Math.floor(time / 1000) - t0) / period);
  for (let w = -window; w <= window; w++) {
    const candidate = hotp(key, current + w, { digits, algorithm });
    // Constant-Time-Vergleich, um Timing-Seitenkanalangriffe zu vermeiden
    if (candidate.length === token.length &&
        crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(token))) {
      return true;
    }
  }
  return false;
}

// Beispiel
const secret = 'JBSWY3DPEHPK3PXP';
console.log(totp(secret));                 // Aktueller 6-stelliger Code
console.log(verifyTotp(totp(secret), secret)); // true
```

::: tip
Produktionsumgebungen müssen das Rad nicht neu erfinden: Das Node-Ökosystem bietet reife Bibliotheken wie `otplib`, `speakeasy` etc. Die obige Implementierung dient zum Verständnis der internen Mechanik und zum Testen von Vektoren.
:::

Nächster Schritt: Lesen Sie [otpauth URI und Parametrerreferenz](./reference.md), um zu erfahren, wie Sie den Schlüssel als QR-Code für die Verteilung an Authenticator-Apps verpacken.
