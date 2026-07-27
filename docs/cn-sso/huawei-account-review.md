---
title: "华为账号 Account Kit 标准化与安全评价"
---

# 华为账号 Account Kit 标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页只评价 Account Kit 的消费者身份接口。

::: tip 结论
**72.5 / 100（B）**。Account Kit 明确采用 OAuth 2.0/OIDC，授权码可换 access、refresh 与 ID token，并提供多端 SDK及撤销能力，标准化方向明显优于仅用私有用户信息接口的社交登录。公开证据尚未完整覆盖 Discovery/JWKS、强制 PKCE、刷新重放检测和发送方约束，因此仍需在上线验收中逐项验证。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 4.0 | 官方明确 OAuth2/OIDC 并返回 ID token；Discovery、JWKS 与完整 claims 互操作未在本次全部验证 |
| 授权流程安全 | 15% | 3.5 | 授权码和多端安全 SDK可用；公共客户端强制 PKCE、nonce 与回调精确匹配需补证 |
| 令牌与客户端凭据安全 | 15% | 3.5 | access/refresh/id token 分离并有撤销；刷新轮换重放检测和发送方约束未验证 |
| 权限模型与最小授权 | 15% | 3.5 | 账号授权和应用权限可控制；标准 resource/audience 与敏感 scope治理证据有限 |
| 密码学与密钥生命周期 | 10% | 4.0 | ID token 签名与 TLS 1.2基线可用；JWKS `kid` 自动轮换过程需在生产验收 |
| 主体标识与账号生命周期 | 10% | 3.5 | 标准 subject/ID token 方向和撤销可用；全端注销、删除通知等尚未完整验证 |
| 回调、事件与防重放 | 10% | 3.0 | 授权码和 nonce 可构建防重放；统一撤销事件与幂等机制未充分验证 |
| API 传输与消息语义 | 5% | 4.0 | HTTPS、POST form token 与标准 token 类型较规范 |

## 标准符合度判断

- 可肯定：它是本组中明确提供 `id_token` 的消费者账号系统，不能与仅有 OAuth 用户信息接口的平台等同。
- 待验证：OIDC Discovery、JWKS、issuer/audience/nonce 规则、PKCE 强制、标准注销与刷新重放。
- 产品边界：Account Kit 的 subject 与 WeLink `userId`、华为云 IAM 用户完全独立。

## 平台改进顺序

1. 在统一入口公开 Discovery、JWKS、claims 与密钥轮换 SLA，并提供 OIDC 一致性测试结果。
2. Android、HarmonyOS、Web 全部强制授权码 + PKCE 和 nonce，明确精确回调策略。
3. 提供标准 revocation/introspection、刷新轮换重放事件及可选 DPoP。
4. 完整公开注销、解绑、账号删除和多设备会话终止语义。

## 接入方当前控制

- code 只在后端兑换，严格校验 ID token 的签名、issuer、audience、nonce 与时间。
- 原生应用使用系统浏览器/安全回跳；Secret 不进入安装包。
- 以 `(issuer, subject)` 建立主键，与 WeLink、华为云 IAM 映射隔离。

## 官方资料

- [华为账号 Account Kit](https://developer.huawei.com/consumer/cn/sdk/account-kit)
- [Account Kit 授权码与 token](https://developer.huawei.com/consumer/cn/codelab/HMSAccounts/index.html)
- [Account Kit 应用 token API](https://developer.huawei.com/consumer/en/doc/harmonyos-references/account-api-obtain-app-token)

> 核验日期：2026-07-27。
