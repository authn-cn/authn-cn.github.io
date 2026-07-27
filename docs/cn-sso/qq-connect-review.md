---
title: "QQ 互联身份接口标准化与安全评价"
---

# QQ 互联身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。本页只评价 QQ 互联，不以微信、企业微信或 CloudBase 的能力替它加分。

::: tip 结论
**41 / 100（D）**。QQ 互联提供授权码、state、刷新轮换和应用作用域 OpenID，但公开资料仍保留移动端 Implicit、查询串 Secret/token、非标准 token 响应与 JSONP 式 OpenID 接口。它是可兼容的社交登录，不是现代 OIDC 基线。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.0 | OAuth2 式授权可用；无已验证 Discovery、ID token、JWKS 或标准 UserInfo |
| 授权流程安全 | 15% | 2.0 | code/state 可用；仍指导 Implicit，未验证公共客户端强制 PKCE 与精确回调 |
| 令牌与客户端凭据安全 | 15% | 1.5 | refresh token 一次性轮换；Secret/token 查询串、较长 token 与无标准吊销降低得分 |
| 权限模型与最小授权 | 15% | 2.5 | 授权权限可控制，但标准 scope/resource/audience 与最小权限证据有限 |
| 密码学与密钥生命周期 | 10% | 2.0 | HTTPS 可用；未验证非对称认证、JWKS、`kid` 与自动轮换 |
| 主体标识与账号生命周期 | 10% | 2.5 | app-scoped OpenID 明确；标准 subject、解绑/注销事件与跨应用模型不足 |
| 回调、事件与防重放 | 10% | 2.0 | state 和一次性 code 提供基础控制；事件签名、nonce、重放机制未充分验证 |
| API 传输与消息语义 | 5% | 2.0 | 查询串凭据、默认表单字符串和 JSONP 式响应偏离现代 API 语义 |

## 标准符合度判断

- 可肯定：网站授权码、state、一次性 code 和 refresh token 轮换。
- 不能等同：`/oauth2.0/me` 的 OpenID 响应不是 OIDC ID token/UserInfo。
- 产品隔离：QQ OpenID 与微信 OpenID/UnionID、企业微信 userId、CloudBase sub 无跨产品等价关系。

## 平台改进顺序

1. 提供完整 OIDC、Discovery、JWKS、ID token 与标准 JSON UserInfo。
2. 停止新客户端 Implicit，强制授权码 + PKCE、state/nonce 和精确回调。
3. 凭据只允许请求体/授权头，提供标准 revocation/introspection 与刷新重放检测。
4. 发布标准错误、JSON media type 和注销/解绑事件。

## 接入方当前控制

- 禁止新项目 Implicit；code 后端兑换，全链路脱敏 URL 中的 Secret/token。
- 对 `/me` 做严格数据解析，不执行回调文本；由网关签发内部会话。
- 用 `(qq_connect, appid, openid)` 保存身份，绝不跨腾讯产品复用裸 ID。

## 官方资料

- [QQ 互联 OAuth2 简介](https://wiki.connect.qq.com/oauth2-0%E7%AE%80%E4%BB%8B)
- [QQ 互联授权码换 token](https://wiki.connect.qq.com/%E4%BD%BF%E7%94%A8authorization_code%E8%8E%B7%E5%8F%96access_token)
- [QQ 互联获取 OpenID](https://wiki.connect.qq.com/%E8%8E%B7%E5%8F%96%E7%94%A8%E6%88%B7openid_oauth2-0)

> 核验日期：2026-07-27。
