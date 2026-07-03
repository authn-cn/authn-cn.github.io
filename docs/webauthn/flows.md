---
title: 注册与认证流程
---

# 注册与认证流程

WebAuthn 有两个 **ceremony(仪式)**:注册(registration)与认证(authentication)。二者结构对称——RP 先下发带 **challenge(质询)** 的 options,浏览器驱动认证器产生结果,RP 再做严格验证。术语见 [核心概念](./concepts.md),字段细节见 [参考](./reference.md)。

## 一、注册 ceremony

### 分步流程

1. **RP 服务端生成 `PublicKeyCredentialCreationOptions`**:包含一次性 `challenge`、`rp`(依赖方信息)、`user`(用户句柄)、`pubKeyCredParams`(可接受的算法),以及可选的 `authenticatorSelection`、`excludeCredentials`、`attestation`。`challenge` 与 `user.id` 是二进制,须以 Base64URL 传给前端。
2. **前端解码并调用 `navigator.credentials.create()`**:把 Base64URL 字段还原为 `ArrayBuffer` 后调用,浏览器校验 `rp.id` 与当前 origin 的匹配关系。
3. **浏览器 + 认证器**:浏览器组装 `clientDataJSON`,通过 CTAP 请求认证器。认证器验证用户(UP/UV)、生成新密钥对、存私钥、产出 `attestationObject`。
4. **认证器返回 `PublicKeyCredential`**:其 `response` 为 `AuthenticatorAttestationResponse`,含 `attestationObject` 与 `clientDataJSON`。
5. **前端把结果(Base64URL 编码)POST 给 RP**。
6. **RP 验证并持久化**:校验 challenge/origin/type/flags,解析 `attestationObject` 取出 `credentialPublicKey`、`credentialId`、`signCount` 并与用户账户绑定存储。

### 前端示例:发起注册

```js
// options 来自 RP,challenge / user.id / excludeCredentials[].id 为 Base64URL 字符串
const options = await fetch('/webauthn/register/options', {
  method: 'POST', credentials: 'include',
}).then(r => r.json());

// 把 Base64URL 还原为 ArrayBuffer
const b64urlToBuf = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer;

options.challenge = b64urlToBuf(options.challenge);
options.user.id = b64urlToBuf(options.user.id);
if (options.excludeCredentials) {
  options.excludeCredentials = options.excludeCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const cred = await navigator.credentials.create({ publicKey: options });

// 把结果编码回 Base64URL 发给 RP
const bufToB64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

await fetch('/webauthn/register/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: cred.id,
    rawId: bufToB64url(cred.rawId),
    type: cred.type, // "public-key"
    response: {
      clientDataJSON: bufToB64url(cred.response.clientDataJSON),
      attestationObject: bufToB64url(cred.response.attestationObject),
      transports: cred.response.getTransports?.() ?? [],
    },
  }),
});
```

### JSON 示例:`PublicKeyCredentialCreationOptions`(RP 下发,字段为 Base64URL)

```json
{
  "rp": { "id": "example.com", "name": "Example Corp" },
  "user": {
    "id": "S3v9Y2k...Base64URL...",
    "name": "alice@example.com",
    "displayName": "Alice"
  },
  "challenge": "b3Blbi1jaGFsbGVuZ2UtcmFuZG9t",
  "pubKeyCredParams": [
    { "type": "public-key", "alg": -7 },
    { "type": "public-key", "alg": -257 }
  ],
  "timeout": 60000,
  "excludeCredentials": [
    { "type": "public-key", "id": "ZXhpc3RpbmctY3JlZC1pZA", "transports": ["internal"] }
  ],
  "authenticatorSelection": {
    "residentKey": "required",
    "userVerification": "preferred"
  },
  "attestation": "none"
}
```

### JSON 示例:注册返回(前端 POST 给 RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwi...",
    "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YV...",
    "transports": ["internal", "hybrid"]
  }
}
```

::: tip
`excludeCredentials` 列出该用户已注册的凭证,防止在同一认证器上**重复注册**。认证器发现已存在匹配凭证时会拒绝并报 `InvalidStateError`。
:::

## 二、认证 ceremony

### 分步流程

1. **RP 生成 `PublicKeyCredentialRequestOptions`**:含新的一次性 `challenge`、`rpId`、可选 `allowCredentials`(该用户已注册的 Credential ID 列表)、`userVerification`。若做免用户名的 Passkey 登录,`allowCredentials` 可留空。
2. **前端调用 `navigator.credentials.get()`**:浏览器再次校验 origin,提示用户选择/验证认证器。
3. **认证器**:定位私钥(靠 `allowCredentials` 或可发现凭证),验证 UP/UV,用私钥对 `authenticatorData ‖ SHA-256(clientDataJSON)` 签名。
4. **返回 `PublicKeyCredential`**:`response` 为 `AuthenticatorAssertionResponse`,含 `authenticatorData`、`clientDataJSON`、`signature`,以及可发现凭证场景下的 `userHandle`。
5. **前端 POST 给 RP**。
6. **RP 验证**:按 Credential ID(或 `userHandle`)取出存储的公钥,校验 challenge/origin/type/flags/counter,用公钥验签,通过则登录成功并更新 `signCount`。

### 前端示例:发起认证

```js
const options = await fetch('/webauthn/login/options', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'alice@example.com' }), // 免用户名登录时可省略
}).then(r => r.json());

