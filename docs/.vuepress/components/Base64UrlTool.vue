<template>
  <div class="authn-tool">
    <div class="authn-row">
      <div class="authn-field">
        <label class="authn-label">{{ t('opLabel') }}</label>
        <select v-model="mode" class="authn-select" @change="run">
          <option value="encode">{{ t('opEncode') }}</option>
          <option value="decode">{{ t('opDecode') }}</option>
        </select>
      </div>
      <div class="authn-field">
        <label class="authn-label">{{ t('variantLabel') }}</label>
        <select v-model="variant" class="authn-select" @change="run">
          <option value="url">{{ t('variantUrl') }}</option>
          <option value="std">{{ t('variantStd') }}</option>
        </select>
      </div>
    </div>

    <label class="authn-label">{{ mode === 'encode' ? t('inputLabelEncode') : t('inputLabelDecode') }}</label>
    <textarea v-model="input" class="authn-textarea" rows="4" spellcheck="false" @input="run"></textarea>

    <p v-if="error" class="authn-error">{{ error }}</p>
    <template v-if="output">
      <label class="authn-label">{{ t('resultLabel') }}</label>
      <pre class="authn-pre">{{ output }}</pre>
    </template>
    <p class="authn-note">{{ t('localNote') }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useT } from './i18n.js'

const messages = {
  zh: {
    opLabel: '操作',
    opEncode: '编码 Encode',
    opDecode: '解码 Decode',
    variantLabel: '变体',
    variantUrl: 'Base64URL（-_,无填充）',
    variantStd: '标准 Base64（+/=）',
    inputLabelEncode: '原文（UTF-8 文本）',
    inputLabelDecode: 'Base64 字符串',
    resultLabel: '结果',
    localNote: '全部在浏览器本地完成。JWT / SAML 的各段都是 Base64(URL) 编码。',
    errDecodeInvalid: '不是合法的 Base64 字符串。',
    errEncodeFailed: '编码失败。',
  },
  en: {
    opLabel: 'Operation',
    opEncode: 'Encode',
    opDecode: 'Decode',
    variantLabel: 'Variant',
    variantUrl: 'Base64URL (-_, no padding)',
    variantStd: 'Standard Base64 (+/=)',
    inputLabelEncode: 'Plaintext (UTF-8 text)',
    inputLabelDecode: 'Base64 string',
    resultLabel: 'Result',
    localNote: 'Everything runs locally in the browser. JWT / SAML segments are all Base64(URL) encoded.',
    errDecodeInvalid: 'Not a valid Base64 string.',
    errEncodeFailed: 'Encoding failed.',
  },
  de: {
    opLabel: 'Operation',
    opEncode: 'Kodieren',
    opDecode: 'Dekodieren',
    variantLabel: 'Variante',
    variantUrl: 'Base64URL (-_, ohne Padding)',
    variantStd: 'Standard-Base64 (+/=)',
    inputLabelEncode: 'Klartext (UTF-8-Text)',
    inputLabelDecode: 'Base64-Zeichenfolge',
    resultLabel: 'Ergebnis',
    localNote: 'Alles läuft lokal im Browser. Die Segmente von JWT / SAML sind jeweils Base64(URL)-kodiert.',
    errDecodeInvalid: 'Keine gültige Base64-Zeichenfolge.',
    errEncodeFailed: 'Kodierung fehlgeschlagen.',
  },
}
const t = useT(messages)

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
    error.value = mode.value === 'decode' ? t('errDecodeInvalid') : t('errEncodeFailed')
  }
}
</script>

<style scoped src="./tool-style.css"></style>
