---
title: WebAuthn 演示
---

# WebAuthn / Passkey 演示

在本页当前域内真实调用浏览器 WebAuthn API,创建并使用一个 Passkey,解析展示浏览器返回的 `clientDataJSON`、`authenticatorData`(flags / signCount)、attestation 格式与凭证公钥(COSE)。需要支持 WebAuthn 的浏览器与认证器(平台指纹 / Face ID / 安全密钥)。纯前端,数据不上传。

<ClientOnly>
  <WebauthnDemo />
</ClientOnly>

::: tip 完整服务端流程
本页只演示浏览器侧数据结构。要体验含<strong>服务端验签</strong>的完整注册/登录闭环,见自包含的
[Mock WebAuthn RP](https://authn-mock.lich-wang8718.workers.dev/webauthn/)。
:::

原理见 [WebAuthn 注册与认证流程](../webauthn/flows.md)。

<script setup>
import WebauthnDemo from '@components/WebauthnDemo.vue'
</script>
