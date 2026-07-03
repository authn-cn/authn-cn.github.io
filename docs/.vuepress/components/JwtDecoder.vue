<template>
  <div class="authn-tool">
    <label class="authn-label" for="jwt-input">JWT（粘贴完整 token）</label>
    <textarea
      id="jwt-input"
      v-model="token"
      class="authn-textarea"
      rows="6"
      spellcheck="false"
      placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi..."
      @input="decode"
    ></textarea>

    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="header">
      <h4>Header</h4>
      <pre class="authn-pre">{{ header }}</pre>

      <h4>Payload</h4>
      <pre class="authn-pre">{{ payload }}</pre>

      <template v-if="timeClaims.length">
        <h4>时间类 Claims</h4>
        <table class="authn-table">
          <thead>
            <tr><th>Claim</th><th>原始值</th><th>本地时间</th><th>状态</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in timeClaims" :key="c.name">
              <td><code>{{ c.name }}</code></td>
              <td>{{ c.raw }}</td>
              <td>{{ c.local }}</td>
              <td :class="c.expired ? 'authn-bad' : 'authn-ok'">{{ c.status }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <h4>Signature</h4>
      <pre class="authn-pre authn-sig">{{ signature || '（无签名段 —— alg 可能为 none）' }}</pre>
      <p class="authn-note">
        ⚠️ 本工具只做解码,<strong>不验证签名</strong>。解码成功不代表 token 可信,
        生产环境必须用 JWKS / 共享密钥验证签名后才能信任其中的 claims。
        所有解析均在你的浏览器本地完成,token 不会被上传。
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const token = ref('')
const header = ref('')
const payload = ref('')
const signature = ref('')
const error = ref('')
const timeClaims = ref([])

function b64urlToText(seg) {
  let s = seg.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder('utf-8').decode(bytes)
}

function decode() {
  error.value = ''
  header.value = ''
  payload.value = ''
  signature.value = ''
  timeClaims.value = []

  const raw = token.value.trim().replace(/^Bearer\s+/i, '')
  if (!raw) return

  const parts = raw.split('.')
  if (parts.length < 2 || parts.length > 3) {
    error.value = `无效的 JWT：应由 2~3 段组成（用 . 分隔）,实际为 ${parts.length} 段。`
    return
  }

  try {
    const h = JSON.parse(b64urlToText(parts[0]))
    const p = JSON.parse(b64urlToText(parts[1]))
    header.value = JSON.stringify(h, null, 2)
    payload.value = JSON.stringify(p, null, 2)
    signature.value = parts[2] || ''

    const now = Math.floor(Date.now() / 1000)
    const items = []
    for (const name of ['exp', 'nbf', 'iat', 'auth_time']) {
      if (typeof p[name] === 'number') {
        const local = new Date(p[name] * 1000).toLocaleString()
        let status = '—'
        let expired = false
        if (name === 'exp') {
          expired = p[name] < now
          status = expired ? '已过期' : `有效（剩余 ${fmtDur(p[name] - now)}）`
        } else if (name === 'nbf') {
          expired = p[name] > now
          status = expired ? '尚未生效' : '已生效'
        } else {
          status = `${fmtDur(now - p[name])}前`
        }
        items.push({ name, raw: p[name], local, status, expired })
      }
    }
    timeClaims.value = items
  } catch (e) {
    error.value = '解码失败：某一段不是合法的 Base64URL 编码 JSON。请确认粘贴的是完整且未被截断的 JWT。'
  }
}

function fmtDur(sec) {
  sec = Math.abs(sec)
  if (sec < 60) return `${sec} 秒`
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟`
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时 ${Math.floor((sec % 3600) / 60)} 分`
  return `${Math.floor(sec / 86400)} 天`
}
</script>

<style scoped src="./tool-style.css"></style>
