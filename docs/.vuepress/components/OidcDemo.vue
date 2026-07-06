<template>
  <div class="authn-tool">
    <div class="authn-row" style="align-items: flex-end">
      <div class="authn-field">
        <label class="authn-label">{{ t('issuerLabel') }}</label>
        <input v-model="issuer" class="authn-input" spellcheck="false" />
      </div>
      <div class="authn-field" style="max-width: 200px">
        <label class="authn-label">{{ t('scopeLabel') }}</label>
        <input v-model="scope" class="authn-input" spellcheck="false" />
      </div>
    </div>

    <p v-if="!result && !error && !busy">
      {{ t('introBefore') }}
      <strong>Authorization Code + PKCE</strong>{{ t('introMid') }}
      <code>code</code>{{ t('introAfter') }}
    </p>

    <button class="authn-btn" :disabled="busy" @click="startLogin">
      {{ busy ? t('processing') : t('loginBtn') }}
    </button>
    <button v-if="result || error" class="authn-btn secondary" @click="reset">{{ t('resetBtn') }}</button>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="result">
      <h4>{{ t('step1Title') }}</h4>
      <pre class="authn-pre">{{ result.code }}</pre>

      <h4>{{ t('step2Title') }}</h4>
      <pre class="authn-pre">{{ result.tokenRaw }}</pre>

      <h4>{{ t('step3Title') }}</h4>
      <p class="authn-note">Header</p>
      <pre class="authn-pre">{{ result.idHeader }}</pre>
      <p class="authn-note">{{ t('payloadNote') }}</p>
      <pre class="authn-pre">{{ result.idPayload }}</pre>
      <p class="authn-note authn-ok">
        {{ t('nonceCheckPrefix') }}{{ result.nonceOk ? t('nonceOk') : t('nonceMismatch') }}
        {{ t('audCheckPrefix') }}{{ result.audOk ? t('checkPass') : t('checkMismatch') }}
      </p>

      <h4>{{ t('step4Title') }}</h4>
      <pre class="authn-pre">{{ result.userinfo }}</pre>
    </template>

    <p class="authn-note">
      {{ t('footerBefore') }}
      <strong>{{ t('footerTestOnly') }}</strong>{{ t('footerAfter') }}
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    issuerLabel: 'OP Issuer',
    scopeLabel: 'Scope',
    introBefore: '点击下面的按钮,会真实地跳转到 Mock OP 完成一次',
    introMid: '登录,再带着授权码回跳到本页,本页自动用',
    introAfter: '换取令牌并展示解析结果。整个过程与真实 OIDC 登录完全一致。',
    processing: '处理中…',
    loginBtn: '用 Mock OP 登录',
    resetBtn: '重置',
    step1Title: '① 回跳收到的 code',
    step2Title: '② Token 端点响应',
    step3Title: '③ 解码后的 ID Token',
    payloadNote: 'Payload（RP 必须校验 iss / aud / exp / nonce）',
    nonceCheckPrefix: '✔ nonce 校验：',
    nonceOk: '通过（与发起时一致）',
    nonceMismatch: '⚠ 不匹配',
    audCheckPrefix: '✔ aud 校验：',
    checkPass: '通过',
    checkMismatch: '⚠ 不匹配',
    step4Title: '④ UserInfo 端点响应',
    footerBefore: '演示在你的浏览器本地完成令牌交换(Mock OP 已开启 CORS)。这是一个',
    footerTestOnly: '仅供测试',
    footerAfter: '的 Mock 服务,签名私钥公开,切勿用于生产。',
    startLoginFail: '发起登录失败：',
    authzFail: '授权失败：',
    noPkceData: '收到 code,但本地找不到 PKCE 校验数据(可能换了浏览器/清了会话)。请重新发起登录。',
    stateMismatch: 'state 不匹配,已中止(防 CSRF)。',
    tokenEndpointError: 'Token 端点返回错误：',
    tokenExchangeFail: '令牌交换失败：',
    truncatedSuffix: '…（已截断）',
  },
  en: {
    issuerLabel: 'OP Issuer',
    scopeLabel: 'Scope',
    introBefore: 'Click the button below to be redirected to the Mock OP and complete a real',
    introMid: 'login, then return to this page with an authorization code. This page automatically exchanges the',
    introAfter: 'for tokens and displays the decoded results. The whole flow matches a real OIDC login exactly.',
    processing: 'Processing…',
    loginBtn: 'Log in with Mock OP',
    resetBtn: 'Reset',
    step1Title: '① code received on redirect',
    step2Title: '② Token endpoint response',
    step3Title: '③ Decoded ID Token',
    payloadNote: 'Payload (the RP must validate iss / aud / exp / nonce)',
    nonceCheckPrefix: '✔ nonce check: ',
    nonceOk: 'passed (matches the one sent)',
    nonceMismatch: '⚠ mismatch',
    audCheckPrefix: '✔ aud check: ',
    checkPass: 'passed',
    checkMismatch: '⚠ mismatch',
    step4Title: '④ UserInfo endpoint response',
    footerBefore: 'The demo performs the token exchange locally in your browser (the Mock OP has CORS enabled). This is a',
    footerTestOnly: 'test-only',
    footerAfter: 'mock service with a public signing private key — never use it in production.',
    startLoginFail: 'Failed to start login: ',
    authzFail: 'Authorization failed: ',
    noPkceData: 'Received a code, but no local PKCE verification data was found (you may have switched browsers or cleared the session). Please start login again.',
    stateMismatch: 'state mismatch, aborted (CSRF protection).',
    tokenEndpointError: 'Token endpoint returned an error: ',
    tokenExchangeFail: 'Token exchange failed: ',
    truncatedSuffix: '… (truncated)',
  },
  de: {
    issuerLabel: 'OP Issuer',
    scopeLabel: 'Scope',
    introBefore: 'Klicken Sie auf die Schaltfläche unten, um zum Mock OP weitergeleitet zu werden und einen echten',
    introMid: 'Login abzuschließen. Anschließend kehren Sie mit einem Autorisierungscode zu dieser Seite zurück. Diese Seite tauscht den',
    introAfter: 'automatisch gegen Tokens ein und zeigt das entschlüsselte Ergebnis an. Der gesamte Ablauf entspricht exakt einem echten OIDC-Login.',
    processing: 'Wird verarbeitet…',
    loginBtn: 'Mit Mock OP anmelden',
    resetBtn: 'Zurücksetzen',
    step1Title: '① Beim Redirect empfangener code',
    step2Title: '② Antwort des Token-Endpunkts',
    step3Title: '③ Dekodiertes ID Token',
    payloadNote: 'Payload (der RP muss iss / aud / exp / nonce validieren)',
    nonceCheckPrefix: '✔ nonce-Prüfung: ',
    nonceOk: 'erfolgreich (stimmt mit dem gesendeten Wert überein)',
    nonceMismatch: '⚠ stimmt nicht überein',
    audCheckPrefix: '✔ aud-Prüfung: ',
    checkPass: 'erfolgreich',
    checkMismatch: '⚠ stimmt nicht überein',
    step4Title: '④ Antwort des UserInfo-Endpunkts',
    footerBefore: 'Die Demo führt den Token-Austausch lokal in Ihrem Browser durch (der Mock OP hat CORS aktiviert). Dies ist ein',
    footerTestOnly: 'reiner Test',
    footerAfter: 'Mock-Dienst mit öffentlich bekanntem privaten Signaturschlüssel — auf keinen Fall in Produktion verwenden.',
    startLoginFail: 'Login konnte nicht gestartet werden: ',
    authzFail: 'Autorisierung fehlgeschlagen: ',
    noPkceData: 'Ein code wurde empfangen, aber es wurden keine lokalen PKCE-Prüfdaten gefunden (möglicherweise wurde der Browser gewechselt oder die Sitzung gelöscht). Bitte starten Sie den Login erneut.',
    stateMismatch: 'state stimmt nicht überein, abgebrochen (CSRF-Schutz).',
    tokenEndpointError: 'Der Token-Endpunkt hat einen Fehler zurückgegeben: ',
    tokenExchangeFail: 'Token-Austausch fehlgeschlagen: ',
    truncatedSuffix: '… (gekürzt)',
  },
}
const t = useT(messages)

