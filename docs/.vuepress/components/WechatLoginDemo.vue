<template>
  <div class="authn-tool">
    <div class="authn-row" style="align-items: flex-end">
      <div class="authn-field">
        <label class="authn-label">{{ t('baseLabel') }}</label>
        <input v-model="base" class="authn-input" spellcheck="false" />
      </div>
    </div>

    <div v-if="!lockProvider" class="authn-row" style="gap: 0.5rem; margin: 0.6rem 0">
      <button
        class="authn-btn"
        :class="{ secondary: provider !== 'wechat' }"
        @click="switchProvider('wechat')"
      >{{ t('tabWechat') }}</button>
      <button
        class="authn-btn"
        :class="{ secondary: provider !== 'wecom' }"
        @click="switchProvider('wecom')"
      >{{ t('tabWecom') }}</button>
    </div>

    <p v-if="!result && !error">
      {{ provider === 'wechat' ? t('introWechat') : t('introWecom') }}
    </p>

    <button v-if="!qrShown" class="authn-btn" :disabled="busy" @click="startQr">
      {{ busy ? t('processing') : t('showQrBtn') }}
    </button>
    <button v-if="result || error || qrShown" class="authn-btn secondary" @click="reset">
      {{ t('resetBtn') }}
    </button>

    <!-- 内嵌二维码容器:由 Mock 的官方同款 SDK(WxLogin / WwLogin)注入 iframe -->
    <div v-show="qrShown" :id="containerId" class="authn-qr" />

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="result">
      <h4>{{ t('callbackTitle') }}</h4>
      <pre class="authn-pre">{{ result.callback }}</pre>
      <p class="authn-note authn-ok">{{ result.stateOk ? t('stateOk') : t('stateMismatch') }}</p>

      <template v-for="(step, i) in result.steps" :key="i">
        <h4>{{ step.title }}</h4>
        <pre class="authn-pre">{{ step.body }}</pre>
      </template>
    </template>

    <p class="authn-note">
      {{ t('switchBefore') }}
      <strong>{{ provider === 'wechat' ? '/wechat/wxLogin.js' : '/wecom/wwLogin.js' }}</strong>
      {{ t('switchMid') }}
      <strong>{{ provider === 'wechat' ? 'api.weixin.qq.com' : 'qyapi.weixin.qq.com' }}</strong>{{ t('switchAfter') }}
    </p>
    <p class="authn-note">
      <strong>{{ t('footerTestOnly') }}</strong>{{ t('footerAfter') }}
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    baseLabel: 'Mock 服务地址',
    tabWechat: '微信（网站应用）',
    tabWecom: '企业微信',
    introWechat:
      '点击下面的按钮,用 Mock 微信的官方同款 WxLogin SDK 内嵌一个二维码。手机扫码或点二维码下方“模拟扫码 → 确认登录”,页面会带 code 回跳,并自动用 code 换 access_token、再拉取用户信息。',
    introWecom:
      '点击下面的按钮,用 Mock 企业微信的官方同款 WwLogin SDK 内嵌一个二维码。扫码确认后带 code 回跳,页面按企业微信规范三步走:gettoken → auth/getuserinfo → user/get。',
    processing: '处理中…',
    showQrBtn: '生成二维码登录',
    resetBtn: '重置',
    callbackTitle: '① 回跳收到的 code / state',
    stateOk: '✔ state 校验通过(与发起时一致,防 CSRF)',
    stateMismatch: '⚠ state 不匹配',
    switchBefore: '上线切换:只需把引入的',
    switchMid: '换成官方 SDK,把后端 API base 换成',
    switchAfter: ',业务代码与参数、返回字段都不变。',
    footerTestOnly: '仅供测试',
    footerAfter: ':Mock 固定返回一个测试用户,签名私钥公开,切勿用于生产。',
    sdkLoadFail: 'SDK 加载失败:',
    exchangeFail: '换取用户信息失败:',
    apiError: '接口返回错误:',
  },
  en: {
    baseLabel: 'Mock base URL',
    tabWechat: 'WeChat (Website App)',
    tabWecom: 'WeCom',
    introWechat:
      'Click the button below to embed a QR code using the Mock WeChat WxLogin SDK (identical to the official one). Scan it, or use the “simulate scan → confirm” link under the QR; the page returns with a code and automatically exchanges it for an access_token and user info.',
    introWecom:
      'Click the button below to embed a QR code using the Mock WeCom WwLogin SDK. After scanning and confirming, the page returns with a code and runs the WeCom three-step flow: gettoken → auth/getuserinfo → user/get.',
    processing: 'Processing…',
    showQrBtn: 'Show login QR code',
    resetBtn: 'Reset',
    callbackTitle: '① code / state received on redirect',
    stateOk: '✔ state check passed (matches the one sent — CSRF protection)',
    stateMismatch: '⚠ state mismatch',
    switchBefore: 'Going live: just swap the imported',
    switchMid: 'for the official SDK, and the backend API base for',
    switchAfter: '. Your code, parameters and response fields stay the same.',
    footerTestOnly: 'Test-only',
    footerAfter: ': the mock returns a fixed user and its signing key is public — never use in production.',
    sdkLoadFail: 'Failed to load SDK: ',
    exchangeFail: 'Failed to fetch user info: ',
    apiError: 'API returned an error: ',
  },
  de: {
    baseLabel: 'Mock-Basis-URL',
    tabWechat: 'WeChat (Website-App)',
    tabWecom: 'WeCom',
    introWechat:
      'Klicken Sie unten, um mit dem Mock-WeChat-WxLogin-SDK (identisch zum offiziellen) einen QR-Code einzubetten. Scannen Sie ihn oder nutzen Sie den Link „Scan simulieren → bestätigen“ unter dem QR-Code; die Seite kehrt mit einem code zurück und tauscht ihn automatisch gegen access_token und Nutzerinfos.',
    introWecom:
      'Klicken Sie unten, um mit dem Mock-WeCom-WwLogin-SDK einen QR-Code einzubetten. Nach dem Bestätigen kehrt die Seite mit einem code zurück und durchläuft den WeCom-Dreischritt: gettoken → auth/getuserinfo → user/get.',
    processing: 'Wird verarbeitet…',
    showQrBtn: 'Login-QR-Code anzeigen',
    resetBtn: 'Zurücksetzen',
    callbackTitle: '① code / state beim Redirect empfangen',
    stateOk: '✔ state-Prüfung bestanden (stimmt mit gesendetem Wert überein — CSRF-Schutz)',
    stateMismatch: '⚠ state stimmt nicht überein',
    switchBefore: 'Für Produktion: einfach das eingebundene',
    switchMid: 'gegen das offizielle SDK und die Backend-API-Basis gegen',
    switchAfter: ' tauschen. Code, Parameter und Antwortfelder bleiben gleich.',
    footerTestOnly: 'Nur zum Testen',
    footerAfter: ': Der Mock liefert einen festen Nutzer, der Signaturschlüssel ist öffentlich — niemals in Produktion verwenden.',
    sdkLoadFail: 'SDK konnte nicht geladen werden: ',
    exchangeFail: 'Nutzerinfos konnten nicht abgerufen werden: ',
    apiError: 'API hat einen Fehler zurückgegeben: ',
  },
}
const t = useT(messages)

