<template>
  <div class="jwtio">
    <!-- ============ 左栏:Encoded ============ -->
    <section class="jwtio-col">
      <h3 class="jwtio-h">{{ t('encodedTitle') }}</h3>
      <textarea
        v-model="token"
        class="jwtio-input"
        spellcheck="false"
        rows="8"
        :placeholder="t('tokenPlaceholder')"
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
      <h3 class="jwtio-h">{{ t('decodedTitle') }}</h3>

      <div class="jwtio-block b-h">
        <div class="jwtio-block-title">{{ t('headerBlockTitle') }}</div>
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
        <div class="jwtio-block-title">{{ t('payloadBlockTitle') }}</div>
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
          <div class="jwtio-claims-cap">{{ t('commonClaimsCaption') }}</div>
          <table class="jwtio-claims">
            <tbody>
              <tr v-for="r in claimRows" :key="r.key">
                <td><code>{{ r.key }}</code></td>
                <td>{{ r.desc }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="hasCustom" class="jwtio-note" style="margin-top:.4rem">{{ t('customClaimsNote') }}</p>
        </template>
      </div>

      <div class="jwtio-block b-s">
        <div class="jwtio-block-title">
          VERIFY SIGNATURE
          <span v-if="verdict === 'valid'" class="badge ok">✔ {{ t('sigValid') }}</span>
          <span v-else-if="verdict === 'invalid'" class="badge bad">✗ {{ t('sigInvalid') }}</span>
          <span v-else-if="verdict.startsWith('error')" class="badge warn">{{ verdict.slice(6) }}</span>
        </div>

        <p class="jwtio-alg">{{ t('algorithmLabel') }}<code>{{ alg || '—' }}</code></p>

        <template v-if="isHmac">
          <label class="jwtio-lbl">{{ t('secretLabel') }}</label>
          <input v-model="secret" class="jwtio-key" spellcheck="false" placeholder="your-256-bit-secret" @input="verify" />
          <label class="jwtio-check">
            <input type="checkbox" v-model="secretB64" @change="verify" /> {{ t('secretB64Label') }}
          </label>
        </template>

        <template v-else-if="isAsym">
          <label class="jwtio-lbl">{{ t('pubkeyLabel') }}</label>
          <textarea
            v-model="pubkey"
            class="jwtio-key"
            spellcheck="false"
            rows="5"
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            @input="verify"
          ></textarea>
        </template>

        <p v-else-if="alg === 'none'" class="jwtio-note">{{ t('algNoneNotePre') }} <code>alg: none</code>{{ t('algNoneNotePost') }}</p>
        <p v-else-if="alg" class="jwtio-note">{{ t('algUnsupportedPre') }} <code>{{ alg }}</code>{{ t('algUnsupportedPost') }}</p>
      </div>

      <p class="jwtio-note">
        {{ t('footerNotePre') }}
        <strong>{{ t('footerNoteStrong') }}</strong>{{ t('footerNotePost') }}
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useT, useLocaleKey } from './i18n.js'

