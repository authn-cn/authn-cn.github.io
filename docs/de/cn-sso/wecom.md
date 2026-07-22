---
title: "WeCom-Scan-Login"
---

# WeCom-Scan-Login (Protokoll-Deep-Dive)

„Mit WeCom anmelden" lässt Mitarbeiter interne Systeme (OA, Cloud-Desktop, Admin-Konsolen) per WeCom-QR-Scan betreten. Es ist im Kern eine **Variante des OAuth2-Authorization-Code-Flows**: Auf einer PC-Webseite wird ein QR-Code gezeigt, der Mitarbeiter scannt und bestätigt in der WeCom-App, der Browser erhält einen einmaligen `code`, und das **Backend** tauscht diesen `code` gegen die Identität des Mitarbeiters.

> Der verbraucherorientierte [WeChat-Scan-Login](./wechat.md) benötigt nur einen Schritt und andere Anmeldedaten — nicht verwechseln. Zum Ausprobieren / für eine anklickbare Demo siehe [Mock WeCom (Nutzung)](../mock/wecom.md).

## Gesamtablauf

```
Browser (Ihre Login-Seite)          WeCom                          Ihr Backend
   │  1. QR einbetten (JS-SDK)          │                              │
   │ ───────────────────────────────►  │                              │
   │  2. Mitarbeiter scannt + bestätigt │                              │
   │  3. redirect_uri?code=&state=      │                              │
   │ ◄───────────────────────────────  │                              │
   │  4. code an das Backend geben ─────────────────────────────────► │
   │                                    │  ① gettoken(corpid+secret)  │
   │                                    │  ② code→userid              │
   │                                    │  ③ userid→Mitglied-Detail    │
   │  5. eigene Session aufbauen ◄──────────────────────────────────  │
```

Schritte 1–3 sind „den `code` im Browser holen", Schritte 4–5 „das Backend tauscht den `code` gegen eine Identität". **Das JS-SDK übernimmt nur den Frontend-Teil der Schritte 1–3**; die drei Backend-Schritte haben mit dem SDK nichts zu tun.

## Was das JS-SDK (wwLogin / @wecom/jssdk) tatsächlich tut

Das WeCom-Login-JS-SDK ist ein **sehr dünnes Browser-Skript**. Mit `corpid` (appid), `agentid`, `redirect_uri`, `state` usw. tut es im `<div>`-Container, auf den Sie es richten, Folgendes:

1. **Baut die offizielle Authorize-URL** aus Ihren Parametern (`login_type=CorpApp`, …), sodass Sie das Format nicht auswendig kennen müssen;
2. **Fügt ein `<iframe>` ein**, das auf WeComs offizielle QR-Seite zeigt (`open.work.weixin.qq.com/wwopen/sso/qrConnect` oder neuer `login.work.weixin.qq.com/wwlogin/sso/login`) — **der QR-Code selbst ist eine Seite auf WeComs Domain**, sodass Rendering, Scan-Status-Polling und Ablauf-Refresh von der offiziellen Seite erledigt werden;
3. **Liefert den resultierenden `code` an Ihre Seite zurück**: Nach Scan und Bestätigung leitet die offizielle Seite mit `code` + `state` zu Ihrer `redirect_uri` weiter (altes `wwLogin` per Top-Window-Redirect; das neue `@wecom/jssdk` unterstützt zusätzlich einen `onLoginSuccess`-Callback, der Ihnen den `code` ohne Ganzseiten-Navigation übergibt);
4. **Kümmert sich um Details**: iframe-Größe/-Stil, `redirect_type` (Redirect im iframe vs. Top-Window), Chrome 142+'s `allow="local-network-access"` usw.

In einem Satz: **das SDK = „den offiziellen QR in Ihre Seite einbetten + den resultierenden `code` zurückgeben"**. Es berührt Ihr `secret` nie und ist am Backend-Token-Tausch nicht beteiligt.

## Warum das JS-SDK nutzen (statt Link / iframe selbst zu bauen)

Sie *können* das SDK weglassen — die ganze Seite auf WeComs Scan-Login-Link umleiten und zurückleiten lassen. Aber das Einbetten des QR mit dem JS-SDK hat echte Vorteile:

- **Nutzer bleiben auf Ihrer Site**: Ein Ganzseiten-Redirect führt Nutzer zu WeComs Domain und zurück; ein eingebetteter QR hält sie auf Ihrer Login-Seite — bessere UX und Conversion.
- **Vermeidet Cross-Origin-Fallen**: Die QR-Seite liegt auf WeComs Domain, Ihre Seite auf Ihrer. Bauen Sie das `<iframe>` selbst, müssen Sie Scan-Status-Polling, Cross-Origin-Abruf des `code` und Stil-Anpassung selbst lösen — und die Same-Origin-Policy blockiert vieles. Das SDK pollt über die offizielle Seite und bei Erfolg **macht die offizielle Seite den Top-Level-Redirect (oder Callback), um den `code` zurückzugeben** — Sie berühren nie Cross-Origin-Messaging.
- **Bringt die „Desktop-Schnell-Login"-Fähigkeit**: `@wecom/jssdk` zeigt bei erfüllten Bedingungen automatisch ein **scanfreies Desktop-Schnell-Login-Panel** (siehe unten) — mit einer selbst gebauten URL nicht erreichbar.
- **Protokoll-konform, offiziell gepflegt**: WeCom-Änderungen (neue Hosts, `login_type`, Panel-Logik, Schnell-Login-Bedingungen) werden vom SDK nachgezogen; Ihr Code ändert sich nicht.