const props = defineProps({
  // 锁定为 'wechat' 或 'wecom' 时隐藏切换标签,只演示该平台
  lockProvider: { type: String, default: '' },
})

const base = ref('https://mock.authn.tech')
const provider = ref(props.lockProvider || 'wechat')
const busy = ref(false)
const error = ref('')
const result = ref(null)
const qrShown = ref(false)
const containerId = 'authn-scan-login-container'

const SS_KEY = 'authn_scan_login_demo'

function b64url(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function randStr(n = 16) {
  return b64url(crypto.getRandomValues(new Uint8Array(n)))
}
function trimBase() {
  return base.value.replace(/\/$/, '')
}
/** 回跳地址(带 provider 标记),SDK 按官方约定需要 urlencode 后的值。 */
function redirectTarget(p) {
  return window.location.origin + window.location.pathname + '?provider=' + p
}

// 动态加载 Mock 的官方同款 SDK 脚本(WxLogin / WwLogin 全局)。
const loaded = {}
function loadSdk(src) {
  if (loaded[src]) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => {
      loaded[src] = true
      resolve()
    }
    s.onerror = () => reject(new Error(src))
    document.head.appendChild(s)
  })
}

function switchProvider(p) {
  if (busy.value) return
  provider.value = p
  reset()
}

