<template>
  <div class="authn-tool">
    <label class="authn-label">SAML Metadata XML</label>
    <textarea v-model="input" class="authn-textarea" rows="7" spellcheck="false"
      placeholder="粘贴 EntityDescriptor / EntitiesDescriptor XML" @input="parse"></textarea>
    <p v-if="error" class="authn-error">{{ error }}</p>

    <div v-for="(ent, i) in entities" :key="i" class="md-entity">
      <h4>EntityDescriptor</h4>
      <table class="authn-table"><tbody>
        <tr><td><strong>entityID</strong></td><td style="word-break:break-all">{{ ent.entityID }}</td></tr>
      </tbody></table>

      <div v-for="(role, j) in ent.roles" :key="j" class="md-role">
        <p><strong>{{ role.type }}</strong>
          <span v-if="role.wantSigned" class="authn-note">（{{ role.wantSigned }}）</span>
        </p>

        <template v-if="role.endpoints.length">
          <table class="authn-table">
            <thead><tr><th>端点</th><th>Binding</th><th>Location</th></tr></thead>
            <tbody>
              <tr v-for="(ep, k) in role.endpoints" :key="k">
                <td>{{ ep.kind }}</td><td>{{ ep.binding }}</td><td style="word-break:break-all">{{ ep.location }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <p v-if="role.nameIdFormats.length" class="authn-note">NameIDFormat：{{ role.nameIdFormats.join('、') }}</p>

        <div v-for="(cert, m) in role.certs" :key="m" class="md-cert">
          <p class="authn-note">证书（use={{ cert.use || '未指定' }}）</p>
          <table v-if="cert.info" class="authn-table"><tbody>
            <tr><td>Subject</td><td style="word-break:break-all">{{ cert.info.subject }}</td></tr>
            <tr><td>有效期</td><td>{{ cert.info.notBefore.str }} → {{ cert.info.notAfter.str }}
              <span :class="cert.info.expired ? 'authn-bad' : 'authn-ok'">{{ cert.info.expired ? '已过期' : cert.info.notYet ? '尚未生效' : '有效' }}</span></td></tr>
            <tr><td>公钥/签名</td><td>{{ cert.info.pubAlg }} / {{ cert.info.sigAlg }}</td></tr>
            <tr><td>SHA-256</td><td style="word-break:break-all">{{ cert.info.sha256Hex }}</td></tr>
          </tbody></table>
          <p v-else class="authn-error">{{ cert.err }}</p>
        </div>
      </div>
    </div>
    <p v-if="entities.length" class="authn-note">纯浏览器本地解析,不上传。可把证书粘到 <a href="./cert.html">X.509 解析</a> 看更多字段。</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseCertificate } from './x509.js'

const input = ref('')
const error = ref('')
const entities = ref([])

function attr(el, name) {
  return el.getAttribute(name) || ''
}
function tag(el, local) {
  return Array.from(el.getElementsByTagNameNS('*', local))
}

async function parse() {
  error.value = ''
  entities.value = []
  if (!input.value.trim()) return
  let doc
  try {
    doc = new DOMParser().parseFromString(input.value, 'text/xml')
    if (doc.getElementsByTagName('parsererror').length) throw new Error('XML 解析错误')
  } catch (e) {
    error.value = 'XML 解析失败：' + (e.message || '')
    return
  }
  const eds = tag(doc.documentElement, 'EntityDescriptor')
  const list = eds.length ? eds : (doc.documentElement.localName === 'EntityDescriptor' ? [doc.documentElement] : [])
  if (!list.length) { error.value = '未找到 EntityDescriptor。'; return }

  const result = []
  for (const ed of list) {
    const roles = []
    for (const [type, roleLocal] of [['IdP', 'IDPSSODescriptor'], ['SP', 'SPSSODescriptor']]) {
      for (const rd of tag(ed, roleLocal)) {
        // 只取该 role 直接相关的端点/证书(getElementsByTagNameNS 会含后代,SAML 结构中足够)
        const endpoints = []
        for (const kind of ['SingleSignOnService', 'AssertionConsumerService', 'SingleLogoutService', 'ArtifactResolutionService']) {
          for (const ep of tag(rd, kind)) {
            endpoints.push({ kind, binding: shortBinding(attr(ep, 'Binding')), location: attr(ep, 'Location') })
          }
        }
        const nameIdFormats = tag(rd, 'NameIDFormat').map((n) => shortNameId(n.textContent.trim()))
        const certs = []
        for (const kd of tag(rd, 'KeyDescriptor')) {
          const use = attr(kd, 'use')
          const x = tag(kd, 'X509Certificate')[0]
          if (x) {
            try {
              certs.push({ use, info: await parseCertificate(x.textContent.trim()) })
            } catch (e) {
              certs.push({ use, err: '证书解析失败：' + (e.message || '') })
            }
          }
        }
        roles.push({
          type: type + ' · ' + roleLocal,
          wantSigned: attr(rd, 'WantAuthnRequestsSigned') ? 'WantAuthnRequestsSigned=' + attr(rd, 'WantAuthnRequestsSigned') : (attr(rd, 'WantAssertionsSigned') ? 'WantAssertionsSigned=' + attr(rd, 'WantAssertionsSigned') : ''),
          endpoints,
          nameIdFormats,
          certs,
        })
      }
    }
    result.push({ entityID: attr(ed, 'entityID'), roles })
  }
  entities.value = result
}

function shortBinding(b) {
  return b.replace('urn:oasis:names:tc:SAML:2.0:bindings:', '')
}
function shortNameId(n) {
  return n.replace(/urn:oasis:names:tc:SAML:[\d.]+:nameid-format:/, '')
}
</script>

<style scoped>
.md-entity { border: 1px solid var(--vp-c-border, #dcdfe6); border-radius: 8px; padding: 0.8rem 1rem; margin-top: 1rem; }
.md-role { border-left: 3px solid #3eaf7c; padding-left: 0.8rem; margin: 0.8rem 0; }
.md-cert { margin: 0.5rem 0; }
</style>
<style scoped src="./tool-style.css"></style>
