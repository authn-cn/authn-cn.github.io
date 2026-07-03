---
title: OIDC 登录演示
---

# OIDC 登录演示（真实流程）

下面是一个**真实可点**的 OpenID Connect 登录演示,后端是本站的 [Mock OIDC OP](./README.md)。点击按钮后:

1. 浏览器生成 PKCE（`code_verifier` / `code_challenge`）与 `state`、`nonce`,跳转到 Mock OP 的授权端点;
2. 在 Mock OP 选择一个测试用户（alice / bob）——它没有密码,点谁就是谁;
3. Mock OP 带 `code` 回跳到**本页**;
4. 本页自动用 `code`（+ `code_verifier`）向 token 端点换取 `id_token` / `access_token`,再调 `userinfo`,并展示每一步的解析结果与校验。

<ClientOnly>
  <OidcDemo />
</ClientOnly>

## 这演示了什么

- **Authorization Code Flow + PKCE**:授权码通过浏览器回跳传递,`code_verifier` 只在 token 请求中出示,即使授权码泄漏也无法被换成令牌。
- **`state` 校验**:回跳时比对 `state`,防 CSRF。
- **`nonce` 校验**:比对 ID Token 里的 `nonce` 与发起时的值,防止 ID Token 重放。
- **`aud` 校验**:确认 ID Token 的 `aud` 是本客户端。
- **令牌与身份分离**:`access_token` 用于调 `userinfo`,`id_token` 用于确认"用户是谁"。

想手动逐步操作、或在自己的应用里接入,见 [Mock 服务器端点与快速开始](./README.md);想解析任意 JWT,用 [JWT 解析器](../tools/jwt.md)。

<script setup>
import OidcDemo from '@components/OidcDemo.vue'
</script>
