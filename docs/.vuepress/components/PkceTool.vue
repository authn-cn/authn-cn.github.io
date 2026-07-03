<template>
  <div class="authn-tool">
    <button class="authn-btn" @click="gen">生成一组新值</button>

    <label class="authn-label">code_verifier（43–128 字符,base64url）</label>
    <pre class="authn-pre">{{ verifier }}</pre>

    <label class="authn-label">code_challenge（S256 = base64url(SHA-256(verifier)))</label>
    <pre class="authn-pre">{{ challengeS256 }}</pre>

    <label class="authn-label">code_challenge（plain = verifier,不推荐)</label>
    <pre class="authn-pre">{{ verifier }}</pre>

    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">state（防 CSRF）</label>
        <pre class="authn-pre">{{ state }}</pre>
      </div>
      <div class="authn-field">
        <label class="authn-label">nonce（防 ID Token 重放）</label>
        <pre class="authn-pre">{{ nonce }}</pre>
      </div>
    </div>
    <p class="authn-note">用于 OAuth2 / OIDC 授权请求。授权端点带 <code>code_challenge</code> + <code>code_challenge_method=S256</code>,token 端点带 <code>code_verifier</code>。全部在浏览器本地生成。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const verifier = ref('')
const challengeS256 = ref('')
const state = ref('')
const nonce = ref('')

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function rand(n) {
  return b64url(crypto.getRandomValues(new Uint8Array(n)))
}
async function s256(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return b64url(new Uint8Array(d))
}
async function gen() {
  verifier.value = rand(32)
  challengeS256.value = await s256(verifier.value)
  state.value = rand(16)
  nonce.value = rand(16)
}
gen()
</script>

<style scoped src="./tool-style.css"></style>
