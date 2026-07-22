---
title: "微信扫码登录"
---

# 微信扫码登录(微信开放平台 · 网站应用)

"用微信登录"面向 **C 端个人用户**:让访客用自己的个人微信扫码登进你的网站。它是 **OAuth2 授权码模式的变体**,`scope=snsapi_login`——PC 网页内嵌二维码,手机微信扫码授权后带 `code` 回跳,后端再换取用户信息。

> 面向企业员工的 [企业微信扫码登录](./wecom.md) 凭据体系和取用户步骤都不同,别混用。

## 前提

1. 在**微信开放平台**注册开发者,创建一个**网站应用**并通过审核,拿到 `AppID` / `AppSecret`;
2. 配置**授权回调域**(只填域名,不带协议和路径);
3. 网站需 **HTTPS**。

## 流程

1. **内嵌二维码**:页面引入官方 `wxLogin.js`,用 `new WxLogin({...})` 在容器里生成二维码:

   ```html
   <div id="login_container"></div>
   <script src="https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js"></script>
   <script>
     new WxLogin({
       id: "login_container",
       appid: "你的_AppID",
       scope: "snsapi_login",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"), // 官方约定:调用方 urlencode
       state: "随机防伪串",
       self_redirect: false   // false=顶层窗口跳转,true=iframe 内跳转
     });
   </script>
   ```

   (等价地也可直接跳转 `https://open.weixin.qq.com/connect/qrconnect?appid=...&scope=snsapi_login&redirect_uri=...&state=...#wechat_redirect`。)

2. 用户手机扫码 → 微信里确认授权;
3. 微信带 `code` + `state` **回跳** `redirect_uri?code=CODE&state=STATE`;
4. **后端**用 `code` 换令牌(务必在后端,`AppSecret` 不进前端):

   ```bash
   GET https://api.weixin.qq.com/sns/oauth2/access_token?appid=APPID&secret=SECRET&code=CODE&grant_type=authorization_code
   # → { access_token, expires_in, refresh_token, openid, scope, unionid }
   ```

5. 用 `access_token` + `openid` 拉用户资料:

   ```bash
   GET https://api.weixin.qq.com/sns/userinfo?access_token=ACCESS_TOKEN&openid=OPENID&lang=zh_CN
   # → { openid, nickname, sex, province, city, country, headimgurl, privilege, unionid }
   ```

## 关键概念

- **`openid`**:用户在**该应用**内的唯一标识;换个应用同一个人 `openid` 不同。
- **`unionid`**:同一开放平台账号下**多个应用/公众号之间打通**同一用户的标识。做多端(网站 + 小程序 + 公众号)统一账号时,应以 `unionid` 作主键。
- **`state`**:发起时生成、回跳时比对,防 CSRF。
- **Chrome 142+**:内嵌授权框会触发"本地网络访问"提示;用官方 `wxLogin.js` 会自动给 iframe 加 `allow="local-network-access"`,自己手写 iframe 需手动加。
- **快捷登录**:较新版本的桌面微信(Windows 3.9.11+ / Mac 4.0+)在已登录时会优先提示免扫码确认,用户仍可切二维码。

## 用本站 Mock 微信联调

没有审核通过的网站应用也能先把流程跑通:本站提供一个 **Mock 微信**(`https://mock.authn.tech/wechat/`),与官方**输入输出完全一致,只是域名不同**——同名 `WxLogin` SDK、相同回跳、相同 `/sns/*` 接口与字段,**不校验 AppID / AppSecret**,扫码后固定返回一个测试用户。

| 用途 | Mock 端点 | 对应微信官方 |
|------|-----------|-------------|
| JS SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| 内嵌二维码页 | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code 换 token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| 用户信息 | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| 控制台 | `/wechat/` | — |

## 在线演示(真实可点)

下面用上面这套 Mock 的**同款 SDK** 实跑一遍:点"生成二维码登录",手机扫码或点二维码下方"(开发者)模拟扫码 → 确认登录",页面会带 `code` 回跳并自动换取用户信息。

<ClientOnly>
  <WechatLoginDemo lock-provider="wechat" />
</ClientOnly>

## 上线切换:只改「引入的 JS」与「URL」

Mock 的 SDK 与官方逐字节一致(`redirect_uri` 不做 `encodeURIComponent`,按官方约定由调用方 urlencode),且不校验凭据的值。上线时业务代码一行不用改,只替换两处:

| 改什么 | Mock | 真实 |
|--------|------|------|
| 引入的 JS | `https://mock.authn.tech/wechat/wxLogin.js` | `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js` |
| 后端 API base | `https://mock.authn.tech` | `https://api.weixin.qq.com` |

后端路径、`new WxLogin({...})` 参数、回跳 `redirect_uri?code=&state=`、返回字段都不变。

::: warning 仅供测试
Mock 固定返回一个测试用户,授权码是短时效自签 JWT 且可重复使用,签名私钥公开。**任何生产系统都不应信任 Mock 服务。**
:::

## 相关阅读

- [企业微信扫码登录](./wecom.md) · [Mock 服务器总览](../mock/)
- [OAuth 2.0 文档](../oauth2/) —— 微信登录是它的变体 · [JWT 解析器](../tools/jwt.md)

## 参考来源

- [网站应用微信登录开发指南 —— 微信开放文档](https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html)
- [网站应用授权登录(含内嵌二维码 wxLogin.js)—— 微信开放文档](https://developers.weixin.qq.com/doc/oplatform/developers/dev/auth/web)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
