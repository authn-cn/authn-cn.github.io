<template>
  <div class="authn-tool">
    <label class="authn-label">PEM 文本(可同时包含多个块,如证书链)</label>
    <textarea v-model="input" class="authn-textarea" rows="9" spellcheck="false"
      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----&#10;-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
      @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-for="(b, i) in blocks" :key="i" class="pem-card">
      <div class="pem-head">
        <span class="pem-badge">{{ b.label }}</span>
        <span class="pem-kind">{{ b.kind }}</span>
      </div>
      <table class="authn-table"><tbody>
        <tr v-for="f in b.fields" :key="f[0]">
          <td style="white-space:nowrap"><strong>{{ f[0] }}</strong></td>
          <td style="word-break:break-all">{{ f[1] }}</td>
        </tr>
      </tbody></table>
      <p v-if="b.hint" class="authn-note" style="margin:.4rem 0 0" v-html="b.hint"></p>
    </div>
    <p v-if="blocks.length" class="authn-note">
      本地解析,不上传。证书详情用 <a href="./cert.html">X.509 解析</a>;密钥转 JWK 用 <a href="./pem-to-jwk.html">PEM → JWK</a>。
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { pemToBytes, parseCertificate } from './x509.js'

const input = ref('')
const error = ref('')
const blocks = ref([])

const KIND = {
  'CERTIFICATE': 'X.509 证书',
  'CERTIFICATE REQUEST': 'PKCS#10 证书请求(CSR)',
  'NEW CERTIFICATE REQUEST': 'PKCS#10 证书请求(CSR)',
  'PUBLIC KEY': 'SPKI 公钥',
  'PRIVATE KEY': 'PKCS#8 私钥',
  'RSA PRIVATE KEY': 'PKCS#1 RSA 私钥(旧式)',
  'RSA PUBLIC KEY': 'PKCS#1 RSA 公钥(旧式)',
  'EC PRIVATE KEY': 'SEC1 EC 私钥(旧式)',
  'ENCRYPTED PRIVATE KEY': '加密的 PKCS#8 私钥',
  'X509 CRL': '证书吊销列表(CRL)',
  'PKCS7': 'PKCS#7 容器',
  'CMS': 'CMS 消息',
  'DH PARAMETERS': 'Diffie-Hellman 参数',
}
const EC_ALGS = [
  { params: { name: 'ECDSA', namedCurve: 'P-256' } },
  { params: { name: 'ECDSA', namedCurve: 'P-384' } },
  { params: { name: 'ECDSA', namedCurve: 'P-521' } },
]

async function keyDetails(format, bytes, usages) {
  // 先试 RSA,再逐个 EC 曲线
  try {
    const k = await crypto.subtle.importKey(format, bytes, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, true, usages)
    return ['算法', `RSA · ${k.algorithm.modulusLength} bit · e=${bigE(k.algorithm.publicExponent)}`]
  } catch { /* not RSA */ }
  for (const a of EC_ALGS) {
    try {
      const k = await crypto.subtle.importKey(format, bytes, a.params, true, usages)
      return ['算法', `EC · ${k.algorithm.namedCurve}`]
    } catch { /* try next */ }
  }
  return ['算法', '无法通过 WebCrypto 识别(可能是 Ed25519 等)']
}
function bigE(buf) {
  if (!buf) return '?'
  let v = 0
  for (const b of new Uint8Array(buf)) v = v * 256 + b
  return v
}

async function parse() {
  error.value = ''
  blocks.value = []
  const text = input.value
  if (!text.trim()) return
  const re = /-----BEGIN ([A-Z0-9 ]+?)-----([\s\S]*?)-----END \1-----/g
  const out = []
  let m
  while ((m = re.exec(text)) !== null) {
    const label = m[1].trim()
    const pem = m[0]
    let bytes
    try { bytes = pemToBytes(pem) } catch { out.push({ label, kind: '解码失败', fields: [['错误', 'base64 无法解码']] }); continue }
    const fields = [['DER 长度', bytes.length + ' 字节']]
    let hint = ''

    if (label === 'CERTIFICATE') {
      try {
        const c = await parseCertificate(pem)
        fields.push(['主体', c.subject], ['颁发者', c.issuer],
          ['有效期', `${c.notBefore.str} → ${c.notAfter.str}` + (c.expired ? '  ⚠ 已过期' : c.notYet ? '  ⚠ 未生效' : '  ✔ 有效')],
          ['公钥算法', c.pubAlg], ['签名算法', c.sigAlg], ['SHA-256', c.sha256Hex])
      } catch (e) { hint = '证书 ASN.1 解析失败:' + (e.message || e) }
    } else if (label === 'PUBLIC KEY') {
      fields.push(await keyDetails('spki', bytes, ['verify']))
    } else if (label === 'PRIVATE KEY') {
      fields.push(await keyDetails('pkcs8', bytes, ['sign']))
    } else if (label === 'RSA PRIVATE KEY' || label === 'EC PRIVATE KEY') {
      hint = 'WebCrypto 不支持旧式格式,转 PKCS#8:<code>openssl pkcs8 -topk8 -nocrypt -in key.pem</code>'
    }
    out.push({ label, kind: KIND[label] || '未知类型', fields, hint })
  }
  if (!out.length) error.value = '未找到 PEM 块(应形如 -----BEGIN ...----- / -----END ...-----)。'
  blocks.value = out
}
</script>

<style scoped>
.pem-card { border: 1px solid var(--vp-c-border, #dcdfe6); border-radius: 8px; padding: .8rem 1rem; margin-top: 1rem; }
.pem-head { display: flex; align-items: baseline; gap: .6rem; margin-bottom: .5rem; }
.pem-badge { font-family: var(--font-family-mono, monospace); font-size: .8rem; font-weight: 700; padding: .1rem .5rem; border-radius: 4px; background: var(--vp-c-brand-soft, #e8f0fe); color: var(--vp-c-brand, #3451b2); }
.pem-kind { color: var(--vp-c-text-2, #666); font-size: .9rem; }
</style>
<style scoped src="./tool-style.css"></style>
