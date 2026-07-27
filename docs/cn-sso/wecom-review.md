---
title: "企业微信身份接口标准化与安全评价"
---

# 企业微信身份接口标准化与安全评价

> 采用[统一协议安全评价方法](./methodology.md)。通讯录、客户联系和消息等业务价值不进入评分；重点是外部系统是否能用标准、安全、可替换的身份协议接入。

::: tip 结论
**55.5 / 100（C）**。企业微信具有明确的应用权限、企业边界、可信域名/IP 和加密回调，私有协议可以安全落地；但扫码登录、应用 token、成员标识、通讯录供应和消息加密主要是企业微信专用协议。公开资料未验证通用 OIDC/SAML IdP、OAuth metadata/JWKS、PKCE、标准 revocation、SCIM 或发送方约束令牌。SHA-1/AES 的自定义回调封装也不应成为新标准接口的基线。
:::

## 统一评分

| 技术维度 | 权重 | 分数 | 依据 |
|---|---:|---:|---|
| 身份联邦与协议互操作 | 20% | 2.0 | 外部系统登录采用企业微信私有授权码与成员查询；未验证完整 OIDC Provider/标准 metadata |
| 授权流程安全 | 15% | 2.5 | 一次性 code、`state`、可信域名可用；未验证 PKCE、`nonce` 和标准原生应用流程 |
| 令牌与客户端凭据安全 | 15% | 2.5 | 应用 token 有时效并受可见范围/可信 IP 限制；Secret 换 token 和生命周期为私有协议 |
| 权限模型与最小授权 | 15% | 4.0 | 应用可见范围、API 权限、管理员授权和租户边界较强 |
| 密码学与密钥生命周期 | 10% | 2.5 | HTTPS 与 AES 消息加密可用；自定义 SHA-1 签名、无通用 JWKS/算法协商和自动轮换证据 |
| 主体标识与账号生命周期 | 10% | 3.0 | `(corpId, userid)` 边界明确且有变更事件；未提供标准 `iss/sub` 和公开 SCIM 2.0 |
| 回调、事件与防重放 | 10% | 3.5 | 签名、时间戳、nonce 和消息加密可用；算法与封装私有，幂等/重放仍需接入方实现 |
| API 传输与消息语义 | 5% | 2.5 | HTTPS 可用，但部分凭据通过查询参数、HTTP 200 + `errcode` 等私有语义较多 |

## 标准符合度判断

- 扫码返回 `code`，再用应用 token 查询 `userid`，只是“授权码式私有登录”；没有标准 `id_token`、Discovery 和 JWKS 时不能作为 OIDC。
- 应用可见范围和 API 权限是有效的最小授权控制，但不等于 OAuth 标准 scope/resource 模型。
- `userid` 是企业内成员标识，必须与 `corpId` 组合；它不是跨租户标准 `sub`。
- 通讯录 API 与变更回调能完成账号同步，但没有 SCIM schema、Users/Groups 端点和标准过滤/补丁语义时不能称为 SCIM。
- `WXBizMsgCrypt` 的签名、AES 加密和 nonce 能提供实际保护，但 SHA-1 拼接与平台专用消息格式缺少现代算法敏捷性和通用互操作性。

## 建议企业微信按此顺序改进

1. 提供完整 OIDC Provider：Discovery、JWKS、标准 `id_token`、UserInfo、`iss + sub` 和 RP-Initiated Logout。
2. 为网页、桌面和移动登录统一授权码 + PKCE；Secret 仅用于机密客户端认证，公共客户端不得依赖共享密钥。
3. 为应用授权发布 OAuth metadata、标准 revocation/introspection；逐步把 token 从查询参数迁移到 Authorization 头。
4. 提供 SCIM 2.0 Users/Groups 和企业扩展，将人员/部门生命周期从专用通讯录 API 解耦。
5. 新增 HMAC-SHA-256/JWS 或 mTLS 回调方案，包含 `kid`、算法版本、短时间窗和事件唯一 ID；保留旧加密库仅作兼容。
6. 逐步采用 HTTP 状态码与标准 OAuth 错误，减少每个调用方重复解析 `errcode`。

## 接入企业当前应做什么

- 由身份网关把企业微信私有登录转换为企业内部 OIDC，不允许业务应用各自实现扫码换票。
- Secret、应用 token、suite 凭据按企业和应用隔离，禁止进入前端、URL 日志和 APM 标签。
- 使用 `(corpId, userid)` 作为成员外部键；外部联系人 ID、开放平台 ID 和成员 ID 分表管理。
- 回调先按官方库验签解密，再检查时间窗/nonce、业务主键去重；关键目录数据用定期对账补偿。
- 把可信 IP 视为附加控制，而不是令牌认证、签名和最小权限的替代品。

## 官方资料

- [企业微信开发前必读](https://developer.work.weixin.qq.com/document/path/90664)
- [获取访问凭证](https://developer.work.weixin.qq.com/document/path/91039)
- [Web 登录组件](https://developer.work.weixin.qq.com/document/path/98152)
- [身份验证与成员信息](https://developer.work.weixin.qq.com/document/path/91023)
- [SCIM Protocol（RFC 7644）](https://datatracker.ietf.org/doc/html/rfc7644)

> 核验日期：2026-07-27。分数不否定企业微信的业务价值，只说明标准身份协议的可替换性仍明显低于其私有 API 的可用性。
