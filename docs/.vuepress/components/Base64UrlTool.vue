<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">操作</label>
        <select v-model="mode" class="authn-select" @change="run">
          <option value="encode">编码 Encode</option>
          <option value="decode">解码 Decode</option>
        </select>
      </div>
      <div class="authn-field">
        <label class="authn-label">变体</label>
        <select v-model="variant" class="authn-select" @change="run">
          <option value="url">Base64URL（-_,无填充）</option>
          <option value="std">标准 Base64（+/=）</option>
        </select>
      </div>
    </div>

    <label class="authn-label">{{ mode === 'encode' ? '原文（UTF-8 文本）' : 'Base64 字符串' }}</label>
    <textarea v-model="input" class="authn-textarea" rows="4" spellcheck="false" @input="run"></textarea>

    <p v-if="error" class="authn-error">{{ error }}</p>
    <template v-if="output">
      <label class="authn-label">结果</label>
      <pre class="authn-pre">{{ output }}</pre>
    </template>
    <p class="authn-note">全部在浏览器本地完成。JWT / SAML 的各段都是 Base64(URL) 编码。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const mode = ref('encode')
const variant = ref('url')
const input = ref('')
const output = ref('')
const error = ref('')

function toB64(bytes, url) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  let s = btoa(bin)
  if (url) s = s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return s
}
function fromB64(s) {
  let t = s.trim().replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  const bin = atob(t)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function run() {
  error.value = ''
  output.value = ''
  if (!input.value) return
  try {
    if (mode.value === 'encode') {
      output.value = toB64(new TextEncoder().encode(input.value), variant.value === 'url')
    } else {
      output.value = new TextDecoder('utf-8', { fatal: false }).decode(fromB64(input.value))
    }
  } catch {
    error.value = mode.value === 'decode' ? '不是合法的 Base64 字符串。' : '编码失败。'
  }
}
</script>

<style scoped src="./tool-style.css"></style>
