---
title: 邮件服务器
---

# Mock 邮件服务器

一个**开箱即用的在线收件箱**,用 [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/) 接收邮件,写入 D1,可在线或用 API 查看,并自动抽取一次性验证码。典型用途:联调**邮件一次性验证码(email OTP / HOTP)、魔术链接**——被测系统把验证码发到某个 `@authn.tech` 地址,测试再用 API 立即取回。

**在线收件箱:<https://mock.authn.tech/mail/>**(需输入具体收件地址)

## 怎么用

1. 把验证码 / 链接邮件发到任意 `@authn.tech` 地址,例如 `otp@authn.tech`(收件人本地名随意)。
2. 在线看:打开 [`/mail/?to=otp@authn.tech`](https://mock.authn.tech/mail/?to=otp@authn.tech),点主题查看详情与渲染后的正文。
3. 或用 API 取回(适合 CI / 自动化):

```bash
# 取该地址最新一封邮件,含自动抽取的验证码
curl "https://mock.authn.tech/mail/api/latest?to=otp@authn.tech"
# → { "from": "...", "subject": "...", "code": "135790", "text": "...", ... }
```

无需真实收信时,可注入一封"假邮件"联调:

```bash
curl -X POST https://mock.authn.tech/mail/api/inject \
  -H 'Content-Type: application/json' \
  -d '{"to":"otp@authn.tech","subject":"登录验证码","text":"您的验证码是 135790"}'
```

## 端点

| 端点 | 说明 |
|------|------|
| `GET /mail/?to=<地址>` | 在线收件箱(**必须**指定收件地址) |
| `GET /mail/view/<id>` | 在线查看单封邮件 |
| `GET /mail/api/messages?to=<地址>&limit=` | 列表 JSON |
| `GET /mail/api/messages/<id>` | 单封 JSON(含正文) |
| `GET /mail/api/latest?to=<地址>` | 最新一封 JSON,含抽取到的 `code` |
| `POST /mail/api/inject` | 注入假邮件(`to` 必填) |
| `POST /mail/api/clear?to=<地址>` | 清空某地址的邮件 |

::: warning 必须指定收件人
出于隐私,列表 / 最新 / 清空**都必须带具体收件地址** `to`;不提供"查看全部收件箱"。发件人只要知道自己用的收件地址即可查看,互不干扰。
:::

::: danger 仅供测试
这是公开的 Mock 收件箱:任何知道收件地址的人都能读到发到该地址的邮件,**切勿发送真实敏感信息**。收件仅保留 24 小时,之后自动清除。
:::

## 它怎么实现的

发到 `@authn.tech` 的邮件由 Cloudflare Email Routing 投递到 Worker 的 `email()` 处理器,用 `postal-mime` 解析 MIME,取出主题与正文、抽取验证码后写入 D1;查看端点从 D1 读取。整条链路:**发信 → Email Routing → Worker → 解析入库 → 在线/API 查看**。