const issuer = ref('https://mock.authn.tech')
const scope = ref('openid profile email')
const busy = ref(false)
const error = ref('')
const result = ref(null)

const SS_KEY = 'authn_oidc_demo'

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function randStr(n = 32) {
  return b64url(crypto.getRandomValues(new Uint8Array(n)))
}
async function s256(v) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))
  return b64url(new Uint8Array(d))
}
function decodeJwt(seg) {
  let s = seg.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return JSON.parse(decodeURIComponent(escape(atob(s))))
}
function redirectUri() {
  return window.location.origin + window.location.pathname
}

async function startLogin() {
  error.value = ''
  busy.value = true
  try {
    const verifier = randStr(32)
    const state = randStr(16)
    const nonce = randStr(16)
    sessionStorage.setItem(
      SS_KEY,
      JSON.stringify({ verifier, state, nonce, issuer: issuer.value, scope: scope.value }),
    )
    const u = new URL(issuer.value.replace(/\/$/, '') + '/oidc/authorize')
    u.searchParams.set('client_id', 'authn-cn-docs-demo')
    u.searchParams.set('redirect_uri', redirectUri())
    u.searchParams.set('response_type', 'code')
    u.searchParams.set('scope', scope.value)
    u.searchParams.set('state', state)
    u.searchParams.set('nonce', nonce)
    u.searchParams.set('code_challenge', await s256(verifier))
    u.searchParams.set('code_challenge_method', 'S256')
    window.location.assign(u.toString())
  } catch (e) {
    busy.value = false
    error.value = t('startLoginFail') + (e.message || String(e))
  }
}

