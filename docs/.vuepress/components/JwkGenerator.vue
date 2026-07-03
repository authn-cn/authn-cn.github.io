<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">密钥类型 / 算法</label>
        <select v-model="alg" class="authn-select">
          <option value="RS256">RSA 2048（RS256 / RS384 / RS512 / PS*）</option>
          <option value="ES256">EC P-256（ES256）</option>
          <option value="ES384">EC P-384（ES384）</option>
        </select>
      </div>
      <div class="authn-field" style="display:flex;align-items:flex-end">
        <button class="authn-btn" :disabled="busy" @click="gen">{{ busy ? '生成中…' : '生成密钥对' }}</button>
      </div>
    </div>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="pubJwk">
      <label class="authn-label">kid（RFC 7638 JWK Thumbprint）</label>
      <pre class="authn-pre">{{ kid }}</pre>

      <label class="authn-label">公钥 JWK</label>
      <pre class="authn-pre">{{ pubJwk }}</pre>

      <label class="authn-label">JWKS（放到 jwks_uri 端点）</label>
      <pre class="authn-pre">{{ jwks }}</pre>

      <label class="authn-label">私钥 JWK</label>
      <pre class="authn-pre">{{ privJwk }}</pre>

      <label class="authn-label">公钥 PEM（SPKI）</label>
      <pre class="authn-pre">{{ pubPem }}</pre>

      <label class="authn-label">私钥 PEM（PKCS#8）</label>
      <pre class="authn-pre">{{ privPem }}</pre>

      <p class="authn-note">密钥在你的浏览器本地生成,<strong>不会上传</strong>。私钥请妥善保管,勿用于生产的同时公开。可配合 <a href="./jwt-sign.html">JWT 签名</a> 与 <a href="./jwt.html">JWT 验签</a> 使用。</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const alg = ref('RS256')
const busy = ref(false)
const error = ref('')
const kid = ref('')
const pubJwk = ref('')
const privJwk = ref('')
const jwks = ref('')
const pubPem = ref('')
const privPem = ref('')

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function pem(label, buf) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 = btoa(bin).replace(/(.{64})/g, '$1\n')
  return `-----BEGIN ${label}-----\n${b64}\n-----END ${label}-----`
}
async function thumbprint(jwk) {
  const members =
    jwk.kty === 'RSA'
      ? { e: jwk.e, kty: jwk.kty, n: jwk.n }
      : { crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }
  const json = JSON.stringify(members)
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json))
  return b64url(new Uint8Array(d))
}

async function gen() {
  error.value = ''
  busy.value = true
  try {
    let params, usages, signAlg
    if (alg.value === 'RS256') {
      params = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }
    } else {
      const curve = alg.value === 'ES256' ? 'P-256' : 'P-384'
      params = { name: 'ECDSA', namedCurve: curve }
    }
    const kp = await crypto.subtle.generateKey(params, true, ['sign', 'verify'])
    const pub = await crypto.subtle.exportKey('jwk', kp.publicKey)
    const priv = await crypto.subtle.exportKey('jwk', kp.privateKey)
    const kidVal = await thumbprint(pub)
    kid.value = kidVal

    const pubOut = { ...pub, alg: alg.value, use: 'sig', kid: kidVal }
    const privOut = { ...priv, alg: alg.value, use: 'sig', kid: kidVal }
    delete pubOut.key_ops
    delete pubOut.ext
    delete privOut.key_ops
    delete privOut.ext
    pubJwk.value = JSON.stringify(pubOut, null, 2)
    privJwk.value = JSON.stringify(privOut, null, 2)
    jwks.value = JSON.stringify({ keys: [pubOut] }, null, 2)

    pubPem.value = pem('PUBLIC KEY', await crypto.subtle.exportKey('spki', kp.publicKey))
    privPem.value = pem('PRIVATE KEY', await crypto.subtle.exportKey('pkcs8', kp.privateKey))
  } catch (e) {
    error.value = '生成失败：' + (e.message || String(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped src="./tool-style.css"></style>
