---
title: "典型流程"
---

# 典型流程

本页覆盖三个最重要的流程:SP-initiated SSO、IdP-initiated SSO 与 Single Logout(SLO)。阅读前建议先熟悉[核心概念](./concepts.md)中的 Binding 与 Assertion 结构。

以下示例约定:

- SP Entity ID:`https://sp.example.com/saml/metadata`,ACS 地址:`https://sp.example.com/saml/acs`
- IdP Entity ID:`https://idp.example.org/saml/metadata`,SSO 地址:`https://idp.example.org/sso`

## SP-initiated SSO(Redirect + POST)

最常见的组合:AuthnRequest 走 HTTP-Redirect Binding,Response 走 HTTP-POST Binding。

### 分步流程

1. 用户访问 SP 受保护资源 `https://sp.example.com/app/dashboard`,SP 发现无本地会话。
2. SP 生成 `<AuthnRequest>`,记录其 `ID`(稍后校验 `InResponseTo` 用),将期望回跳的深链接存入 RelayState(或存本地、RelayState 只放 key)。
3. SP 对 AuthnRequest 做 **deflate 压缩 → Base64 编码 → URL 编码**,拼到 IdP SSO 端点的查询参数上,302 重定向浏览器。
4. 浏览器请求 IdP。IdP 校验 AuthnRequest(Issuer 是否为已登记 SP、`AssertionConsumerServiceURL` 是否与 Metadata 一致、签名(如要求))。
5. 用户在 IdP 完成认证(输密码/MFA;若 IdP 已有会话则直接跳过登录页)。
6. IdP 构造 `<Response>`(内含签名的 Assertion,`InResponseTo` 填 AuthnRequest 的 ID),Base64 编码后放入自动提交表单,返回给浏览器。
7. 浏览器自动 POST 表单(`SAMLResponse` + `RelayState`)到 SP 的 ACS(Assertion Consumer Service)端点。
8. SP 完成全部校验(见下文校验清单),创建本地会话,按 RelayState 跳转到 `https://sp.example.com/app/dashboard`。

### AuthnRequest 示例

```xml
<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_req_8f3a2b1c9d4e"
    Version="2.0"
    IssueInstant="2026-07-03T08:29:55Z"
    Destination="https://idp.example.org/sso"
    AssertionConsumerServiceURL="https://sp.example.com/saml/acs"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <samlp:NameIDPolicy
      Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      AllowCreate="true"/>
  <samlp:RequestedAuthnContext Comparison="exact">
    <saml:AuthnContextClassRef>
      urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
    </saml:AuthnContextClassRef>
  </samlp:RequestedAuthnContext>
</samlp:AuthnRequest>
```

### Redirect URL 的编码方式

Redirect Binding 下 `SAMLRequest` 参数的生成步骤(顺序不能错):

1. **DEFLATE 压缩**:对 XML 原文做 raw deflate(RFC 1951,**无 zlib 头**,即 Python `zlib.compress(data, 9)[2:-4]` 或 `wbits=-15`);
2. **Base64 编码**(标准字母表,非 URL-safe 变体);
3. **URL 编码**(percent-encoding,因为 Base64 结果含 `+` `/` `=`)。

```http
GET /sso?SAMLRequest=fZJNb9swDIbv%2BRUC77bl2E1qIU6...
    &RelayState=%2Fapp%2Fdashboard
    &SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256
    &Signature=GtN2t7Jf...%3D HTTP/1.1
Host: idp.example.org
```

若对请求签名:对字符串 `SAMLRequest=<v>&RelayState=<v>&SigAlg=<v>`(各值均为 URL 编码后形态,按此固定顺序、且只包含实际存在的参数)计算签名,Base64 后作为 `Signature` 参数附加。**Redirect Binding 的签名不在 XML 内部**。

::: warning 常见编码错误
- 忘了 deflate,或用了带 zlib 头的压缩 → IdP 报 "unable to inflate/parse request";
- 用了 URL-safe Base64 → 解码失败;
- 对已 URL 编码的串二次编码,或框架自动解码后又手工解码 → `%` 相关解析错误。
:::

### Response 示例

