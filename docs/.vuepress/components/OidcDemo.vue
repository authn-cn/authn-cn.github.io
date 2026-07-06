<template>
  <div class="authn-tool">
    <div class="authn-row" style="align-items: flex-end">
      <div class="authn-field">
        <label class="authn-label">OP Issuer</label>
        <input v-model="issuer" class="authn-input" spellcheck="false" />
      </div>
      <div class="authn-field" style="max-width: 200px">
        <label class="authn-label">Scope</label>
        <input v-model="scope" class="authn-input" spellcheck="false" />
      </div>
    </div>

    <p v-if="!result && !error && !busy">
      点击下面的按钮,会真实地跳转到 Mock OP 完成一次
      <strong>Authorization Code + PKCE</strong> 登录,再带着授权码回跳到本页,
      本页自动用 <code>code</code> 换取令牌并展示解析结果。整个过程与真实 OIDC 登录完全一致。
    </p>

    <button class="authn-btn" :disabled="busy" @click="startLogin">
      {{ busy ? '处理中…' : '用 Mock OP 登录' }}
    </button>
    <button v-if="result || error" class="authn-btn secondary" @click="reset">重置</button>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="result">
      <h4>① 回跳收到的 code</h4>
      <pre class="authn-pre">{{ result.code }}</pre>

      <h4>② Token 端点响应</h4>
      <pre class="authn-pre">{{ result.tokenRaw }}</pre>

      <h4>③ 解码后的 ID Token</h4>
      <p class="authn-note">Header</p>
      <pre class="authn-pre">{{ result.idHeader }}</pre>
      <p class="authn-note">Payload（RP 必须校验 iss / aud / exp / nonce）</p>
      <pre class="authn-pre">{{ result.idPayload }}</pre>
      <p class="authn-note authn-ok">
        ✔ nonce 校验：{{ result.nonceOk ? '通过（与发起时一致）' : '⚠ 不匹配' }}
        ✔ aud 校验：{{ result.audOk ? '通过' : '⚠ 不匹配' }}
      </p>

      <h4>④ UserInfo 端点响应</h4>
      <pre class="authn-pre">{{ result.userinfo }}</pre>
    </template>

    <p class="authn-note">
      演示在你的浏览器本地完成令牌交换(Mock OP 已开启 CORS)。这是一个
      <strong>仅供测试</strong>的 Mock 服务,签名私钥公开,切勿用于生产。
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

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
    error.value = '发起登录失败：' + (e.message || String(e))
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
    error.value = `授权失败：${err} — ${params.get('error_description') || ''}`
    return
  }
  if (!saved) {
    error.value = '收到 code,但本地找不到 PKCE 校验数据(可能换了浏览器/清了会话)。请重新发起登录。'
    return
  }
  sessionStorage.removeItem(SS_KEY)
  const { verifier, state, nonce, issuer: iss } = JSON.parse(saved)
  if (params.get('state') !== state) {
    error.value = 'state 不匹配,已中止(防 CSRF)。'
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
      error.value = `Token 端点返回错误：${tokens.error} — ${tokens.error_description || ''}`
      return
    }
    const idHeader = decodeJwt(tokens.id_token.split('.')[0])
    const idPayload = decodeJwt(tokens.id_token.split('.')[1])

    const uiRes = await fetch(iss.replace(/\/$/, '') + '/oidc/userinfo', {
      headers: { Authorization: 'Bearer ' + tokens.access_token },
    })
    const userinfo = await uiRes.json()

    result.value = {
      code: code.slice(0, 48) + '…（已截断）',
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
    error.value = '令牌交换失败：' + (e.message || String(e))
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
