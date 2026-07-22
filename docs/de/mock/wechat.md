---
title: "Mock WeChat (Scan-Login)"
---

# Mock WeChat-Scan-Login (Nutzung)

Diese Website bietet einen **Mock-WeChat-„Website-App"-Scan-Login**, der **identisch bei Ein- und Ausgabe zum offiziellen ist — nur die Domain wird auf diese Website getauscht**: dasselbe `WxLogin`-SDK, derselbe Callback, dieselben `/sns/*`-Endpunkte und -Felder. Er **prüft `AppID` / `AppSecret` nicht** und liefert nach dem Scan einen festen Testnutzer. Ideal, um die Anbindung zum Laufen zu bringen, bevor Sie eine freigegebene Website-App haben.

> Um zuerst das Protokoll zu verstehen, was `wxLogin.js` tut und warum man ein JS-SDK nutzt, siehe [WeChat-Scan-Login (Protokoll-Deep-Dive)](../cn-sso/wechat.md).

Basis-URL: **<https://mock.authn.tech/wechat/>**.

## Endpunkte

| Zweck | Mock-Endpunkt | Offizielles WeChat |
|-------|---------------|--------------------|
| JS-SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| Eingebettete QR-Seite | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code → token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| token erneuern | `/sns/oauth2/refresh_token` | `api.weixin.qq.com/sns/oauth2/refresh_token` |
| Nutzerinfo | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| token prüfen | `/sns/auth` | `api.weixin.qq.com/sns/auth` |
| Konsole | `/wechat/` | — |

## Schnellstart

**Frontend** — QR einbetten (einfach das Skript auf diese Website richten):

```html
<div id="login_container"></div>
<script src="https://mock.authn.tech/wechat/wxLogin.js"></script>
<script>
  new WxLogin({
    id: "login_container",
    appid: "beliebige_AppID",     // Mock prüft es nicht
    scope: "snsapi_login",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "zufälliger Anti-Forgery-String"
  });
</script>
```

**Backend** — nachdem der Scan mit einem `code` zurückgeleitet hat:

```bash
curl "https://mock.authn.tech/sns/oauth2/access_token?appid=demo&secret=x&code=<CODE>&grant_type=authorization_code"
# → { access_token, expires_in, refresh_token, openid, scope, unionid }
curl "https://mock.authn.tech/sns/userinfo?access_token=<AT>&openid=<OPENID>"
# → { openid, nickname:"微信测试用户", sex, province, city, country, headimgurl, privilege, unionid }
```

## Live-Demo

Zum echten Durchklicken (QR einbetten → scannen → Rücksprung → Tausch gegen Nutzerinfos) das eigenständige [Scan-Login-Demo-Tool](../tools/wechat-login.html) nutzen (auf den Reiter „WeChat" wechseln).

## Für Produktion: nur eingebundenes JS und URL ändern

Das SDK des Mocks ist byte-genau identisch zum offiziellen (kein `encodeURIComponent` auf `redirect_uri` — der Aufrufer url-kodiert ihn, wie offiziell vorgesehen) und prüft keine Anmeldedaten-Werte. Ihr Code bleibt gleich; nur zwei Dinge ändern sich:

| Ändern | Mock | Echt |
|--------|------|------|
| Eingebundenes JS | `https://mock.authn.tech/wechat/wxLogin.js` | `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js` |
| Backend-API-Basis | `https://mock.authn.tech` | `https://api.weixin.qq.com` |

Backend-Pfade, `new WxLogin({...})`-Parameter, der `redirect_uri?code=&state=`-Callback und die Antwortfelder bleiben gleich.

::: warning Nur zum Testen
Der Mock liefert einen festen Nutzer, der Autorisierungscode ist ein kurzlebiges, wiederverwendbares selbstsigniertes JWT, und der Signaturschlüssel ist öffentlich. **Kein Produktionssystem sollte dem Mock vertrauen.**
:::
