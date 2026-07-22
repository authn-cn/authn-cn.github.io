---
title: 微信 / 企业微信扫码登录演示
---

# 微信 / 企业微信扫码登录演示

纯浏览器端、**真实可点**的扫码登录演示。它用与官方**逐字节一致**的 Mock SDK(`WxLogin` / `WwLogin`)内嵌二维码,走完整的授权码流程,最后在本页换取并展示用户信息。切换下面的标签选择「微信(网站应用)」或「企业微信」。

<ClientOnly>
  <WechatLoginDemo />
</ClientOnly>

## 怎么玩

1. 选平台 → 点「生成二维码登录」;
2. 手机扫码,或点二维码下方「(开发者)模拟扫码 → 确认登录」;
3. 页面带 `code` 回跳,本页校验 `state` 后调用 Mock 后端接口:
   - **微信**:`/sns/oauth2/access_token` → `/sns/userinfo`;
   - **企业微信**:`/cgi-bin/gettoken` → `/cgi-bin/auth/getuserinfo` → `/cgi-bin/user/get`。

整个换取过程在你浏览器本地完成(Mock 已开 CORS)。默认对接本站 [Mock 服务](../mock/),顶部输入框可改成你自己的部署地址。

## 想深入?

- 📖 协议详解:[微信扫码登录](../cn-sso/wechat.md) · [企业微信扫码登录](../cn-sso/wecom.md) —— JS SDK 在干什么、为什么用它、企业微信为何分三步
- 🧪 Mock 使用:[Mock 微信](../mock/wechat.md) · [Mock 企业微信](../mock/wecom.md) —— 端点、接入代码与「上线只改 JS 与 URL」

::: warning 仅供测试
Mock 固定返回一个测试用户/成员,授权码是短时效自签 JWT 且可重复使用,签名私钥公开。切勿用于生产。
:::

<script setup>
import WechatLoginDemo from '@components/WechatLoginDemo.vue'
</script>