async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const err = params.get('error')
  const saved = sessionStorage.getItem(SS_KEY)
  if (!code && !err) return
  // 清掉地址栏里的 code/state,避免刷新重复处理
  window.history.replaceState({}, '', redirectUri())
  if (err) {
    error.value = `${t('authzFail')}${err} — ${params.get('error_description') || ''}`
    return
  }
  if (!saved) {
    error.value = t('noPkceData')
    return
  }
  sessionStorage.removeItem(SS_KEY)
  const { verifier, state, nonce, issuer: iss } = JSON.parse(saved)
  if (params.get('state') !== state) {
    error.value = t('stateMismatch')
    return
  }

  busy.value = true
  try {
    const tokenRes = await fetch(iss.replace(/\/$/, '') + '/oidc/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri(),
        client_id: 'authn-cn-docs-demo',
        code_verifier: verifier,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokenRes.ok) {
      error.value = `${t('tokenEndpointError')}${tokens.error} — ${tokens.error_description || ''}`
      return
    }
    const idHeader = decodeJwt(tokens.id_token.split('.')[0])
    const idPayload = decodeJwt(tokens.id_token.split('.')[1])

    const uiRes = await fetch(iss.replace(/\/$/, '') + '/oidc/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    })
    const userinfo = await uiRes.json()

    result.value = {
      code: code.slice(0, 48) + t('truncatedSuffix'),
      tokenRaw: JSON.stringify(
        { ...tokens, id_token: tokens.id_token.slice(0, 32) + '…', access_token: tokens.access_token.slice(0, 32) + '…' },
        null,
        2,
      ),
      idHeader: JSON.stringify(idHeader, null, 2),
      idPayload: JSON.stringify(idPayload, null, 2),
      userinfo: JSON.stringify(userinfo, null, 2),
      nonceOk: idPayload.nonce === nonce,
      audOk: idPayload.aud === 'authn-cn-docs-demo',
    }
  } catch (e) {
    error.value = t('tokenExchangeFail') + (e.message || String(e))
  } finally {
    busy.value = false
  }
}

if (typeof window !== 'undefined') handleCallback()

function reset() {
  result.value = null
  error.value = ''
  busy.value = false
}
</script>

<style scoped src="./tool-style.css"></style>
