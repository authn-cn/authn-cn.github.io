---
title: WeChat- / WeCom-Scan-Login-Demo
---

# WeChat- / WeCom-Scan-Login-Demo

Eine vollständig im Browser laufende, **anklickbare, echte** Scan-Login-Demo. Sie bettet einen QR-Code mit einem Mock-SDK ein, das **byte-genau identisch** zum offiziellen ist (`WxLogin` / `WwLogin`), durchläuft den vollständigen Authorization-Code-Flow und tauscht und zeigt schließlich die Nutzerinfos auf dieser Seite. Wählen Sie unten den Reiter „WeChat (Website-App)" oder „WeCom".

<ClientOnly>
  <WechatLoginDemo />
</ClientOnly>

## So funktioniert's

1. Plattform wählen → „Login-QR-Code anzeigen" klicken;
2. Mit dem Handy scannen oder den Link „(Dev) Scan simulieren → bestätigen" unter dem QR nutzen;
3. Die Seite kehrt mit einem `code` zurück, prüft `state` und ruft das Mock-Backend auf:
   - **WeChat**: `/sns/oauth2/access_token` → `/sns/userinfo`;
   - **WeCom**: `/cgi-bin/gettoken` → `/cgi-bin/auth/getuserinfo` → `/cgi-bin/user/get`.

Der ganze Tausch läuft lokal in Ihrem Browser (der Mock hat CORS aktiviert). Standardmäßig zeigt er auf den [Mock-Dienst](../mock/) dieser Website; das Eingabefeld oben erlaubt, auf Ihre eigene Bereitstellung zu zeigen.

## Tiefer einsteigen

- 📖 Protokoll: [WeChat-Scan-Login](../cn-sso/wechat.md) · [WeCom-Scan-Login](../cn-sso/wecom.md) — was das JS-SDK tut, warum man es nutzt, warum WeCom drei Schritte braucht
- 🧪 Mock-Nutzung: [Mock WeChat](../mock/wechat.md) · [Mock WeCom](../mock/wecom.md) — Endpunkte, Integrationscode und „Produktion = nur JS + URL ändern"

::: warning Nur zum Testen
Der Mock liefert einen festen Nutzer/ein festes Mitglied, der Autorisierungscode ist ein kurzlebiges, wiederverwendbares selbstsigniertes JWT, und der Signaturschlüssel ist öffentlich. Niemals in Produktion verwenden.
:::

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