async function startQr() {
  error.value = ''
  result.value = null
  busy.value = true
  try {
    const p = provider.value
    const state = randStr()
    sessionStorage.setItem(SS_KEY, JSON.stringify({ provider: p, state }))
    const redirect = encodeURIComponent(redirectTarget(p)) // 官方约定:调用方 urlencode

    if (p === 'wechat') {
      await loadSdk(trimBase() + '/wechat/wxLogin.js')
      qrShown.value = true
      // eslint-disable-next-line no-undef
      new WxLogin({
        id: containerId,
        appid: 'authn-cn-docs-demo',
        scope: 'snsapi_login',
        redirect_uri: redirect,
        state,
      })
    } else {
      await loadSdk(trimBase() + '/wecom/wwLogin.js')
      qrShown.value = true
      // eslint-disable-next-line no-undef
      new WwLogin({
        id: containerId,
        appid: 'authn-cn-docs-demo',
        agentid: '1000002',
        redirect_uri: redirect,
        state,
      })
    }
  } catch (e) {
    error.value = t('sdkLoadFail') + (e.message || String(e))
    qrShown.value = false
  } finally {
    busy.value = false
  }
}

async function getJson(url) {
  const res = await fetch(url)
  const data = await res.json()
  return data
}

async function exchangeWechat(code) {
  const b = trimBase()
  const tok = await getJson(
    b + '/sns/oauth2/access_token?appid=authn-cn-docs-demo&secret=mock&code=' +
      encodeURIComponent(code) + '&grant_type=authorization_code',
  )
  if (tok.errcode) throw new Error(t('apiError') + JSON.stringify(tok))
  const ui = await getJson(
    b + '/sns/userinfo?access_token=' + encodeURIComponent(tok.access_token) +
      '&openid=' + encodeURIComponent(tok.openid),
  )
  return [
    { title: '② /sns/oauth2/access_token', body: JSON.stringify(tok, null, 2) },
    { title: '③ /sns/userinfo', body: JSON.stringify(ui, null, 2) },
  ]
}

async function exchangeWecom(code) {
  const b = trimBase()
  const tok = await getJson(b + '/wecom/cgi-bin/gettoken?corpid=authn-cn-docs-demo&corpsecret=mock')
  if (tok.errcode) throw new Error(t('apiError') + JSON.stringify(tok))
  const ui = await getJson(
    b + '/wecom/cgi-bin/auth/getuserinfo?access_token=' + encodeURIComponent(tok.access_token) +
      '&code=' + encodeURIComponent(code),
  )
  if (ui.errcode) throw new Error(t('apiError') + JSON.stringify(ui))
  const member = await getJson(
    b + '/wecom/cgi-bin/user/get?access_token=' + encodeURIComponent(tok.access_token) +
      '&userid=' + encodeURIComponent(ui.userid),
  )
  return [
    { title: '② /wecom/cgi-bin/gettoken', body: JSON.stringify(tok, null, 2) },
    { title: '③ /wecom/cgi-bin/auth/getuserinfo', body: JSON.stringify(ui, null, 2) },
    { title: '④ /wecom/cgi-bin/user/get', body: JSON.stringify(member, null, 2) },
  ]
}

async function handleCallback() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const p = params.get('provider')
  if (!code || !p) return
  // 清掉地址栏 code/state/provider,避免刷新重复处理
  window.history.replaceState({}, '', window.location.origin + window.location.pathname)

  const saved = sessionStorage.getItem(SS_KEY)
  sessionStorage.removeItem(SS_KEY)
  const parsed = saved ? JSON.parse(saved) : {}
  provider.value = p
  const stateOk = params.get('state') && params.get('state') === parsed.state

  busy.value = true
  try {
    const steps = p === 'wechat' ? await exchangeWechat(code) : await exchangeWecom(code)
    result.value = {
      callback: JSON.stringify(
        { provider: p, code: code.slice(0, 40) + '…', state: params.get('state') },
        null,
        2,
      ),
      stateOk,
      steps,
    }
  } catch (e) {
    error.value = t('exchangeFail') + (e.message || String(e))
  } finally {
    busy.value = false
  }
}

if (typeof window !== 'undefined') handleCallback()

function reset() {
  result.value = null
  error.value = ''
  busy.value = false
  qrShown.value = false
  const el = typeof document !== 'undefined' && document.getElementById(containerId)
  if (el) el.innerHTML = ''
}
</script>

<style scoped src="./tool-style.css"></style>
<style scoped>
.authn-qr {
  margin: 1rem 0;
  min-height: 200px;
}
.authn-btn.secondary {
  opacity: 0.7;
}
</style>
