---
title: "Mock WeCom (Scan-Login)"
---

# Mock WeCom-Scan-Login (Nutzung)

Diese Website bietet ein **Mock-WeCom**, das **identisch bei Ein- und Ausgabe zum offiziellen ist — nur die Domain wird auf diese Website getauscht**: dasselbe `WwLogin`-SDK, derselbe `redirect_uri?code=&state=`-Callback, dieselben `/cgi-bin/*`-Endpunkte und -Felder. Es **prüft den Wert von `corpid` / `secret` / `agentid` nicht** und liefert nach dem Scan ein festes Testmitglied. Ideal, um die Anbindung zum Laufen zu bringen, bevor Sie eine echte Firma/App haben.

> Um zuerst das Protokoll zu verstehen, was `WwLogin` / `@wecom/jssdk` tun und warum der Nutzerinfo-Abruf drei Schritte braucht, siehe [WeCom-Scan-Login (Protokoll-Deep-Dive)](../cn-sso/wecom.md).

Basis-URL: **<https://mock.authn.tech/wecom/>** (alle Endpunkte liegen unter `/wecom`).

## Endpunkte

| Zweck | Mock-Endpunkt | Offizielles WeCom |
|-------|---------------|-------------------|
| JS-SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| Eingebettete QR-Seite | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① access_token holen | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code → userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ Mitglied-Detail | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| (optional) sensible Infos | `/wecom/cgi-bin/auth/getuserdetail` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail` |
| Konsole | `/wecom/` | — |

## Schnellstart

**Frontend** — QR einbetten (einfach das Skript auf diese Website richten):

```html
<div id="ww_login"></div>
<script src="https://mock.authn.tech/wecom/wwLogin.js"></script>
<script>
  new WwLogin({
    id: "ww_login",
    appid: "beliebige_corpid",     // Mock prüft es nicht
    agentid: "beliebige_agentid",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "zufälliger Anti-Forgery-String"
  });
</script>
```

**Backend** — nachdem der Scan mit einem `code` zurückgeleitet hat, drei Schritte:

```bash
curl "https://mock.authn.tech/wecom/cgi-bin/gettoken?corpid=demo&corpsecret=x"
# → { errcode:0, access_token, expires_in }
curl "https://mock.authn.tech/wecom/cgi-bin/auth/getuserinfo?access_token=<AT>&code=<CODE>"
# → { errcode:0, userid, user_ticket }
curl "https://mock.authn.tech/wecom/cgi-bin/user/get?access_token=<AT>&userid=<USERID>"
# → { errcode:0, userid:"zhangsan", name:"张三", department, mobile, email, ... }
```

## Live-Demo

Zum echten Durchklicken (QR einbetten → scannen → Rücksprung → Dreischritt-Tausch) das eigenständige [Scan-Login-Demo-Tool](../tools/wechat-login.html) nutzen (auf den Reiter „WeCom" wechseln).

## Für Produktion: nur eingebundenes JS und URL ändern

Das SDK des Mocks ist byte-genau identisch zum offiziellen (kein `encodeURIComponent` auf `redirect_uri`) und prüft keine Anmeldedaten-Werte. Ihr Code bleibt gleich; nur zwei Dinge ändern sich:

| Ändern | Mock | Echt |
|--------|------|------|
| Eingebundenes JS | `https://mock.authn.tech/wecom/wwLogin.js` | Offizielles `wwLogin`-CDN oder `@wecom/jssdk` |
| Backend-API-Basis | `https://mock.authn.tech/wecom` | `https://qyapi.weixin.qq.com` |

Die Backend-Pfade (`/cgi-bin/gettoken`, `/cgi-bin/auth/getuserinfo`, `/cgi-bin/user/get`), die `new WwLogin({...})`-Parameter und die Antwortfelder bleiben gleich.

::: warning Nur zum Testen
Der Mock liefert ein festes Mitglied (`userid=zhangsan`), der Autorisierungscode ist ein kurzlebiges, wiederverwendbares selbstsigniertes JWT, und der Signaturschlüssel ist öffentlich. **Kein Produktionssystem sollte dem Mock vertrauen.**
:::
