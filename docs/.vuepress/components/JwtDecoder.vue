<template>
  <div class="jwtio">
    <!-- ============ 左栏:Encoded ============ -->
    <section class="jwtio-col">
      <h3 class="jwtio-h">编码 Encoded</h3>
      <textarea
        v-model="token"
        class="jwtio-input"
        spellcheck="false"
        rows="8"
        placeholder="粘贴 JWT（支持 Bearer 前缀）"
        @input="onTokenInput"
      ></textarea>
      <div v-if="parts" class="jwtio-colored" aria-hidden="true">
        <span class="c-h">{{ parts[0] }}</span><span class="c-dot">.</span><span class="c-p">{{ parts[1] }}</span><span v-if="parts.length > 2"><span class="c-dot">.</span><span class="c-s">{{ parts[2] }}</span></span>
      </div>
      <div class="jwtio-legend">
        <span><i class="dot c-h-bg"></i>Header</span>
        <span><i class="dot c-p-bg"></i>Payload</span>
        <span><i class="dot c-s-bg"></i>Signature</span>
      </div>
      <p v-if="error" class="jwtio-err">{{ error }}</p>
    </section>

    <!-- ============ 右栏:Decoded ============ -->
    <section class="jwtio-col">
      <h3 class="jwtio-h">解码 Decoded</h3>

      <div class="jwtio-block b-h">
        <div class="jwtio-block-title">HEADER：算法与类型</div>
        <pre class="jwtio-pre">{{ header || '—' }}</pre>
        <table v-if="headerRows.length" class="jwtio-claims">
          <tbody>
            <tr v-for="r in headerRows" :key="r.key">
              <td><code>{{ r.key }}</code></td>
              <td>{{ r.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="jwtio-block b-p">
        <div class="jwtio-block-title">PAYLOAD：数据</div>
        <pre class="jwtio-pre">{{ payload || '—' }}</pre>
        <table v-if="timeClaims.length" class="jwtio-times">
          <tbody>
            <tr v-for="c in timeClaims" :key="c.name">
              <td><code>{{ c.name }}</code></td>
              <td>{{ c.local }}</td>
              <td :class="c.bad ? 'bad' : 'ok'">{{ c.status }}</td>
            </tr>
          </tbody>
        </table>
        <template v-if="claimRows.length">
          <div class="jwtio-claims-cap">常见声明含义</div>
          <table class="jwtio-claims">
            <tbody>
              <tr v-for="r in claimRows" :key="r.key">
                <td><code>{{ r.key }}</code></td>
                <td>{{ r.desc }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="hasCustom" class="jwtio-note" style="margin-top:.4rem">其余字段为自定义 / 厂商声明,不在标准之列。</p>
        </template>
      </div>

      <div class="jwtio-block b-s">
        <div class="jwtio-block-title">
          VERIFY SIGNATURE
          <span v-if="verdict === 'valid'" class="badge ok">✔ 签名有效</span>
          <span v-else-if="verdict === 'invalid'" class="badge bad">✗ 签名无效</span>
          <span v-else-if="verdict.startsWith('error')" class="badge warn">{{ verdict.slice(6) }}</span>
        </div>

        <p class="jwtio-alg">算法：<code>{{ alg || '—' }}</code></p>

        <template v-if="isHmac">
          <label class="jwtio-lbl">Secret（HMAC 共享密钥）</label>
          <input v-model="secret" class="jwtio-key" spellcheck="false" placeholder="your-256-bit-secret" @input="verify" />
          <label class="jwtio-check">
            <input type="checkbox" v-model="secretB64" @change="verify" /> secret 是 base64url 编码
          </label>
        </template>

        <template v-else-if="isAsym">
          <label class="jwtio-lbl">Public Key（PEM / SPKI 格式）</label>
          <textarea
            v-model="pubkey"
            class="jwtio-key"
            spellcheck="false"
            rows="5"
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            @input="verify"
          ></textarea>
        </template>

        <p v-else-if="alg === 'none'" class="jwtio-note">该 token 声明 <code>alg: none</code>,没有签名可验证——这种 token 绝不可被信任。</p>
        <p v-else-if="alg" class="jwtio-note">暂不支持在浏览器验证 <code>{{ alg }}</code>。</p>
      </div>

      <p class="jwtio-note">
        解码 ≠ 验证:JWT 前两段只是 base64 编码,任何人都能读。只有在上方填入正确的密钥/公钥并显示
        <strong>✔ 签名有效</strong> 后,其中的 claims 才可信。所有运算都在你的浏览器本地完成,token 与密钥不会上传。
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

// 预填 jwt.io 经典 HS256 示例(secret = your-256-bit-secret 可验证通过)
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const token = ref(SAMPLE)
const header = ref('')
const payload = ref('')
const headerObj = ref(null)
const payloadObj = ref(null)
const alg = ref('')
const parts = ref(null)
const error = ref('')
const timeClaims = ref([])

// 常见 header 参数(JWS/JWT)
const HEADER_CLAIMS = {
  alg: '签名算法(Algorithm)',
  typ: '类型,通常为 JWT',
  cty: '内容类型(Content Type),嵌套 JWT 时用',
  kid: '密钥 ID(Key ID),指明用哪个密钥验签',
  jku: '公钥集(JWKS)的 URL',
  jwk: '内嵌的验签公钥(JWK)',
  x5u: 'X.509 证书链的 URL',
  x5c: '内嵌的 X.509 证书链(base64 DER)',
  x5t: 'X.509 证书的 SHA-1 指纹',
  'x5t#S256': 'X.509 证书的 SHA-256 指纹',
  crit: '必须被理解的扩展参数列表(Critical)',
  enc: '内容加密算法(JWE)',
}

// 常见 payload 声明:RFC 7519 注册声明 + OIDC + OAuth + 常见厂商
const PAYLOAD_CLAIMS = {
  // RFC 7519 注册声明
  iss: '签发者(Issuer),谁签发了此 token',
  sub: '主题(Subject),用户/主体的唯一标识',
  aud: '受众(Audience),token 的目标接收方',
  exp: '过期时间(Expiration),此刻之后失效',
  nbf: '生效时间(Not Before),此刻之前不可用',
  iat: '签发时间(Issued At)',
  jti: 'JWT 唯一 ID(JWT ID),可用于防重放',
  // OIDC ID Token
  nonce: '关联授权请求的随机值,防重放',
  auth_time: '用户完成认证的时间',
  acr: '认证上下文类别(Authentication Context Class Reference)',
  amr: '认证方法(Authentication Methods),如 pwd/otp/mfa',
  azp: '被授权方(Authorized Party),目标 client_id',
  at_hash: 'access_token 的哈希,绑定 ID Token 与访问令牌',
  c_hash: '授权码 code 的哈希',
  s_hash: 'state 的哈希',
  sid: '会话 ID(Session ID),用于单点登出',
  // OIDC 标准用户资料声明
  name: '全名',
  given_name: '名',
  family_name: '姓',
  middle_name: '中间名',
  nickname: '昵称',
  preferred_username: '首选用户名',
  profile: '个人资料页 URL',
  picture: '头像 URL',
  website: '个人网站',
  email: '邮箱地址',
  email_verified: '邮箱是否已验证',
  gender: '性别',
  birthdate: '生日',
  zoneinfo: '时区',
  locale: '语言/区域',
  phone_number: '电话号码',
  phone_number_verified: '电话是否已验证',
  address: '地址',
  updated_at: '资料最后更新时间',
  // OAuth2 访问令牌(RFC 9068)与常见厂商
  scope: '授权范围(Scopes),空格分隔',
  scp: '授权范围(Scopes,数组形式,Azure AD)',
  client_id: '客户端 ID',
  roles: '角色列表',
  groups: '用户组列表',
  token_use: 'token 用途(如 access / id,AWS Cognito)',
  cid: '客户端 ID(Okta)',
  uid: '用户 ID(Okta)',
  ver: 'token 版本',
  tid: '租户 ID(Azure AD)',
  oid: '对象 ID(Azure AD 用户)',
  upn: '用户主体名(User Principal Name,Azure AD)',
  appid: '应用 ID(Azure AD)',
}

const secret = ref('')
const secretB64 = ref(false)
const pubkey = ref('')
const verdict = ref('') // '' | 'valid' | 'invalid' | 'error:<msg>'

const isHmac = computed(() => /^HS(256|384|512)$/.test(alg.value))
const isAsym = computed(() => /^(RS|PS|ES)(256|384|512)$/.test(alg.value))

const headerRows = computed(() => rowsFor(headerObj.value, HEADER_CLAIMS))
const claimRows = computed(() => rowsFor(payloadObj.value, PAYLOAD_CLAIMS))
const hasCustom = computed(() =>
  payloadObj.value != null &&
  Object.keys(payloadObj.value).some((k) => !(k in PAYLOAD_CLAIMS)))

function rowsFor(obj, dict) {
  if (!obj || typeof obj !== 'object') return []
  return Object.keys(obj).filter((k) => k in dict).map((k) => ({ key: k, desc: dict[k] }))
}

const ALGS = {
  HS256: { kind: 'hmac', hash: 'SHA-256' },
  HS384: { kind: 'hmac', hash: 'SHA-384' },
  HS512: { kind: 'hmac', hash: 'SHA-512' },
  RS256: { kind: 'rsa', hash: 'SHA-256' },
  RS384: { kind: 'rsa', hash: 'SHA-384' },
  RS512: { kind: 'rsa', hash: 'SHA-512' },
  PS256: { kind: 'pss', hash: 'SHA-256', saltLength: 32 },
  PS384: { kind: 'pss', hash: 'SHA-384', saltLength: 48 },
  PS512: { kind: 'pss', hash: 'SHA-512', saltLength: 64 },
  ES256: { kind: 'ecdsa', hash: 'SHA-256', namedCurve: 'P-256' },
  ES384: { kind: 'ecdsa', hash: 'SHA-384', namedCurve: 'P-384' },
  ES512: { kind: 'ecdsa', hash: 'SHA-512', namedCurve: 'P-521' },
}

function b64urlToBytes(seg) {
  let s = seg.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function b64urlToText(seg) {
  return new TextDecoder('utf-8').decode(b64urlToBytes(seg))
}
function pemToBytes(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function onTokenInput() {
  decode()
  verify()
}

function decode() {
  error.value = ''
  header.value = ''
  payload.value = ''
  headerObj.value = null
  payloadObj.value = null
  alg.value = ''
  parts.value = null
  timeClaims.value = []

  const raw = token.value.trim().replace(/^Bearer\s+/i, '')
  if (!raw) return
  const segs = raw.split('.')
  parts.value = segs
  if (segs.length < 2 || segs.length > 3) {
    error.value = `无效的 JWT：应由 2~3 段组成,实际为 ${segs.length} 段。`
    return
  }
  try {
    const h = JSON.parse(b64urlToText(segs[0]))
    const p = JSON.parse(b64urlToText(segs[1]))
    headerObj.value = h
    payloadObj.value = p
    header.value = JSON.stringify(h, null, 2)
    payload.value = JSON.stringify(p, null, 2)
    alg.value = typeof h.alg === 'string' ? h.alg : ''

    const now = Math.floor(Date.now() / 1000)
    const items = []
    for (const name of ['exp', 'nbf', 'iat', 'auth_time']) {
      if (typeof p[name] === 'number') {
        const local = new Date(p[name] * 1000).toLocaleString()
        let status = '—'
        let bad = false
        if (name === 'exp') {
          bad = p[name] < now
          status = bad ? '已过期' : `有效（剩余 ${fmtDur(p[name] - now)}）`
        } else if (name === 'nbf') {
          bad = p[name] > now
          status = bad ? '尚未生效' : '已生效'
        } else {
          status = `${fmtDur(now - p[name])}前`
        }
        items.push({ name, local, status, bad })
      }
    }
    timeClaims.value = items
  } catch {
    error.value = '解码失败：某一段不是合法的 Base64URL 编码 JSON。'
  }
}

async function verify() {
  verdict.value = ''
  const segs = parts.value
  if (!segs || segs.length !== 3 || !segs[2]) return
  const cfg = ALGS[alg.value]
  if (!cfg) return
  const hasInput = cfg.kind === 'hmac' ? secret.value.length > 0 : pubkey.value.trim().length > 0
  if (!hasInput) return

  const data = new TextEncoder().encode(segs[0] + '.' + segs[1])
  let sig = b64urlToBytes(segs[2])

  try {
    let key
    let ok
    if (cfg.kind === 'hmac') {
      const secretBytes = secretB64.value ? b64urlToBytes(secret.value) : new TextEncoder().encode(secret.value)
      key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: cfg.hash }, false, ['verify'])
      ok = await crypto.subtle.verify('HMAC', key, sig, data)
    } else {
      const spki = pemToBytes(pubkey.value)
      if (cfg.kind === 'rsa') {
        key = await crypto.subtle.importKey('spki', spki, { name: 'RSASSA-PKCS1-v1_5', hash: cfg.hash }, false, ['verify'])
        ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, data)
      } else if (cfg.kind === 'pss') {
        key = await crypto.subtle.importKey('spki', spki, { name: 'RSA-PSS', hash: cfg.hash }, false, ['verify'])
        ok = await crypto.subtle.verify({ name: 'RSA-PSS', saltLength: cfg.saltLength }, key, sig, data)
      } else {
        key = await crypto.subtle.importKey('spki', spki, { name: 'ECDSA', namedCurve: cfg.namedCurve }, false, ['verify'])
        ok = await crypto.subtle.verify({ name: 'ECDSA', hash: cfg.hash }, key, sig, data)
      }
    }
    verdict.value = ok ? 'valid' : 'invalid'
  } catch (e) {
    verdict.value = 'error:' + (cfg.kind === 'hmac' ? '密钥无效' : '公钥解析失败（需 PEM/SPKI）')
  }
}

function fmtDur(sec) {
  sec = Math.abs(sec)
  if (sec < 60) return `${sec} 秒`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时`
  return `${Math.floor(sec / 86400)} 天`
}

decode()
</script>

<style scoped>
.jwtio {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem;
  margin: 1rem 0;
}
@media (max-width: 720px) {
  .jwtio { grid-template-columns: 1fr; }
}
.jwtio-h {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.7;
}
.jwtio-input,
.jwtio-key {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-family-code, ui-monospace, monospace);
  font-size: 0.82rem;
  padding: 0.6rem;
  border: 1px solid var(--vp-c-border, #dcdfe6);
  border-radius: 6px;
  background: var(--vp-c-bg, #fff);
  color: inherit;
  resize: vertical;
}
.jwtio-input:focus,
.jwtio-key:focus { outline: none; border-color: #00b9f1; }
.jwtio-colored {
  margin-top: 0.6rem;
  padding: 0.6rem;
  border-radius: 6px;
  background: var(--vp-c-bg-alt, #f6f8fa);
  font-family: var(--font-family-code, ui-monospace, monospace);
  font-size: 0.82rem;
  word-break: break-all;
  line-height: 1.6;
}
.c-h { color: #fb015b; }
.c-p { color: #d63aff; }
.c-s { color: #00b9f1; }
.c-dot { opacity: 0.5; }
.jwtio-legend {
  display: flex;
  gap: 1.2rem;
  margin-top: 0.6rem;
  font-size: 0.8rem;
  opacity: 0.85;
}
.jwtio-legend .dot {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  margin-right: 0.35rem;
  vertical-align: middle;
}
.c-h-bg { background: #fb015b; }
.c-p-bg { background: #d63aff; }
.c-s-bg { background: #00b9f1; }
.jwtio-block {
  border: 1px solid var(--vp-c-border, #dcdfe6);
  border-left-width: 4px;
  border-radius: 6px;
  padding: 0.7rem 0.8rem;
  margin-bottom: 0.9rem;
}
.b-h { border-left-color: #fb015b; }
.b-p { border-left-color: #d63aff; }
.b-s { border-left-color: #00b9f1; }
.jwtio-block-title {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin-bottom: 0.5rem;
}
.jwtio-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.82rem;
  font-family: var(--font-family-code, ui-monospace, monospace);
}
.jwtio-times {
  width: 100%;
  margin-top: 0.6rem;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.jwtio-times td { padding: 0.2rem 0.4rem; border-top: 1px solid var(--vp-c-border, #eee); }
.jwtio-claims-cap {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin: 0.8rem 0 0.3rem;
}
.jwtio-claims {
  width: 100%;
  margin-top: 0.5rem;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.jwtio-claims td {
  padding: 0.25rem 0.5rem;
  border-top: 1px solid var(--vp-c-border, #eee);
  vertical-align: top;
}
.jwtio-claims td:first-child { white-space: nowrap; width: 1%; }
.jwtio-alg { font-size: 0.85rem; margin: 0.2rem 0 0.6rem; }
.jwtio-lbl { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.3rem; }
.jwtio-check { display: block; font-size: 0.78rem; margin-top: 0.4rem; opacity: 0.85; }
.jwtio-note { font-size: 0.8rem; opacity: 0.8; margin-top: 0.5rem; }
.jwtio-err { color: #e53935; font-size: 0.85rem; margin-top: 0.5rem; }
.badge {
  float: right;
  font-size: 0.72rem;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}
.badge.ok { background: #e6f4ea; color: #2e7d32; }
.badge.bad { background: #fdecea; color: #e53935; }
.badge.warn { background: #fff3cd; color: #a67c00; }
.ok { color: #2e7d32; font-weight: 600; }
.bad { color: #e53935; font-weight: 600; }
</style>
