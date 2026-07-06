---
title: TOTP 工具
---

# TOTP 生成 / 验证工具

生成 TOTP 共享密钥(Base32)、实时计算当前验证码与倒计时、生成 `otpauth://` URI 与二维码(可用 Google Authenticator / Authy 等扫码添加),并可校验一个验证码。全部在浏览器本地计算,密钥不上传。

面向开发调试还提供:

- **二维码导入** —— 上传一张 `otpauth://` 二维码图片(本地 `jsQR` 解码),或直接粘贴 `otpauth://` URI,自动填入各字段。
- **收藏为书签** —— 「放进地址栏」把当前 TOTP 编码进 URL 片段(`#t=…`),按 <kbd>Ctrl</kbd>+<kbd>D</kbd> 收藏,下次打开书签即自动恢复;也可复制该收藏链接。
- **本地列表** —— 「保存到本地列表」把多个 TOTP 存进浏览器 `localStorage`,列表里每条实时出码,可一键复制验证码、编辑或删除。适合同时调试多个账号。

::: warning 安全提醒
收藏链接与本地列表都会**明文保存 secret**(在 URL / 书签 / localStorage 中),仅供测试密钥使用,请勿存放生产环境的 TOTP 密钥。
:::

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
