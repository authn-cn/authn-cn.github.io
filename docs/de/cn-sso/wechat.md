---
title: "WeChat-Scan-Login"
---

# WeChat-Scan-Login (WeChat Open Platform · Website-App)

„Mit WeChat anmelden" richtet sich an **Endverbraucher**: Besucher melden sich mit ihrem privaten WeChat auf Ihrer Website an. Es ist eine **Variante des OAuth2-Authorization-Code-Flows** mit `scope=snsapi_login` — ein QR-Code wird auf der PC-Webseite eingebettet, der Nutzer scannt ihn mit WeChat, und das Backend tauscht den zurückgegebenen `code` gegen Nutzerinfos.

> Der mitarbeiterorientierte [WeCom-Scan-Login](./wecom.md) nutzt ein anderes Anmeldedaten-Modell und andere Schritte — nicht verwechseln.

## Voraussetzungen

1. Auf der **WeChat Open Platform** registrieren, eine **Website-App** erstellen und freigeben lassen, `AppID` / `AppSecret` erhalten;
2. Die **autorisierte Callback-Domain** konfigurieren (nur Domain — kein Schema, kein Pfad);
3. Ihre Site muss **HTTPS** sein.

## Ablauf

1. **QR-Code einbetten**: das offizielle `wxLogin.js` einbinden und `new WxLogin({...})` aufrufen:

   ```html
   <div id="login_container"></div>
   <script src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"></script>
   <script>
     new WxLogin({
       id: "login_container",
       appid: "IHRE_AppID",
       scope: "snsapi_login",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"), // offizielle Konvention: Aufrufer url-kodiert
       state: "zufälliger Anti-Forgery-String",
       self_redirect: false   // false = Top-Fenster-Redirect, true = Redirect innerhalb des iframe
     });
   </script>
   ```

   (Alternativ direkt zu `https://open.weixin.qq.com/connect/qrconnect?appid=...&scope=snsapi_login&redirect_uri=...&state=...#wechat_redirect` weiterleiten.)

2. Der Nutzer scannt und bestätigt die Autorisierung in WeChat;
3. WeChat **leitet zurück** zu `redirect_uri?code=CODE&state=STATE`;
4. Das **Backend** tauscht den `code` (immer im Backend — `AppSecret` niemals im Frontend):

   ```bash
   GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
   # → { access_token, expires_in, refresh_token, openid, scope, unionid }
   ```

5. Profil mit `access_token` + `openid` abrufen:

   ```bash
   GET https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
   # → { openid, nickname, sex, province, city, country, headimgurl, privilege, unionid }
   ```

## Kernbegriffe

- **`openid`**: die eindeutige ID des Nutzers **innerhalb dieser App**; dieselbe Person hat in einer anderen App ein anderes `openid`.
- **`unionid`**: verknüpft denselben Nutzer **über mehrere Apps / offizielle Konten** unter einem Open-Platform-Konto. Für ein einheitliches Konto über Website + Mini-Programm + offizielles Konto auf `unionid` schlüsseln.
- **`state`**: beim Start erzeugt, beim Rücksprung verglichen — CSRF-Schutz.
- **Chrome 142+**: der eingebettete Auth-Frame löst eine „Local Network Access"-Abfrage aus; das offizielle `wxLogin.js` setzt `allow="local-network-access"` automatisch — bei selbst gebautem iframe manuell hinzufügen.
- **Schnell-Login**: neuere Desktop-WeChat-Versionen (Windows 3.9.11+ / Mac 4.0+) bieten bei bereits angemeldetem Client eine scanfreie Bestätigung; der Nutzer kann weiterhin zum QR-Code wechseln.

## Mit dem Mock-WeChat dieser Website testen

Sie können den gesamten Ablauf schon vor einer freigegebenen Website-App durchspielen: Diese Website bietet ein **Mock-WeChat** (`https://mock.authn.tech/wechat/`), das **byte-genau identisch zum offiziellen ist, nur die Domain unterscheidet sich** — dasselbe `WxLogin`-SDK, derselbe Callback, dieselben `/sns/*`-Endpunkte und -Felder, **prüft AppID / AppSecret nicht** und liefert nach dem Scan einen festen Testnutzer.

| Zweck | Mock-Endpunkt | Offizielles WeChat |
|-------|---------------|--------------------|
| JS-SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| Eingebettete QR-Seite | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code → token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| Nutzerinfo | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| Konsole | `/wechat/` | — |

## Live-Demo (anklickbar, echt)

Führen Sie den Ablauf unten mit dem **identischen SDK** dieses Mocks aus: „Login-QR-Code anzeigen" klicken, scannen oder den Link „(Dev) Scan simulieren → bestätigen" unter dem QR-Code nutzen; die Seite kehrt mit einem `code` zurück und tauscht ihn automatisch gegen Nutzerinfos.

<ClientOnly>
  <WechatLoginDemo lock-provider="wechat" />
</ClientOnly>

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

## Weiterführend

- [WeCom-Scan-Login](./wecom.md) · [Mock-Server-Übersicht](../mock/)
- [OAuth-2.0-Doku](../oauth2/) — WeChat-Login ist eine Variante davon · [JWT-Decoder](../tools/jwt.md)

## Quellen

- [Website-App WeChat-Login-Leitfaden — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [Website-App autorisierter Login (inkl. eingebettetem QR wxLogin.js) — WeChat Open Docs](https://developers.weixin.qq.com/doc/oplatform/developers/dev/auth/web)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
