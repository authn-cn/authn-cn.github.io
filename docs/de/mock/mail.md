---
title: Mail-Server
---

# Mock Mail-Server

Ein **einsatzbereiter Online-Posteingang**, nutzt [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) um E-Mails zu empfangen, schreibt in D1, kann online oder per API angesehen werden und extrahiert automatisch Einmal-Verifizierungscodes. Typische Verwendung: Test **Email Einmal-Verifizierungscode (email OTP / HOTP), Magic Links** —— Das Test-System sendet Verifizierungscode an eine `@authn.tech` Adresse, der Test ruft sofort die API auf um ihn abzurufen.

**Online Posteingang: <https://mock.authn.tech/mail/>** (benötigt spezifische E-Mail-Adresse)

## Wie man es nutzt

1. Senden Sie Verifizierungscode / Link E-Mail zu beliebiger `@authn.tech` Adresse, z.B. `otp@authn.tech` (lokaler Name beliebig).
2. Online anschauen: Öffnen Sie [`/mail/?to=otp@authn.tech`](https://mock.authn.tech/mail/?to=otp@authn.tech), klicken Sie auf Subject um Details und gerenderter Body anzuschauen.
3. Oder API abrufen (passend für CI / Automatisierung):

```bash
# Abrufen der neuesten E-Mail dieser Adresse, enthält automatisch extrahierten Code
curl "https://mock.authn.tech/mail/api/latest?to=otp@authn.tech"
# → { "from": "...", "subject": "...", "code": "135790", "text": "...", ... }
```

Wenn Sie keine echte Empfang brauchen, können Sie eine "Fake E-Mail" einspritzen um zu testen:

```bash
curl -X POST https://mock.authn.tech/mail/api/inject \
  -H 'Content-Type: application/json' \
  -d '{"to":"otp@authn.tech","subject":"Login Verification Code","text":"Ihr Verifizierungscode ist 135790"}'
```

## Endpunkte

| Endpunkt | Beschreibung |
|------|------|
| `GET /mail/?to=<address>` | Online Posteingang (**muss** Empfängeradresse angeben) |
| `GET /mail/view/<id>` | Online Ansicht einzelner E-Mail |
| `GET /mail/api/messages?to=<address>&limit=` | Listen JSON |
| `GET /mail/api/messages/<id>` | Einzelne JSON (enthält Body) |
| `GET /mail/api/latest?to=<address>` | Neueste JSON, enthält extrahierten `code` |
| `POST /mail/api/inject` | Fake E-Mail einspritzen (`to` erforderlich) |
| `POST /mail/api/clear?to=<address>` | Leere E-Mails einer Adresse |

::: warning Muss Empfänger angeben
Aus Datenschutz, Liste / Neueste / Leere **müssen alle spezifische Empfängeradresse** `to` tragen; biete nicht "alle Posteingänge ansehen" an. Absender können nur die Adresse sehen, die sie verwenden, stören sich nicht gegenseitig.
:::

::: danger Nur zum Testen
Das ist ein öffentlicher Mock Posteingang: Jeder, der die Empfängeradresse kennt, kann die E-Mails darin lesen, **senden Sie niemals echte sensible Informationen**. E-Mails werden nur 24 Stunden behalten, danach automatisch gelöscht.
:::

## Wie es implementiert wird

E-Mails zu `@authn.tech` werden durch Cloudflare Email Routing an Worker `email()` Handler zugestellt, nutzt `postal-mime` um MIME zu analysieren, extrahiert Subject und Body, extrahiert Verifizierungscode danach schreibe in D1; View-Endpunkt liest von D1. Komplette Kette: **Versenden → Email Routing → Worker → Parse in DB → Online/API Ansicht**.
