---
title: TOTP 工具
---

# TOTP 生成 / 验证工具

生成 TOTP 共享密钥(Base32)、实时计算当前验证码与倒计时、生成 `otpauth://` URI 与二维码(可用 Google Authenticator / Authy 等扫码添加),并可校验一个验证码。全部在浏览器本地计算,密钥不上传。

<ClientOnly>
  <TotpTool />
</ClientOnly>

::: tip 与 Mock 联调
本站 [Mock TOTP 验证器](https://authn-mock.lich-wang8718.workers.dev/totp/) 可用同一密钥在服务端算码/验证:
`curl "https://authn-mock.lich-wang8718.workers.dev/totp/code?secret=<你的secret>"`
:::

原理见 [HOTP / TOTP 算法详解](../mfa/totp.md)。

<script setup>
import TotpTool from '@components/TotpTool.vue'
</script>