const messages = {
  zh: {
    encodedTitle: '编码 Encoded',
    tokenPlaceholder: '粘贴 JWT（支持 Bearer 前缀）',
    decodedTitle: '解码 Decoded',
    headerBlockTitle: 'HEADER：算法与类型',
    payloadBlockTitle: 'PAYLOAD：数据',
    commonClaimsCaption: '常见声明含义',
    customClaimsNote: '其余字段为自定义 / 厂商声明,不在标准之列。',
    sigValid: '签名有效',
    sigInvalid: '签名无效',
    algorithmLabel: '算法：',
    secretLabel: 'Secret（HMAC 共享密钥）',
    secretB64Label: 'secret 是 base64url 编码',
    pubkeyLabel: 'Public Key（PEM / SPKI 格式）',
    algNoneNotePre: '该 token 声明',
    algNoneNotePost: ',没有签名可验证——这种 token 绝不可被信任。',
    algUnsupportedPre: '暂不支持在浏览器验证',
    algUnsupportedPost: '。',
    footerNotePre: '解码 ≠ 验证:JWT 前两段只是 base64 编码,任何人都能读。只有在上方填入正确的密钥/公钥并显示',
    footerNoteStrong: '✔ 签名有效',
    footerNotePost: ' 后,其中的 claims 才可信。所有运算都在你的浏览器本地完成,token 与密钥不会上传。',
    invalidJwt: (n) => `无效的 JWT：应由 2~3 段组成,实际为 ${n} 段。`,
    decodeFailed: '解码失败：某一段不是合法的 Base64URL 编码 JSON。',
    expired: '已过期',
    validRemaining: (d) => `有效（剩余 ${d}）`,
    notYetValid: '尚未生效',
    alreadyValid: '已生效',
    ago: (d) => `${d}前`,
    secretInvalid: '密钥无效',
    pubkeyParseFailed: '公钥解析失败（需 PEM/SPKI）',
    secondsUnit: (n) => `${n} 秒`,
    minutesUnit: (n) => `${n} 分钟`,
    hoursUnit: (n) => `${n} 小时`,
    daysUnit: (n) => `${n} 天`,
  },
  en: {
    encodedTitle: 'Encoded',
    tokenPlaceholder: 'Paste a JWT (Bearer prefix supported)',
    decodedTitle: 'Decoded',
    headerBlockTitle: 'HEADER: ALGORITHM & TOKEN TYPE',
    payloadBlockTitle: 'PAYLOAD: DATA',
    commonClaimsCaption: 'Common claim meanings',
    customClaimsNote: 'The remaining fields are custom / vendor-specific claims, not part of the standard.',
    sigValid: 'Signature Verified',
    sigInvalid: 'Invalid Signature',
    algorithmLabel: 'Algorithm: ',
    secretLabel: 'Secret (HMAC shared secret)',
    secretB64Label: 'secret is base64url encoded',
    pubkeyLabel: 'Public Key (PEM / SPKI format)',
    algNoneNotePre: 'This token declares',
    algNoneNotePost: ', so there is no signature to verify — such a token must never be trusted.',
    algUnsupportedPre: 'Browser verification is not yet supported for',
    algUnsupportedPost: '.',
    footerNotePre: 'Decoded ≠ verified: the first two segments of a JWT are just base64-encoded, and anyone can read them. The claims can only be trusted once you enter the correct secret/public key above and see',
    footerNoteStrong: '✔ Signature Verified',
    footerNotePost: ' — all computation happens locally in your browser; the token and key are never uploaded.',
    invalidJwt: (n) => `Invalid JWT: expected 2-3 segments, got ${n}.`,
    decodeFailed: 'Decoding failed: one of the segments is not valid Base64URL-encoded JSON.',
    expired: 'Expired',
    validRemaining: (d) => `Valid (expires in ${d})`,
    notYetValid: 'Not yet valid',
    alreadyValid: 'Already valid',
    ago: (d) => `${d} ago`,
    secretInvalid: 'Invalid secret',
    pubkeyParseFailed: 'Failed to parse public key (PEM/SPKI required)',
    secondsUnit: (n) => `${n}s`,
    minutesUnit: (n) => `${n}m`,
    hoursUnit: (n) => `${n}h`,
    daysUnit: (n) => `${n}d`,
  },
  de: {
    encodedTitle: 'Encoded',
    tokenPlaceholder: 'JWT einfügen (Bearer-Präfix wird unterstützt)',
    decodedTitle: 'Decoded',
    headerBlockTitle: 'HEADER: ALGORITHMUS & TOKEN-TYP',
    payloadBlockTitle: 'PAYLOAD: DATEN',
    commonClaimsCaption: 'Bedeutung gängiger Claims',
    customClaimsNote: 'Die übrigen Felder sind benutzerdefinierte / herstellerspezifische Claims und nicht Teil des Standards.',
    sigValid: 'Signatur gültig',
    sigInvalid: 'Signatur ungültig',
    algorithmLabel: 'Algorithmus: ',
    secretLabel: 'Secret (gemeinsamer HMAC-Schlüssel)',
    secretB64Label: 'Secret ist base64url-kodiert',
    pubkeyLabel: 'Public Key (PEM-/SPKI-Format)',
    algNoneNotePre: 'Dieses Token deklariert',
    algNoneNotePost: ', es gibt also keine Signatur zu prüfen — einem solchen Token darf niemals vertraut werden.',
    algUnsupportedPre: 'Die Verifizierung im Browser wird für',
    algUnsupportedPost: 'noch nicht unterstützt.',
    footerNotePre: 'Decodiert ≠ verifiziert: Die ersten beiden Segmente eines JWT sind nur base64-kodiert und können von jedem gelesen werden. Die Claims sind erst vertrauenswürdig, wenn oben der richtige Secret-/Public-Key eingetragen wurde und',
    footerNoteStrong: '✔ Signatur gültig',
    footerNotePost: ' angezeigt wird. Alle Berechnungen erfolgen lokal in deinem Browser; Token und Schlüssel werden nicht hochgeladen.',
    invalidJwt: (n) => `Ungültiges JWT: erwartet werden 2–3 Segmente, tatsächlich sind es ${n}.`,
    decodeFailed: 'Decodierung fehlgeschlagen: Eines der Segmente ist kein gültiges Base64URL-kodiertes JSON.',
    expired: 'Abgelaufen',
    validRemaining: (d) => `Gültig (noch ${d})`,
    notYetValid: 'Noch nicht gültig',
    alreadyValid: 'Bereits gültig',
    ago: (d) => `vor ${d}`,
    secretInvalid: 'Ungültiges Secret',
    pubkeyParseFailed: 'Public Key konnte nicht geparst werden (PEM/SPKI erforderlich)',
    secondsUnit: (n) => `${n} Sek.`,
    minutesUnit: (n) => `${n} Min.`,
    hoursUnit: (n) => `${n} Std.`,
    daysUnit: (n) => `${n} Tage`,
  },
}
const t = useT(messages)
const localeKey = useLocaleKey()

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
const HEADER_CLAIMS_I18N = {
  zh: {
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
  },
  en: {
    alg: 'Signature algorithm (Algorithm)',
    typ: 'Type, typically JWT',
    cty: 'Content Type, used for nested JWTs',
    kid: 'Key ID, identifies which key to use for signature verification',
    jku: 'URL of the JSON Web Key Set (JWKS)',
    jwk: 'Embedded public key (JWK) used for signature verification',
    x5u: 'URL of the X.509 certificate chain',
    x5c: 'Embedded X.509 certificate chain (base64 DER)',
    x5t: 'SHA-1 thumbprint of the X.509 certificate',
    'x5t#S256': 'SHA-256 thumbprint of the X.509 certificate',
    crit: 'List of extension parameters that must be understood (Critical)',
    enc: 'Content encryption algorithm (JWE)',
  },
  de: {
    alg: 'Signaturalgorithmus (Algorithm)',
    typ: 'Typ, in der Regel JWT',
    cty: 'Content Type, für verschachtelte JWTs',
    kid: 'Key ID, gibt an, welcher Schlüssel zur Signaturprüfung verwendet wird',
    jku: 'URL des JSON Web Key Set (JWKS)',
    jwk: 'Eingebetteter öffentlicher Schlüssel (JWK) zur Signaturprüfung',
    x5u: 'URL der X.509-Zertifikatskette',
    x5c: 'Eingebettete X.509-Zertifikatskette (base64 DER)',
    x5t: 'SHA-1-Fingerabdruck des X.509-Zertifikats',
    'x5t#S256': 'SHA-256-Fingerabdruck des X.509-Zertifikats',
    crit: 'Liste zwingend zu verstehender Erweiterungsparameter (Critical)',
    enc: 'Verschlüsselungsalgorithmus für den Inhalt (JWE)',
  },
}

