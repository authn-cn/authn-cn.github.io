---
title: "Mock 微信(扫码登录)"
---

# Mock 微信扫码登录(使用)

本站提供一个 **Mock 微信开放平台"网站应用"扫码登录**,与官方**输入输出完全一致,只是把域名换成本站**——同名 `WxLogin` SDK、相同回跳、相同 `/sns/*` 接口与字段。**不校验 `AppID` / `AppSecret`**,扫码后固定返回一个测试用户。适合在没有审核通过的网站应用时先把接入跑通。

> 想先搞懂协议、`wxLogin.js` 在干什么、为什么用 JS SDK,见 [微信扫码登录(协议详解)](../cn-sso/wechat.md)。

服务地址:**<https://mock.authn.tech/wechat/>**。

## 端点

| 用途 | Mock 端点 | 对应微信官方 |
|------|-----------|-------------|
| JS SDK | `/wechat/wxLogin.js` | `res.wx.qq.com/.../wxLogin.js` |
| 内嵌二维码页 | `/connect/qrconnect` | `open.weixin.qq.com/connect/qrconnect` |
| code 换 token | `/sns/oauth2/access_token` | `api.weixin.qq.com/sns/oauth2/access_token` |
| 刷新 token | `/sns/oauth2/refresh_token` | `api.weixin.qq.com/sns/oauth2/refresh_token` |
| 用户信息 | `/sns/userinfo` | `api.weixin.qq.com/sns/userinfo` |
| 校验 token | `/sns/auth` | `api.weixin.qq.com/sns/auth` |
| 控制台 | `/wechat/` | — |

## 快速开始

**前端**内嵌二维码(把 script 指向本站即可):

```html
<div id="login_container"></div>
<script src="https://mock.authn.tech/wechat/wxLogin.js"></script>
<script>
  new WxLogin({
    id: "login_container",
    appid: "任意_AppID",     // Mock 不校验
    scope: "snsapi_login",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "随机防伪串"
  });
</script>
```

**后端**扫码回跳拿到 `code` 后:

```bash
curl "https://mock.authn.tech/sns/oauth2/access_token?appid=demo&secret=x&code=<CODE>&grant_type=authorization_code"
# → { access_token, expires_in, refresh_token, openid, scope, unionid }
curl "https://mock.authn.tech/sns/userinfo?access_token=<AT>&openid=<OPENID>"
# → { openid, nickname:"微信测试用户", sex, province, city, country, headimgurl, privilege, unionid }
```

## 在线演示

想真实点一遍(内嵌二维码 → 扫码 → 回跳 → 换取用户信息),用独立的 [扫码登录演示工具](../tools/wechat-login.html)(切到「微信」标签)。

## 上线切换:只改「引入的 JS」与「URL」

Mock 的 SDK 与官方逐字节一致(`redirect_uri` 不做 `encodeURIComponent`,按官方约定由调用方 urlencode),且不校验凭据值。上线时业务代码一行不用改,只替换两处:

| 改什么 | Mock | 真实 |
|--------|------|------|
| 引入的 JS | `https://mock.authn.tech/wechat/wxLogin.js` | `https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js` |
| 后端 API base | `https://mock.authn.tech` | `https://api.weixin.qq.com` |

后端路径、`new WxLogin({...})` 参数、回跳 `redirect_uri?code=&state=`、返回字段都不变。

::: warning 仅供测试
Mock 固定返回一个测试用户,授权码是短时效自签 JWT 且可重复使用,签名私钥公开。**任何生产系统都不应信任 Mock 服务。**
:::