IdP 通过自动提交表单把 Response 送回 SP:

```http
POST /saml/acs HTTP/1.1
Host: sp.example.com
Content-Type: application/x-www-form-urlencoded

SAMLResponse=PHNhbWxwOlJlc3BvbnNlIC4uLg%3D%3D&RelayState=%2Fapp%2Fdashboard
```

`SAMLResponse` Base64 解码后(POST Binding **只有 Base64,没有 deflate**):

```xml
<samlp:Response
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_resp_5e6f7a8b"
    Version="2.0"
    IssueInstant="2026-07-03T08:30:10Z"
    Destination="https://sp.example.com/saml/acs"
    InResponseTo="_req_8f3a2b1c9d4e">
  <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_asrt_9c0d1e2f" Version="2.0"
                  IssueInstant="2026-07-03T08:30:10Z">
    <saml:Issuer>https://idp.example.org/saml/metadata</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
      <ds:SignedInfo>
        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
        <ds:Reference URI="#_asrt_9c0d1e2f">
          <ds:Transforms>
            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
          </ds:Transforms>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
          <ds:DigestValue>Kx7...=</ds:DigestValue>
        </ds:Reference>
      </ds:SignedInfo>
      <ds:SignatureValue>hR4k...=</ds:SignatureValue>
    </ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
        alice@example.org
      </saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">
        <saml:SubjectConfirmationData
            Recipient="https://sp.example.com/saml/acs"
            NotOnOrAfter="2026-07-03T08:35:10Z"
            InResponseTo="_req_8f3a2b1c9d4e"/>
      </saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2026-07-03T08:29:40Z"
                     NotOnOrAfter="2026-07-03T08:35:10Z">
      <saml:AudienceRestriction>
        <saml:Audience>https://sp.example.com/saml/metadata</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2026-07-03T08:30:10Z"
                         SessionIndex="_sess_20260703_42">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>
          urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport
        </saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="mail"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>alice@example.org</saml:AttributeValue>
      </saml:Attribute>
      <saml:Attribute Name="displayName"
          NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">
        <saml:AttributeValue>Alice Zhang</saml:AttributeValue>
      </saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>
```

### SP 侧校验清单(缺一不可)

1. `Status/StatusCode` 为 `Success`;
2. 验签(用 Metadata 登记证书;按策略要求 Assertion 和/或 Response 必须签名);
3. `Issuer` 等于预期 IdP Entity ID;
4. `Destination` 与 `SubjectConfirmationData/@Recipient` 等于本 SP 的 ACS URL;
5. `InResponseTo` 匹配本 SP 未消费的某个 AuthnRequest ID,匹配后立即作废该 ID;
6. `Conditions` 时间窗有效,`<Audience>` 包含本 SP Entity ID;
7. Assertion `ID` 未曾处理过(防重放,在有效期窗口内缓存已见 ID)。

### 常见坑

