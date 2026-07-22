---
title: "WeCom-Scan-Login"
---

# WeCom-Scan-Login (WeChat Work)

„Mit WeCom anmelden" richtet sich an **Mitarbeiter innerhalb eines Unternehmens**: Sie melden sich mit WeCom an internen Systemen an (OA, Cloud-Desktop, Admin-Konsolen). Ebenfalls eine **OAuth2-Variante**, aber das `access_token` ist **App-Ebene** und der Abruf der Nutzerinfos erfolgt in **drei Schritten** (gettoken → auth/getuserinfo → user/get).

> Der verbraucherorientierte [WeChat-Scan-Login](./wechat.md) benötigt nur einen Schritt (`/sns/userinfo`) und andere Anmeldedaten — nicht verwechseln.

## Voraussetzungen

1. Die Firmen-`corpid` beschaffen; in der WeCom-Adminkonsole eine **selbst gebaute App** erstellen, um deren `agentid` + `secret` zu erhalten;
2. Die **vertrauenswürdige / Login-Callback-Domain** der App konfigurieren, die **HTTPS** sein muss;
3. Der sich anmeldende Mitarbeiter muss im **Sichtbarkeitsbereich** der App sein.

## Ablauf

1. **QR-Code einbetten**: `wwLogin.js` (oder das neuere `@wecom/jssdk`) einbinden, `login_type=CorpApp`:

   ```html
   <div id="ww_login"></div>
   <script src="https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wwLogin-1.2.7.js"></script>
   <script>
     new WwLogin({
       id: "ww_login",
       appid: "IHRE_corpid",
       agentid: "IHRE_agentid",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"),
       state: "zufälliger Anti-Forgery-String"
     });
   </script>
   ```

   Das neuere, empfohlene `@wecom/jssdk` nutzt `ww.createWWLoginPanel({ params: { login_type: "CorpApp", appid, agentid, redirect_uri, state } })` und unterstützt **sowohl QR-Code als auch Desktop-Schnell-Login** (ein scanfreies Panel erscheint, wenn Desktop-WeCom > 3.1.23, HTTPS und der Nutzer im Sichtbarkeitsbereich ist).

2. Scannen und bestätigen → Rücksprung zu `redirect_uri?code=CODE&state=STATE`;
3. **Backend-Schritt ①**: `corpid` + App-`secret` gegen ein **App-Ebene**-`access_token` tauschen (ratenbegrenzt — **muss gecacht werden**):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=CORPID&corpsecret=SECRET
   # → { errcode, errmsg, access_token, expires_in }
   ```

4. **Schritt ②**: `access_token` + `code` gegen eine `userid` tauschen (kann auch `user_ticket` liefern):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=ACCESS_TOKEN&code=CODE
   # → { errcode, errmsg, userid, user_ticket }
   ```

5. **Schritt ③**: das Verzeichnismitglied-Detail mit `access_token` + `userid` lesen:

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=ACCESS_TOKEN&userid=USERID
   # → { errcode, errmsg, userid, name, department, mobile, email, ... }
   ```

   (Optional) sensible Felder mit `user_ticket` über `POST /cgi-bin/auth/getuserdetail` abrufen.

## Kernbegriffe

- **`userid`**: die eindeutige ID des Mitglieds im **Firmenverzeichnis**; der Schlüssel zum Lesen von Details und Senden von Nachrichten.
- **App-Ebene-`access_token`**: nicht an einen Nutzer gebunden, repräsentiert die „App-Identität", hat Kontingente und Ratenlimits — immer **serverseitig cachen und gemäß `expires_in` erneuern**.
- **Sichtbarkeitsbereich**: ein Mitglied außerhalb des Sichtbarkeitsbereichs der App erhält einen Keine-Berechtigung-Fehler.
- **`errcode` / `errmsg`**: jede WeCom-API nutzt diese Fehlerform (`errcode:0` bedeutet Erfolg).

## Mit dem Mock-WeCom dieser Website testen

Diese Website bietet ein **Mock-WeCom** mit allen Endpunkten unter `https://mock.authn.tech/wecom/`, **identisch bei Ein- und Ausgabe zum offiziellen** — dasselbe `WwLogin`-SDK, derselbe Callback, dieselben `/cgi-bin/*`-Endpunkte und -Felder, **prüft den Wert von corpid / secret / agentid nicht** und liefert nach dem Scan ein festes Testmitglied.

| Zweck | Mock-Endpunkt | Offizielles WeCom |
|-------|---------------|-------------------|
| JS-SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| Eingebettete QR-Seite | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① access_token holen | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code → userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ Mitglied-Detail | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| Konsole | `/wecom/` | — |

## Live-Demo (anklickbar, echt)

Führen Sie den Ablauf unten mit dem **identischen SDK** dieses Mocks aus: „Login-QR-Code anzeigen" klicken, scannen und bestätigen; die Seite kehrt mit einem `code` zurück und durchläuft den WeCom-Dreischritt und zeigt jede Antwort.

<ClientOnly>
  <WechatLoginDemo lock-provider="wecom" />
</ClientOnly>

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

## Weiterführend

- [WeChat-Scan-Login](./wechat.md) · [Mock-Server-Übersicht](../mock/)
- [OAuth-2.0-Doku](../oauth2/) · [JWT-Decoder](../tools/jwt.md)

## Quellen

- [Web-Login-Komponente / Scan-Login-Link erstellen — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/98152)
- [Zugriffsanmeldedaten gettoken — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91039)
- [Identität auth/getuserinfo · Mitglied lesen user/get — WeCom Developer Center](https://developer.work.weixin.qq.com/document/path/91023)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