options.challenge = b64urlToBuf(options.challenge);
if (options.allowCredentials) {
  options.allowCredentials = options.allowCredentials.map(c => ({ ...c, id: b64urlToBuf(c.id) }));
}

const assertion = await navigator.credentials.get({ publicKey: options });

await fetch('/webauthn/login/verify', {
  method: 'POST', credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: assertion.id,
    rawId: bufToB64url(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufToB64url(assertion.response.clientDataJSON),
      authenticatorData: bufToB64url(assertion.response.authenticatorData),
      signature: bufToB64url(assertion.response.signature),
      userHandle: assertion.response.userHandle
        ? bufToB64url(assertion.response.userHandle) : null,
    },
  }),
});
```

### JSON 示例:`PublicKeyCredentialRequestOptions`(RP 下发)

```json
{
  "challenge": "YXV0aC1jaGFsbGVuZ2UtcmFuZG9t",
  "timeout": 60000,
  "rpId": "example.com",
  "allowCredentials": [
    { "type": "public-key", "id": "AbCd...credentialId-base64url", "transports": ["internal"] }
  ],
  "userVerification": "preferred"
}
```

### JSON 示例:认证返回(前端 POST 给 RP)

```json
{
  "id": "AbCd...credentialId-base64url",
  "rawId": "AbCd...credentialId-base64url",
  "type": "public-key",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoi...",
    "authenticatorData": "SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MdAAAAAA",
    "signature": "MEUCIQD...der-encoded-ecdsa-signature",
    "userHandle": "S3v9Y2k...Base64URL"
  }
}
```

## 三、RP 服务端验证清单

无论注册还是认证,服务端**必须**逐项校验(切勿信任前端):

1. **解析 `clientDataJSON`** 为 JSON。
2. **`type` 正确**:注册须为 `"webauthn.create"`,认证须为 `"webauthn.get"`。
3. **challenge 匹配**:`clientDataJSON.challenge`(Base64URL)解码后与本会话下发的 challenge **逐字节相等**,且该 challenge 未被用过。
4. **origin 匹配**:`clientDataJSON.origin` 属于 RP 允许的合法 origin 集合(精确字符串,含协议与端口)。
5. **(可选)`crossOrigin`** 若为 `true` 需符合业务预期,通常应为 `false`。
6. **`rpIdHash` 校验**:`authenticatorData` 前 32 字节等于 `SHA-256(rpId)`。
7. **flags 校验**:`UP` 位必须为 1;若业务要求多因素,`UV` 位必须为 1。
8. **签名计数器**:比较 `signCount` 与存储值,新值应更大(计数器恒为 0 的认证器例外)。
9. **签名验证(仅认证 ceremony)**:用存储的公钥,对 `authenticatorData ‖ SHA-256(clientDataJSON)` 验证 `signature`。
10. **算法一致**:验签算法与注册时记录的 `alg` 一致。

::: tip
强烈建议使用成熟库(如服务端 `@simplewebauthn/server`、前端 `@simplewebauthn/browser`,或 Go 的 `go-webauthn`、Java 的 `webauthn4j`)处理 CBOR 解析、COSE 公钥转换与签名验证,而不要手写这些密码学细节。
:::

## 四、常见坑

::: warning
- **challenge 不是一次性**:未在验证后作废,导致可重放。必须服务端存储、绑定会话、用后即删。
- **origin 未精确匹配**:用 `endsWith` 或忽略端口/协议做匹配,会被绕过。必须整串精确比对。
- **counter 处理不当**:对恒为 0 的同步型 Passkey 直接因"未增长"而拒绝登录;或漏掉真正的回退检测。
- **rpId 与 origin 不匹配**:`rp.id` 不是当前域的可注册域或其父域,`create()`/`get()` 直接抛 `SecurityError`。
- **Base64 与 Base64URL 混用**:WebAuthn 使用 **Base64URL 无填充**;误用标准 Base64 会导致解码错乱。
- **忘记 `excludeCredentials`**:同一认证器被重复注册,产生冗余凭证。
- **只信任请求参数里的 `userVerification`**:必须在服务端核对返回的 `UV` flag,而非假设认证器遵守了请求。
- **未做用户在场超时/重试处理**:`create()`/`get()` 会因超时或用户取消抛 `NotAllowedError`,前端应友好处理。
:::

继续阅读:[参数与数据结构参考](./reference.md)。
