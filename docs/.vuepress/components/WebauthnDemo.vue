<template>
  <div class="authn-tool">
    <p v-if="!supported" class="authn-error">{{ t('notSupported') }}</p>
    <template v-else>
      <p>{{ t('introBefore') }}<strong>{{ t('currentOrigin') }}</strong>(<code>{{ rpId }}</code>){{ t('introMid') }} <a href="https://mock.authn.tech/webauthn/" target="_blank">{{ t('mockRpLinkText') }}</a>{{ t('introAfter') }}</p>
      <button class="authn-btn" @click="register">{{ t('registerBtn') }}</button>
      <button class="authn-btn secondary" :disabled="!created" @click="login">{{ t('loginBtn') }}</button>
      <p v-if="msg" :class="msgBad ? 'authn-error' : 'authn-note'">{{ msg }}</p>

      <template v-if="result">
        <h4>{{ result.title }}</h4>
        <label class="authn-label">{{ t('clientDataLabel') }}</label>
        <pre class="authn-pre">{{ result.clientData }}</pre>
        <label class="authn-label">authenticatorData</label>
        <pre class="authn-pre">{{ result.authData }}</pre>
        <template v-if="result.pubKey">
          <label class="authn-label">{{ t('pubKeyLabel') }}</label>
          <pre class="authn-pre">{{ result.pubKey }}</pre>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    notSupported: '当前浏览器不支持 WebAuthn(需 HTTPS 且有平台认证器/安全密钥)。',
    introBefore: '本演示在',
    currentOrigin: '当前页面域',
    introMid: '内真实调用浏览器 WebAuthn API,创建/使用一个 Passkey,并解析展示浏览器返回的数据结构。纯前端,不涉及服务端(完整的服务端验签见',
    mockRpLinkText: 'Mock WebAuthn RP',
    introAfter: ')。',
    registerBtn: '① 创建 Passkey（注册）',
    loginBtn: '② 使用 Passkey（认证）',
    clientDataLabel: 'clientDataJSON（解码)',
    pubKeyLabel: '凭证公钥(COSE 解析)',
    registerResultTitle: '注册结果(attestationObject 解析)',
    authResultTitle: '认证结果(assertion 解析)',
    registerSuccessMsg: '✔ Passkey 已创建,可点“使用 Passkey”演示认证。',
    registerFailPrefix: '创建失败:',
    authSuccessMsg: '✔ 认证完成。签名可由 RP 用注册时的公钥验证(见 Mock WebAuthn RP)。',
    authFailPrefix: '认证失败:',
  },
  en: {
    notSupported: 'This browser does not support WebAuthn (requires HTTPS and a platform authenticator/security key).',
    introBefore: 'This demo calls the browser WebAuthn API for real, within the',
    currentOrigin: 'current page origin',
    introMid: ', to create/use a Passkey, and decodes and displays the data structures returned by the browser. It is purely client-side and does not involve a server (for full server-side signature verification, see the',
    mockRpLinkText: 'Mock WebAuthn RP',
    introAfter: ').',
    registerBtn: '① Create Passkey (register)',
    loginBtn: '② Use Passkey (authenticate)',
    clientDataLabel: 'clientDataJSON (decoded)',
    pubKeyLabel: 'Credential public key (COSE decoded)',
    registerResultTitle: 'Registration result (attestationObject decoded)',
    authResultTitle: 'Authentication result (assertion decoded)',
    registerSuccessMsg: '✔ Passkey created — click "Use Passkey" to try authentication.',
    registerFailPrefix: 'Creation failed: ',
    authSuccessMsg: '✔ Authentication complete. The signature can be verified by the RP using the public key from registration (see Mock WebAuthn RP).',
    authFailPrefix: 'Authentication failed: ',
  },
  de: {
    notSupported: 'Dieser Browser unterstützt WebAuthn nicht (HTTPS und ein Plattform-Authenticator/Sicherheitsschlüssel sind erforderlich).',
    introBefore: 'Diese Demo ruft die Browser-WebAuthn-API innerhalb der',
    currentOrigin: 'aktuellen Seiten-Origin',
    introMid: 'real auf, um einen Passkey zu erstellen/zu verwenden, und dekodiert und zeigt die vom Browser zurückgegebenen Datenstrukturen an. Rein clientseitig, ohne Server (die vollständige serverseitige Signaturprüfung finden Sie im',
    mockRpLinkText: 'Mock WebAuthn RP',
    introAfter: ').',
    registerBtn: '① Passkey erstellen (Registrierung)',
    loginBtn: '② Passkey verwenden (Authentifizierung)',
    clientDataLabel: 'clientDataJSON (dekodiert)',
    pubKeyLabel: 'Öffentlicher Schlüssel der Credential (COSE dekodiert)',
    registerResultTitle: 'Registrierungsergebnis (attestationObject dekodiert)',
    authResultTitle: 'Authentifizierungsergebnis (assertion dekodiert)',
    registerSuccessMsg: '✔ Passkey erstellt — klicken Sie auf „Passkey verwenden“, um die Authentifizierung zu testen.',
    registerFailPrefix: 'Erstellung fehlgeschlagen: ',
    authSuccessMsg: '✔ Authentifizierung abgeschlossen. Die Signatur kann vom RP mit dem bei der Registrierung erzeugten öffentlichen Schlüssel verifiziert werden (siehe Mock WebAuthn RP).',
    authFailPrefix: 'Authentifizierung fehlgeschlagen: ',
  },
}
const t = useT(messages)