> Umgekehrt: Bei reinem Server-Side-Rendering oder wenn Sie nur einen Ganzseiten-Redirect wollen, **können Sie das SDK weglassen** und den Scan-Login-Link direkt bauen. Das SDK kapselt nur die „Einbetten + UX + Schnell-Login"-Schicht; **der Backend-Ablauf nach dem `code` ist identisch.**

## Alt vs. neu: `wwLogin.js` vs. `@wecom/jssdk`

| | Altes `wwLogin.js` | Neues `@wecom/jssdk` (empfohlen) |
|---|---|---|
| Einbinden | `<script>`, global `WwLogin` | `npm i @wecom/jssdk`, `import { createWWLoginPanel }` |
| Nutzung | `new WwLogin({ id, appid, agentid, redirect_uri, state })` | `ww.createWWLoginPanel({ el, params:{ login_type, appid, agentid, redirect_uri, state }, onLoginSuccess })` |
| Desktop-Schnell-Login | ❌ | ✅ (Desktop-WeCom > 3.1.23, HTTPS, Nutzer im Sichtbarkeitsbereich) |
| code holen | Top-Window-Redirect | Redirect **oder** `onLoginSuccess({ code })`-Callback |
| Pflege | Wartungsmodus | aktiv weiterentwickelt; neue Funktionen nur hier |

Offiziell empfohlen ist `@wecom/jssdk` für neue Integrationen; beide landen auf derselben qrConnect und denselben Backend-`/cgi-bin/*`-APIs.

## Nach dem `code`: warum der Nutzerinfo-Abruf drei Schritte braucht

Das ist der größte Unterschied zu WeChat. Die WeChat-„Website-App" holt den Nutzer in einem `/sns/userinfo`-Aufruf; WeCom braucht **drei**:

1. **`gettoken`**: `corpid` + App-`secret` gegen ein **App-Ebene-`access_token`** tauschen. Es repräsentiert die **App**-Identität, nicht einen Nutzer, und dient dem Aufruf von Verzeichnis-APIs. Es hat Kontingente/Ratenlimits und **muss** serverseitig gecacht und gemäß `expires_in` erneuert werden.
2. **`auth/getuserinfo`**: `access_token` + den gescannten `code` gegen **welcher Mitarbeiter** es ist (`userid`, evtl. auch `user_ticket`) tauschen.
3. **`user/get`**: das **Verzeichnis-Detail** dieses Mitarbeiters (Name, Abteilung, Handy, E-Mail, …) mit `access_token` + `userid` lesen.

Warum dieses Design? Weil WeComs `access_token` eine **Firmen-/App-Ebene-Anmeldung** ist (kann das ganze Verzeichnis lesen), nicht „ein Token, das ein Nutzer Ihnen gewährt hat". Also beweisen Sie zuerst „ich bin diese App" (gettoken), nutzen dann den einmaligen `code`, um „wer diesmal gescannt hat" zu bestimmen (getuserinfo), und lesen schließlich mit App-Berechtigung dessen Datensatz (user/get). Der `code` ist nur eine einmalige Anmeldung, die „den Scanner" mit „der App" verknüpft.

(Für sensible Felder wie Avatar/Geschlecht das `user_ticket` aus Schritt ② mit `auth/getuserdetail` nutzen.)

## Kernbegriffe & Parameter

- **`corpid`**: die Firmen-ID (im SDK die `appid`).
- **`agentid`**: die selbst gebaute App-ID; bestimmt Sichtbarkeitsbereich und Berechtigungen.
- **`secret`**: das App-Secret, **nur im Backend** für `gettoken`, nie im Frontend.
- **`userid`**: die eindeutige ID des Mitglieds im Firmenverzeichnis; der Schlüssel zum Lesen von Details und Senden von Nachrichten.
- **App-Ebene-`access_token`**: wie oben — immer cachen.
- **Sichtbarkeitsbereich**: ein Mitarbeiter außerhalb erhält beim Scan einen Keine-Berechtigung-Fehler.
- **`state`**: beim Start erzeugt, beim Rücksprung verglichen — CSRF-Schutz.
- **`errcode` / `errmsg`**: die einheitliche Fehlerform jeder WeCom-API (`errcode:0` = Erfolg).

## Sicherheits-Essentials

- **Den `code` immer im Backend gegen Tokens tauschen**; das `secret` niemals im Frontend oder Repo.
- **`state` validieren** gegen CSRF / gefälschte Callbacks.
- **HTTPS erzwingen** und die **vertrauenswürdigen / Callback-Domains** der App korrekt konfigurieren (eine Abweichung führt zu einem „Link nicht erreichbar"-Fehler).
- Der `code` ist kurzlebig und **einmalig**; das `access_token` hat Kontingente — Caching und Erneuerung beachten.

## Praxis / Integration

- 🔬 [Mock WeCom (Nutzung)](../mock/wecom.md) — den ganzen Ablauf gegen zum Offiziellen identische Mock-Endpunkte durchspielen, mit eingebetteter **anklickbarer, echter** Scan-Demo und der „Produktion = nur JS + URL ändern"-Zuordnung.
- 📖 [OAuth-2.0-Doku](../oauth2/) — der Standard-Authorization-Code-Flow · Vergleich mit [WeChat-Scan-Login](./wechat.md)

## Quellen

- [Web-Login-Komponente / Scan-Login-Link erstellen — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/98152)
- [Zugriffsanmeldedaten gettoken — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91039)
- [Identität auth/getuserinfo · Mitglied lesen user/get — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91023)
