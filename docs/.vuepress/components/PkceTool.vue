<template>
  <div class="authn-tool">
    <button class="authn-btn" @click="gen">{{ t('genButton') }}</button>

    <label class="authn-label">{{ t('verifierLabel') }}</label>
    <pre class="authn-pre">{{ verifier }}</pre>

    <label class="authn-label">{{ t('challengeS256Label') }}</label>
    <pre class="authn-pre">{{ challengeS256 }}</pre>

    <label class="authn-label">{{ t('challengePlainLabel') }}</label>
    <pre class="authn-pre">{{ verifier }}</pre>

    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">{{ t('stateLabel') }}</label>
        <pre class="authn-pre">{{ state }}</pre>
      </div>
      <div class="authn-field">
        <label class="authn-label">{{ t('nonceLabel') }}</label>
        <pre class="authn-pre">{{ nonce }}</pre>
      </div>
    </div>
    <p class="authn-note">{{ t('noteBefore') }} <code>code_challenge</code> + <code>code_challenge_method=S256</code>{{ t('noteMid') }} <code>code_verifier</code>{{ t('noteAfter') }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    genButton: '生成一组新值',
    verifierLabel: 'code_verifier（43–128 字符,base64url）',
    challengeS256Label: 'code_challenge（S256 = base64url(SHA-256(verifier)))',
    challengePlainLabel: 'code_challenge（plain = verifier,不推荐)',
    stateLabel: 'state（防 CSRF）',
    nonceLabel: 'nonce（防 ID Token 重放）',
    noteBefore: '用于 OAuth2 / OIDC 授权请求。授权端点带',
    noteMid: ',token 端点带',
    noteAfter: '。全部在浏览器本地生成。',
  },
  en: {
    genButton: 'Generate a new set of values',
    verifierLabel: 'code_verifier (43–128 chars, base64url)',
    challengeS256Label: 'code_challenge (S256 = base64url(SHA-256(verifier)))',
    challengePlainLabel: 'code_challenge (plain = verifier, not recommended)',
    stateLabel: 'state (CSRF protection)',
    nonceLabel: 'nonce (ID Token replay protection)',
    noteBefore: 'Used for OAuth2 / OIDC authorization requests. The authorization endpoint carries',
    noteMid: ', the token endpoint carries',
    noteAfter: '. Everything is generated locally in the browser.',
  },
  de: {
    genButton: 'Neuen Wertesatz erzeugen',
    verifierLabel: 'code_verifier (43–128 Zeichen, base64url)',
    challengeS256Label: 'code_challenge (S256 = base64url(SHA-256(verifier)))',
    challengePlainLabel: 'code_challenge (plain = verifier, nicht empfohlen)',
    stateLabel: 'state (CSRF-Schutz)',
    nonceLabel: 'nonce (Schutz vor ID-Token-Replay)',
    noteBefore: 'Wird für OAuth2-/OIDC-Autorisierungsanfragen verwendet. Der Autorisierungs-Endpunkt enthält',
    noteMid: ', der Token-Endpunkt enthält',
    noteAfter: '. Alles wird lokal im Browser erzeugt.',
  },
}
const t = useT(messages)

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