::: warning 常见坑
- **时钟偏移**:IdP 与 SP 时钟差几十秒就会命中 `NotBefore`/`NotOnOrAfter` 边界。双方都应启用 NTP;SP 校验时允许 2–3 分钟 clock skew 容差,但不要放宽到 5 分钟以上。
- **Audience 校验缺失**:不校验 `<Audience>` 时,IdP 签给 A 应用的 Assertion 可拿去登录 B 应用(同一 IdP 下的横向越权)。Audience 比对的是 **SP Entity ID**,不是 ACS URL。
- **InResponseTo 校验缺失**:不校验则无法防重放/注入,攻击者可把窃取的 Response 注入任意会话。注意:IdP-initiated 流程没有 InResponseTo,SP 需明确区分两种模式的策略。
- **ACS URL 用 HTTP 或带通配**:ACS 必须是精确匹配的 HTTPS 地址。
- **RelayState 开放重定向**:见[核心概念](./concepts.md#relaystate)。
:::

## IdP-initiated SSO

用户从 IdP 门户(应用列表)点击某个应用图标直接进入 SP,**没有 AuthnRequest 环节**。

### 分步流程

1. 用户登录 IdP 门户,点击目标应用图标;
2. IdP 直接为该 SP 构造签名的 Response(**无 `InResponseTo`**),RelayState 按 IdP 侧配置填写(通常为目标 URL);
3. 浏览器将表单 POST 到 SP 的 ACS;
4. SP 校验后建立会话(跳过 InResponseTo 校验,其余校验项与 SP-initiated 相同)。

### 安全注意事项

::: danger IdP-initiated 的固有弱点
由于 Response 不对应任何 SP 发出的请求,SP 无法通过 `InResponseTo` 把消息绑定到自己发起的流程,因此:

- **天然无法防御 Response 注入/CSRF 式登录**(攻击者可把自己的合法 Assertion POST 进受害者浏览器,使受害者"被登录"到攻击者账号,即 Login CSRF);
- 只能退而依赖:极短的 Assertion 有效期、严格的一次性 ID 防重放、Audience/Recipient 严格校验;
- 能关就关:若无业务必要,SP 应默认**禁用 IdP-initiated**,IdP 门户图标可以配置成触发 SP-initiated 流程(跳到 SP 的登录发起 URL)来兼得体验与安全。
:::

## Single Logout(SLO)

SLO 的目标:结束用户在 IdP 及所有已登录 SP 的会话。消息为 `<LogoutRequest>`/`<LogoutResponse>`,前端通道常用 HTTP-Redirect Binding。IdP 依赖登录时 Assertion 中的 `SessionIndex` 与 NameID 定位要终结的会话。

### SP 发起的 SLO

1. 用户在 SP1 点"退出"。SP1 结束本地会话,向 IdP 的 SLO 端点发送签名的 `<LogoutRequest>`(Redirect Binding,含 NameID 与 SessionIndex);
2. IdP 校验后,遍历该 IdP 会话涉及的其他 SP(SP2、SP3…),逐个通过浏览器重定向发送 `<LogoutRequest>`,各 SP 结束会话并回 `<LogoutResponse>`;
3. IdP 结束自身会话,最后向发起方 SP1 返回 `<LogoutResponse>`(Status 可能为 Success 或 PartialLogout);
4. SP1 展示"已退出"页面。

`LogoutRequest` 示例:

```xml
<samlp:LogoutRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="_lo_3c4d5e6f" Version="2.0"
    IssueInstant="2026-07-03T09:00:00Z"
    Destination="https://idp.example.org/slo">
  <saml:Issuer>https://sp.example.com/saml/metadata</saml:Issuer>
  <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">
    alice@example.org
  </saml:NameID>
  <samlp:SessionIndex>_sess_20260703_42</samlp:SessionIndex>
</samlp:LogoutRequest>
```

### IdP 发起的 SLO

1. 用户在 IdP 门户点"全局退出"(或管理员强制下线);
2. IdP 逐个向本次会话涉及的 SP 发送 `<LogoutRequest>`,收集各方 `<LogoutResponse>`;
3. IdP 结束自身会话并展示结果。

### 常见坑

::: warning 常见坑
- **SLO 是出了名的脆弱**:前端通道 SLO 依赖浏览器逐跳重定向串起所有 SP,任何一个 SP 端点挂掉/超时/证书错误,链条就断,后续 SP 收不到登出通知。务必正确处理并上报 `PartialLogout` 状态,不要向用户谎称"已全部退出"。
- **SessionIndex 未保存**:SP 登录时若没有把 `SessionIndex` 存进本地会话,登出时无法填入 LogoutRequest,部分 IdP 会因此拒绝或登出该用户全部会话。
- **LogoutRequest 必须验签**:未签名/未验签的 LogoutRequest 会被用作 DoS——攻击者可任意把用户踢下线。
- **第三方 Cookie 限制**:浏览器对 iframe 内第三方 Cookie 的限制会导致基于 iframe 的并行 SLO 失效,优先采用顺序重定向方式。
- **超时兜底**:很多现实部署最终选择"只做本地登出 + IdP 会话短超时"的务实方案;若采用,须向安全团队明确说明残余风险(其他 SP 会话仍存活)。
:::

---

各元素/参数的逐项含义,见[典型参数与消息参考](./reference.md)。
