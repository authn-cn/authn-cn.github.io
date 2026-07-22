---
title: "WeChat-Scan-Login"
---

# WeChat-Scan-Login (Protokoll-Deep-Dive)

„Mit WeChat anmelden" richtet sich an **Endverbraucher**: Besucher melden sich mit ihrem privaten WeChat auf Ihrer Website an. Es ist im Kern der **OAuth2-Authorization-Code-Flow** mit `scope=snsapi_login`: Auf einer PC-Webseite wird ein QR-Code gezeigt, der Nutzer scannt und autorisiert in WeChat, der Browser erhält einen einmaligen `code`, und das **Backend** tauscht ihn gegen Nutzerinfos.

> Der mitarbeiterorientierte [WeCom-Scan-Login](./wecom.md) holt den Nutzer in drei Schritten und nutzt andere Anmeldedaten — nicht verwechseln. Zum Ausprobieren / für eine anklickbare Demo siehe [Mock WeChat (Nutzung)](../mock/wechat.md).

## Gesamtablauf

```
Browser (Ihre Login-Seite)          WeChat                         Ihr Backend
   │  1. QR einbetten (wxLogin.js)      │                             │
   │ ──────────────────────────────►   │                             │
   │  2. scannen + autorisieren (Handy) │                             │
   │  3. redirect_uri?code=&state=      │                             │
   │ ◄──────────────────────────────   │                             │
   │  4. code an das Backend geben ────────────────────────────────► │
   │                                    │  /sns/oauth2/access_token   │
   │                                    │  (→ access_token + openid)  │
   │                                    │  /sns/userinfo (Profil)     │
   │  5. eigene Session aufbauen ◄─────────────────────────────────  │
```

Der `code` wird im Browser geholt; Token-Tausch und Profilabruf laufen beide im **Backend** (sie brauchen das `AppSecret`).

## Was das JS-SDK (wxLogin.js) tatsächlich tut

`wxLogin.js` ist ein dünnes Browser-Skript. Mit `appid`, `scope`, `redirect_uri`, `state` usw. tut es im `<div>`-Container, auf den Sie es richten:

1. **Baut die offizielle Authorize-URL** und **fügt ein `<iframe>` ein**, das auf WeChats offizielle QR-Seite zeigt (`open.weixin.qq.com/connect/qrconnect`) — der QR ist eine Seite auf WeChats Domain, sodass Rendering, Scan-Status und Ablauf-Refresh von der offiziellen Seite erledigt werden;
2. **Liefert den `code` an Ihre Seite zurück**: Nach Scan und Bestätigung leitet die offizielle Seite mit `code` + `state` zu Ihrer `redirect_uri` weiter;
3. **`self_redirect` steuert, wohin es geht**: `false` = Top-Window-Redirect (ganze Seite zu `redirect_uri`), `true` = Redirect im iframe;
4. **Kümmert sich um Details** wie iframe-Größe/-Stil und Chrome 142+'s `allow="local-network-access"`.

In einem Satz: **das SDK = „den offiziellen QR in Ihre Seite einbetten + den resultierenden `code` zurückgeben"**. Es berührt das `AppSecret` nie und ist am Backend-Token-Tausch nicht beteiligt.

## Warum das JS-SDK nutzen (statt Link selbst zu bauen)

Sie *können* das SDK weglassen — die ganze Seite auf `https://open.weixin.qq.com/connect/qrconnect?...#wechat_redirect` umleiten und zurückleiten lassen. Aber das Einbetten des QR mit dem SDK:

- **Hält Nutzer auf Ihrer Site**: Sie bleiben auf Ihrer Login-Seite, statt zu WeChats Domain und zurück geführt zu werden — bessere UX und Conversion;
- **Vermeidet Cross-Origin-Arbeit**: Die QR-Seite liegt auf WeChats Domain, Ihre Seite auf Ihrer. Ein selbst gebautes iframe muss Scan-Status-Polling, Cross-Origin-Abruf des `code` und Styling behandeln; das SDK erledigt das über die offizielle Seite, die dann per Top-Redirect den `code` zurückgibt — Sie berühren nie Cross-Origin-Messaging;
- **Offiziell gepflegt, protokoll-konform**: WeChat-Änderungen (Schnell-Login, Stil-Parameter, Chrome-Kompatibilität) werden vom SDK nachgezogen.

> Wenn Sie gezielt einen Ganzseiten-Redirect / Server-Side-Rendering wollen, **können Sie das SDK weglassen**; der Backend-Ablauf nach dem `code` ist identisch.

## Nach dem `code`

Die WeChat-„Website-App" holt den Nutzer in zwei Schritten (einer weniger als WeCom):

1. **`/sns/oauth2/access_token`**: `AppID` + `AppSecret` + `code` gegen `access_token` + `openid` (+ `unionid`, `refresh_token`) tauschen. Hier ist das `access_token` **an den Nutzer gebunden** (anders als WeComs App-Ebene-Token).
2. **`/sns/userinfo`**: Nickname, Avatar usw. mit `access_token` + `openid` abrufen.

## Kernbegriffe

- **`openid`**: die eindeutige ID des Nutzers **innerhalb dieser App**; dieselbe Person hat in einer anderen App ein anderes `openid`.
- **`unionid`**: verknüpft denselben Nutzer **über Apps / offizielle Konten** unter einem Open-Platform-Konto. Für eine einheitliche Website + Mini-Programm + offizielles-Konto-Identität auf `unionid` schlüsseln.
- **`scope=snsapi_login`**: fest für Website-App-Scan-Login.
- **Autorisierte Callback-Domain**: in der Open-Platform-Konsole konfiguriert (nur Domain); eine Abweichung zur `redirect_uri`-Domain führt zum Fehler.
- **`state`**: CSRF-Schutz.
- **Schnell-Login**: neueres Desktop-WeChat (Windows 3.9.11+ / Mac 4.0+) bietet bei bereits angemeldetem Client eine scanfreie Bestätigung; Nutzer können weiterhin zum QR wechseln.

> Hinweis: Der WeChat-„Website-App"-Scan-Login nutzt **kein PKCE** (PKCE ist Standard-OAuth2, nicht Teil dieses WeChat-Pfads); Sicherheit beruht auf „der `code` wird nur im Backend mit dem `AppSecret` getauscht".

## Sicherheits-Essentials

- **Den `code` immer im Backend gegen Tokens tauschen**; das `AppSecret` nie im Frontend oder Repo;
- **`state` validieren** gegen CSRF;
- **HTTPS erzwingen**, die autorisierte Callback-Domain korrekt konfigurieren;
- Der `code` ist kurzlebig und einmalig; das `access_token` läuft ab — Erneuerung beachten.

## Praxis / Integration

- 🔬 [Mock WeChat (Nutzung)](../mock/wechat.md) — den ganzen Ablauf gegen zum Offiziellen identische Mock-Endpunkte durchspielen, mit eingebetteter **anklickbarer, echter** Scan-Demo und der „Produktion = nur JS + URL ändern"-Zuordnung.
- 📖 [OAuth-2.0-Doku](../oauth2/) · Vergleich mit [WeCom-Scan-Login](./wecom.md)

## Quellen

- [Website-App WeChat-Login-Leitfaden — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [Website-App autorisierter Login (inkl. eingebettetem QR wxLogin.js) — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/developers/dev/auth/web)