// 常见 payload 声明:RFC 7519 注册声明 + OIDC + OAuth + 常见厂商
const PAYLOAD_CLAIMS_I18N = {
  zh: {
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
  },
  en: {
    // RFC 7519 registered claims
    iss: 'Issuer, who issued this token',
    sub: 'Subject, the unique identifier of the user/principal',
    aud: 'Audience, the intended recipient(s) of the token',
    exp: 'Expiration time, invalid after this moment',
    nbf: 'Not Before, invalid until this moment',
    iat: 'Issued At time',
    jti: 'JWT ID, unique identifier that can help prevent replay',
    // OIDC ID Token
    nonce: 'Random value tied to the authorization request, prevents replay',
    auth_time: 'Time the user completed authentication',
    acr: 'Authentication Context Class Reference',
    amr: 'Authentication Methods used, e.g. pwd/otp/mfa',
    azp: 'Authorized Party, the intended client_id',
    at_hash: 'Hash of the access_token, binds the ID Token to the access token',
    c_hash: 'Hash of the authorization code',
    s_hash: 'Hash of the state',
    sid: 'Session ID, used for single logout',
    // OIDC standard profile claims
    name: 'Full name',
    given_name: 'Given name',
    family_name: 'Family name',
    middle_name: 'Middle name',
    nickname: 'Nickname',
    preferred_username: 'Preferred username',
    profile: 'Profile page URL',
    picture: 'Profile picture URL',
    website: 'Personal website',
    email: 'Email address',
    email_verified: 'Whether the email has been verified',
    gender: 'Gender',
    birthdate: 'Birthdate',
    zoneinfo: 'Time zone',
    locale: 'Language/locale',
    phone_number: 'Phone number',
    phone_number_verified: 'Whether the phone number has been verified',
    address: 'Address',
    updated_at: 'Time the profile was last updated',
    // OAuth2 access tokens (RFC 9068) and common vendor claims
    scope: 'Authorization scopes, space-separated',
    scp: 'Authorization scopes (array form, Azure AD)',
    client_id: 'Client ID',
    roles: 'List of roles',
    groups: 'List of groups',
    token_use: 'Intended use of the token (e.g. access / id, AWS Cognito)',
    cid: 'Client ID (Okta)',
    uid: 'User ID (Okta)',
    ver: 'Token version',
    tid: 'Tenant ID (Azure AD)',
    oid: 'Object ID (Azure AD user)',
    upn: 'User Principal Name (Azure AD)',
    appid: 'Application ID (Azure AD)',
  },
  de: {
    // RFC 7519 registrierte Claims
    iss: 'Issuer, wer dieses Token ausgestellt hat',
    sub: 'Subject, eindeutige Kennung des Benutzers/Principals',
    aud: 'Audience, der/die vorgesehene(n) Empfänger des Tokens',
    exp: 'Expiration, ungültig nach diesem Zeitpunkt',
    nbf: 'Not Before, ungültig vor diesem Zeitpunkt',
    iat: 'Issued At, Ausstellungszeitpunkt',
    jti: 'JWT ID, eindeutige Kennung, hilft gegen Replay-Angriffe',
    // OIDC ID Token
    nonce: 'Zufallswert der Autorisierungsanfrage, verhindert Replay-Angriffe',
    auth_time: 'Zeitpunkt, zu dem sich der Benutzer authentifiziert hat',
    acr: 'Authentication Context Class Reference',
    amr: 'Verwendete Authentifizierungsmethoden (Authentication Methods), z. B. pwd/otp/mfa',
    azp: 'Authorized Party, die vorgesehene client_id',
    at_hash: 'Hash des access_token, verknüpft ID Token und Access Token',
    c_hash: 'Hash des Autorisierungscodes (code)',
    s_hash: 'Hash des state-Parameters',
    sid: 'Session ID, für Single Logout',
    // OIDC Standard-Profil-Claims
    name: 'Vollständiger Name',
    given_name: 'Vorname',
    family_name: 'Nachname',
    middle_name: 'Zweiter Vorname',
    nickname: 'Spitzname',
    preferred_username: 'Bevorzugter Benutzername',
    profile: 'URL der Profilseite',
    picture: 'URL des Profilbilds',
    website: 'Persönliche Website',
    email: 'E-Mail-Adresse',
    email_verified: 'Ob die E-Mail-Adresse verifiziert wurde',
    gender: 'Geschlecht',
    birthdate: 'Geburtsdatum',
    zoneinfo: 'Zeitzone',
    locale: 'Sprache/Region',
    phone_number: 'Telefonnummer',
    phone_number_verified: 'Ob die Telefonnummer verifiziert wurde',
    address: 'Adresse',
    updated_at: 'Zeitpunkt der letzten Profilaktualisierung',
    // OAuth2-Access-Token (RFC 9068) und gängige Hersteller-Claims
    scope: 'Berechtigungsbereiche (Scopes), durch Leerzeichen getrennt',
    scp: 'Berechtigungsbereiche (Scopes, Array-Form, Azure AD)',
    client_id: 'Client-ID',
    roles: 'Liste der Rollen',
    groups: 'Liste der Gruppen',
    token_use: 'Verwendungszweck des Tokens (z. B. access / id, AWS Cognito)',
    cid: 'Client-ID (Okta)',
    uid: 'Benutzer-ID (Okta)',
    ver: 'Token-Version',
    tid: 'Tenant-ID (Azure AD)',
    oid: 'Objekt-ID (Azure AD-Benutzer)',
    upn: 'User Principal Name (Azure AD)',
    appid: 'Anwendungs-ID (Azure AD)',
  },
}
const HEADER_CLAIMS = HEADER_CLAIMS_I18N.zh
const PAYLOAD_CLAIMS = PAYLOAD_CLAIMS_I18N.zh

