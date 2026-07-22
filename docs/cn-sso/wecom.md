---
title: "企业微信扫码登录"
---

# 企业微信扫码登录(WeCom)

"用企业微信登录"面向**企业内部员工**:让员工用企业微信扫码登进内部系统(OA、云桌面、后台等)。也是 **OAuth2 变体**,但 `access_token` 是**应用级**、取用户信息要**三步**(gettoken → auth/getuserinfo → user/get)。

> 面向 C 端个人用户的 [微信扫码登录](./wechat.md) 只需一步 `/sns/userinfo`,凭据也不同,别混用。

## 前提

1. 拿到企业 `corpid`;在企业微信管理后台创建**自建应用**,拿 `agentid` + 应用 `secret`;
2. 配置应用的**可信域名 / 登录回调域名**,且必须 **HTTPS**;
3. 登录的员工要在该应用的**可见范围**内。

## 流程

1. **内嵌二维码**:引入 `wwLogin.js`(或新版 `@wecom/jssdk`),`login_type=CorpApp`:

   ```html
   <div id="ww_login"></div>
   <script src="https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wwLogin-1.2.7.js"></script>
   <script>
     new WwLogin({
       id: "ww_login",
       appid: "你的_corpid",
       agentid: "你的_agentid",
       redirect_uri: encodeURIComponent("https://your-app.example/callback"),
       state: "随机防伪串"
     });
   </script>
   ```

   新版推荐 `@wecom/jssdk` 的 `ww.createWWLoginPanel({ params: { login_type: "CorpApp", appid, agentid, redirect_uri, state } })`,同时支持**二维码登录 + 桌面端快速登录**(桌面企业微信 > 3.1.23、HTTPS、用户在可见范围内时出现免扫码面板)。

2. 扫码确认 → 回跳 `redirect_uri?code=CODE&state=STATE`;
3. **后端第①步**:用 `corpid` + 应用 `secret` 换**应用级** `access_token`(有调用频率限制,**必须缓存**):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=CORPID&corpsecret=SECRET
   # → { errcode, errmsg, access_token, expires_in }
   ```

4. **第②步**:用 `access_token` + `code` 换 `userid`(可能还给 `user_ticket`):

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=ACCESS_TOKEN&code=CODE
   # → { errcode, errmsg, userid, user_ticket }
   ```

5. **第③步**:用 `access_token` + `userid` 查通讯录成员详情:

   ```bash
   GET https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=ACCESS_TOKEN&userid=USERID
   # → { errcode, errmsg, userid, name, department, mobile, email, ... }
   ```

   (可选)敏感字段用 `user_ticket` 调 `POST /cgi-bin/auth/getuserdetail` 获取。

## 关键概念

- **`userid`**:成员在**企业通讯录**内的唯一标识;是后续查详情、发消息的主键。
- **应用级 `access_token`**:不绑用户、代表"应用身份",有配额与频控,务必**服务端缓存并按 `expires_in` 刷新**。
- **可见范围**:员工不在应用可见范围内会提示无权限。
- **`errcode` / `errmsg`**:企业微信所有接口都用这套错误结构(`errcode:0` 为成功)。

## 用本站 Mock 企业微信联调

本站提供一个 **Mock 企业微信**,所有端点收敛在 `https://mock.authn.tech/wecom/` 下,与官方**输入输出一致**——同名 `WwLogin` SDK、相同回跳、相同 `/cgi-bin/*` 接口与字段,**不校验 corpid / secret / agentid 的值**,扫码后固定返回一个测试成员。

| 用途 | Mock 端点 | 对应企业微信官方 |
|------|-----------|-------------|
| JS SDK | `/wecom/wwLogin.js` | `wwcdn.weixin.qq.com/.../wwLogin-*.js` |
| 内嵌二维码页 | `/wecom/sso/qrConnect` | `open.work.weixin.qq.com/wwopen/sso/qrConnect` |
| ① 取 access_token | `/wecom/cgi-bin/gettoken` | `qyapi.weixin.qq.com/cgi-bin/gettoken` |
| ② code 换 userid | `/wecom/cgi-bin/auth/getuserinfo` | `qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo` |
| ③ 查成员详情 | `/wecom/cgi-bin/user/get` | `qyapi.weixin.qq.com/cgi-bin/user/get` |
| 控制台 | `/wecom/` | — |

## 在线演示(真实可点)

下面用上面这套 Mock 的**同款 SDK** 实跑一遍:点"生成二维码登录",扫码确认后页面带 `code` 回跳,并按企业微信规范三步走展示每一步的响应。

<ClientOnly>
  <WechatLoginDemo lock-provider="wecom" />
</ClientOnly>

## 上线切换:只改「引入的 JS」与「URL」

Mock 的 SDK 与官方逐字节一致(`redirect_uri` 不做 `encodeURIComponent`),且不校验凭据的值。上线时业务代码一行不用改,只替换两处:

| 改什么 | Mock | 真实 |
|--------|------|------|
| 引入的 JS | `https://mock.authn.tech/wecom/wwLogin.js` | 官方 `wwLogin` CDN 或 `@wecom/jssdk` |
| 后端 API base | `https://mock.authn.tech/wecom` | `https://qyapi.weixin.qq.com` |

后端路径(`/cgi-bin/gettoken`、`/cgi-bin/auth/getuserinfo`、`/cgi-bin/user/get`)、`new WwLogin({...})` 参数、返回字段都不变。

::: warning 仅供测试
Mock 固定返回一个测试成员(`userid=zhangsan`),授权码是短时效自签 JWT 且可重复使用,签名私钥公开。**任何生产系统都不应信任 Mock 服务。**
:::

## 相关阅读

- [微信扫码登录](./wechat.md) · [Mock 服务器总览](../mock/)
- [OAuth 2.0 文档](../oauth2/) · [JWT 解析器](../tools/jwt.md)

## 参考来源

- [Web 登录组件 / 构造扫码登录链接 —— 企业微信开发者中心](https://developer.work.weixin.qq.com/document/path/98152)
- [获取访问凭证 gettoken —— 企业微信开发者中心](https://developer.work.weixin.qq.com/document/path/91039)
- [身份验证 auth/getuserinfo · 读取成员 user/get —— 企业微信开发者中心](https://developer.work.weixin.qq.com/document/path/91023)

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
