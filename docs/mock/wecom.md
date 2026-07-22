---
title: "Mock 企业微信(扫码登录)"
---

# Mock 企业微信扫码登录(使用)

本站提供一个 **Mock 企业微信**,与官方**输入输出一致,只是把域名换成本站**——同名 `WwLogin` SDK、相同回跳 `redirect_uri?code=&state=`、相同的 `/cgi-bin/*` 接口与字段。**不校验 `corpid` / `secret` / `agentid` 的值**,扫码后固定返回一个测试成员。适合在没有真实企业/应用时先把接入跑通。

> 想先搞懂协议、`WwLogin` / `@wecom/jssdk` 在干什么、为什么分三步取用户,见 [企业微信扫码登录(协议详解)](../cn-sso/wecom.md)。

服务地址:**<https://mock.authn.tech/wecom/>**(所有端点收敛在 `/wecom` 下)。

## 端点

| 用途 | Mock 端点 | 对应企业微信官方 |
|------|-----------|-------------|
| JS SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| 内嵌二维码页 | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① 取 access_token | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code 换 userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ 查成员详情 | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| (可选)敏感信息 | `/wecom/cgi-bin/auth/getuserdetail` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail` |
| 控制台 | `/wecom/` | — |

## 快速开始

**前端**内嵌二维码(把 script 指向本站即可):

```html
<div id="ww_login"></div>
<script src="https://mock.authn.tech/wecom/wwLogin.js"></script>
<script>
  new WwLogin({
    id: "ww_login",
    appid: "任意_corpid",     // Mock 不校验
    agentid: "任意_agentid",
    redirect_uri: encodeURIComponent("https://your-app.example/callback"),
    state: "随机防伪串"
  });
</script>
```

**后端**扫码回跳拿到 `code` 后,三步走:

```bash
curl "https://mock.authn.tech/wecom/cgi-bin/gettoken?corpid=demo&corpsecret=x"
# → { errcode:0, access_token, expires_in }
curl "https://mock.authn.tech/wecom/cgi-bin/auth/getuserinfo?access_token=<AT>&code=<CODE>"
# → { errcode:0, userid, user_ticket }
curl "https://mock.authn.tech/wecom/cgi-bin/user/get?access_token=<AT>&userid=<USERID>"
# → { errcode:0, userid:"zhangsan", name:"张三", department, mobile, email, ... }
```

## 在线演示(真实可点)

点"生成二维码登录",手机扫码或点二维码下方"(开发者)模拟扫码 → 确认登录",页面会带 `code` 回跳并按三步展示每一步响应。

<ClientOnly>
  <WechatLoginDemo lock-provider="wecom" />
</ClientOnly>

## 上线切换:只改「引入的 JS」与「URL」

Mock 的 SDK 与官方逐字节一致(`redirect_uri` 不做 `encodeURIComponent`),且不校验凭据值。上线时业务代码一行不用改,只替换两处:

| 改什么 | Mock | 真实 |
|--------|------|------|
| 引入的 JS | `https://mock.authn.tech/wecom/wwLogin.js` | 官方 `wwLogin` CDN 或 `@wecom/jssdk` |
| 后端 API base | `https://mock.authn.tech/wecom` | `https://qyapi.weixin.qq.com` |

后端路径(`/cgi-bin/gettoken`、`/cgi-bin/auth/getuserinfo`、`/cgi-bin/user/get`)、`new WwLogin({...})` 参数、返回字段都不变。

::: warning 仅供测试
Mock 固定返回一个测试成员(`userid=zhangsan`),授权码是短时效自签 JWT 且可重复使用,签名私钥公开。**任何生产系统都不应信任 Mock 服务。**
:::

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