const supported = ref(true)
const rpId = ref('')
const created = ref(false)
const msg = ref('')
const msgBad = ref(false)
const result = ref(null)
let lastRawId = null

function b64u(buf) {
  const a = new Uint8Array(buf)
  let s = ''
  for (const b of a) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function decodeClientData(buf) {
  return JSON.stringify(JSON.parse(new TextDecoder().decode(buf)), null, 2)
}
// 最小 CBOR 解码(解析 attestationObject 与 COSE key)
function cbor(buf, pos = 0) {
  const first = buf[pos++], major = first >> 5, info = first & 0x1f
  let len = info
  if (info === 24) len = buf[pos++]
  else if (info === 25) { len = (buf[pos] << 8) | buf[pos + 1]; pos += 2 }
  else if (info === 26) { len = ((buf[pos] << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3]) >>> 0; pos += 4 }
  if (major === 0) return { v: len, pos }
  if (major === 1) return { v: -1 - len, pos }
  if (major === 2) return { v: buf.slice(pos, pos + len), pos: pos + len }
  if (major === 3) return { v: new TextDecoder().decode(buf.slice(pos, pos + len)), pos: pos + len }
  if (major === 4) { const a = []; for (let i = 0; i < len; i++) { const r = cbor(buf, pos); a.push(r.v); pos = r.pos } return { v: a, pos } }
  if (major === 5) { const m = new Map(); for (let i = 0; i < len; i++) { const k = cbor(buf, pos); pos = k.pos; const val = cbor(buf, pos); pos = val.pos; m.set(k.v, val.v) } return { v: m, pos } }
  return { v: null, pos }
}
function parseAuthData(ad) {
  const flags = ad[32]
  const info = {
    rpIdHash: b64u(ad.slice(0, 32)),
    flags: { UP: !!(flags & 1), UV: !!(flags & 4), AT: !!(flags & 0x40), ED: !!(flags & 0x80) },
    signCount: ((ad[33] << 24) | (ad[34] << 16) | (ad[35] << 8) | ad[36]) >>> 0,
  }
  let cose = null
  if (flags & 0x40) {
    let p = 37 + 16
    const l = (ad[p] << 8) | ad[p + 1]; p += 2
    info.credentialId = b64u(ad.slice(p, p + l)); p += l
    cose = cbor(ad, p).v
  }
  return { info, cose }
}
function coseToInfo(cose) {
  if (!cose) return null
  const kty = cose.get(1), alg = cose.get(3)
  const algName = { '-7': 'ES256', '-257': 'RS256', '-8': 'EdDSA' }[String(alg)] || alg
  if (kty === 2) return JSON.stringify({ kty: 'EC2', alg: algName, crv: cose.get(-1) === 1 ? 'P-256' : cose.get(-1), x: b64u(cose.get(-2)), y: b64u(cose.get(-3)) }, null, 2)
  if (kty === 3) return JSON.stringify({ kty: 'RSA', alg: algName, n: b64u(cose.get(-1)).slice(0, 40) + '…', e: b64u(cose.get(-2)) }, null, 2)
  return JSON.stringify({ kty, alg: algName }, null, 2)
}

async function register() {
  msg.value = ''; msgBad.value = false; result.value = null
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const userId = crypto.getRandomValues(new Uint8Array(16))
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { id: rpId.value, name: 'Authn.tech Demo' },
        user: { id: userId, name: 'demo@authn.tech', displayName: 'Demo User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
        timeout: 60000,
        attestation: 'none',
      },
    })
    lastRawId = cred.rawId
    created.value = true
    const att = cbor(new Uint8Array(cred.response.attestationObject)).v
    const { info, cose } = parseAuthData(att.get('authData'))
    result.value = {
      title: t('registerResultTitle'),
      clientData: decodeClientData(cred.response.clientDataJSON),
      authData: JSON.stringify({ fmt: att.get('fmt'), ...info }, null, 2),
      pubKey: coseToInfo(cose),
    }
    msg.value = t('registerSuccessMsg')
  } catch (e) {
    msgBad.value = true; msg.value = t('registerFailPrefix') + e.message
  }
}
async function login() {
  msg.value = ''; msgBad.value = false; result.value = null
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const asrt = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: rpId.value,
        allowCredentials: lastRawId ? [{ type: 'public-key', id: lastRawId }] : [],
        userVerification: 'preferred',
        timeout: 60000,
      },
    })
    const { info } = parseAuthData(new Uint8Array(asrt.response.authenticatorData))
    result.value = {
      title: t('authResultTitle'),
      clientData: decodeClientData(asrt.response.clientDataJSON),
      authData: JSON.stringify({ ...info, signature: b64u(asrt.response.signature).slice(0, 40) + '…' }, null, 2),
      pubKey: null,
    }
    msg.value = t('authSuccessMsg')
  } catch (e) {
    msgBad.value = true; msg.value = t('authFailPrefix') + e.message
  }
}

onMounted(() => {
  rpId.value = location.hostname
  supported.value = typeof window !== 'undefined' && !!window.PublicKeyCredential
})
</script>

<style scoped src="./tool-style.css"></style>
