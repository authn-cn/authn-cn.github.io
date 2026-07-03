<template>
  <div class="authn-tool">
    <label class="authn-label">X.509 证书（PEM,或纯 base64 DER）</label>
    <textarea v-model="input" class="authn-textarea" rows="6" spellcheck="false"
      placeholder="-----BEGIN CERTIFICATE-----&#10;MIID...&#10;-----END CERTIFICATE-----" @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <template v-if="fields.length">
      <table class="authn-table">
        <tbody>
          <tr v-for="f in fields" :key="f[0]">
            <td style="white-space:nowrap"><strong>{{ f[0] }}</strong></td>
            <td style="word-break:break-all">{{ f[1] }}</td>
          </tr>
        </tbody>
      </table>
      <p class="authn-note">纯浏览器本地解析 ASN.1,证书不上传。SAML Metadata 里的 <code>&lt;X509Certificate&gt;</code> 即为此格式(base64 DER)。</p>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseCertificate } from './x509.js'

const input = ref('')
const error = ref('')
const fields = ref([])

async function parse() {
  error.value = ''
  fields.value = []
  if (!input.value.trim()) return
  try {
    const c = await parseCertificate(input.value)
    fields.value = [
      ['版本', 'v' + c.version],
      ['序列号', c.serialHex],
      ['主体 Subject', c.subject],
      ['颁发者 Issuer', c.issuer],
      ['有效期起', c.notBefore.str],
      ['有效期止', c.notAfter.str + (c.expired ? '  ⚠ 已过期' : c.notYet ? '  ⚠ 尚未生效' : '  ✔ 在有效期内')],
      ['公钥算法', c.pubAlg],
      ['签名算法', c.sigAlg],
      ['SHA-1 指纹', c.sha1Hex],
      ['SHA-256 指纹', c.sha256Hex],
    ]
  } catch (e) {
    error.value = '解析失败：不是合法的 X.509 DER 结构。' + (e.message ? `(${e.message})` : '')
  }
}
</script>

<style scoped src="./tool-style.css"></style>
