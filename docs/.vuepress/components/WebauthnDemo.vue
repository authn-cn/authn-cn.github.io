<template>
  <div class="authn-tool">
    <p v-if="!supported" class="authn-error">当前浏览器不支持 WebAuthn(需 HTTPS 且有平台认证器/安全密钥)。</p>
    <template v-else>
      <p>本演示在<strong>当前页面域</strong>(<code>{{ rpId }}</code>)内真实调用浏览器 WebAuthn API,创建/使用一个 Passkey,并解析展示浏览器返回的数据结构。纯前端,不涉及服务端(完整的服务端验签见 <a href="https://mock.authn.tech/webauthn/" target="_blank">Mock WebAuthn RP</a>)。</p>
      <button class="authn-btn" @click="register">① 创建 Passkey（注册）</button>
      <button class="authn-btn secondary" :disabled="!created" @click="login">② 使用 Passkey（认证）</button>
      <p v-if="msg" :class="msgBad ? 'authn-error' : 'authn-note'">{{ msg }}</p>

      <template v-if="result">
        <h4>{{ result.title }}</h4>
        <label class="authn-label">clientDataJSON（解码)</label>
        <pre class="authn-pre">{{ result.clientData }}</pre>
        <label class="authn-label">authenticatorData</label>
        <pre class="authn-pre">{{ result.authData }}</pre>
        <template v-if="result.pubKey">
          <label class="authn-label">凭证公钥(COSE 解析)</label>
          <pre class="authn-pre">{{ result.pubKey }}</pre>
        </template>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

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
      title: '注册结果(attestationObject 解析)',
      clientData: decodeClientData(cred.response.clientDataJSON),
      authData: JSON.stringify({ fmt: att.get('fmt'), ...info }, null, 2),
      pubKey: coseToInfo(cose),
    }
    msg.value = '✔ Passkey 已创建,可点“使用 Passkey”演示认证。'
  } catch (e) {
    msgBad.value = true; msg.value = '创建失败:' + e.message
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
      title: '认证结果(assertion 解析)',
      clientData: decodeClientData(asrt.response.clientDataJSON),
      authData: JSON.stringify({ ...info, signature: b64u(asrt.response.signature).slice(0, 40) + '…' }, null, 2),
      pubKey: null,
    }
    msg.value = '✔ 认证完成。签名可由 RP 用注册时的公钥验证(见 Mock WebAuthn RP)。'
  } catch (e) {
    msgBad.value = true; msg.value = '认证失败:' + e.message
  }
}

onMounted(() => {
  rpId.value = location.hostname
  supported.value = typeof window !== 'undefined' && !!window.PublicKeyCredential
})
</script>

<style scoped src="./tool-style.css"></style>