const secret = ref('')
const secretB64 = ref(false)
const pubkey = ref('')
const verdict = ref('') // '' | 'valid' | 'invalid' | 'error:<msg>'

const isHmac = computed(() => /^HS(256|384|512)$/.test(alg.value))
const isAsym = computed(() => /^(RS|PS|ES)(256|384|512)$/.test(alg.value))

const activeHeaderClaims = computed(() => HEADER_CLAIMS_I18N[localeKey.value] || HEADER_CLAIMS_I18N.zh)
const activePayloadClaims = computed(() => PAYLOAD_CLAIMS_I18N[localeKey.value] || PAYLOAD_CLAIMS_I18N.zh)

const headerRows = computed(() => rowsFor(headerObj.value, activeHeaderClaims.value))
const claimRows = computed(() => rowsFor(payloadObj.value, activePayloadClaims.value))
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
    error.value = t('invalidJwt')(segs.length)
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
          status = bad ? t('expired') : t('validRemaining')(fmtDur(p[name] - now))
        } else if (name === 'nbf') {
          bad = p[name] > now
          status = bad ? t('notYetValid') : t('alreadyValid')
        } else {
          status = t('ago')(fmtDur(now - p[name]))
        }
        items.push({ name, local, status, bad })
      }
    }
    timeClaims.value = items
  } catch {
    error.value = t('decodeFailed')
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
    verdict.value = 'error:' + (cfg.kind === 'hmac' ? t('secretInvalid') : t('pubkeyParseFailed'))
  }
}

function fmtDur(sec) {
  sec = Math.abs(sec)
  if (sec < 60) return t('secondsUnit')(sec)
  if (sec < 3600) return t('minutesUnit')(Math.floor(sec / 60))
  if (sec < 86400) return t('hoursUnit')(Math.floor(sec / 3600))
  return t('daysUnit')(Math.floor(sec / 86400))
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
