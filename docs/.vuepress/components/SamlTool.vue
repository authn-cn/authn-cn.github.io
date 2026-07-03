<template>
  <div class="authn-tool">
    <div class="authn-tabs">
      <button
        class="authn-tab"
        :class="{ active: tab === 'decode' }"
        @click="tab = 'decode'"
      >解码 SAML 报文</button>
      <button
        class="authn-tab"
        :class="{ active: tab === 'encode' }"
        @click="tab = 'encode'"
      >生成 AuthnRequest</button>
    </div>

    <!-- ==================== 解码 ==================== -->
    <div v-show="tab === 'decode'">
      <label class="authn-label" for="saml-input">
        SAMLRequest / SAMLResponse 参数值、完整 Redirect URL,或原始 XML
      </label>
      <textarea
        id="saml-input"
        v-model="encoded"
        class="authn-textarea"
        rows="6"
        spellcheck="false"
        placeholder="支持三种输入：Redirect Binding 的 URL（自动提取参数）、Base64(+deflate) 编码串、或直接粘贴 XML"
      ></textarea>
      <button class="authn-btn" @click="doDecode">解码</button>
      <p v-if="decodeError" class="authn-error">{{ decodeError }}</p>
      <template v-if="decodedXml">
        <p class="authn-note">检测到编码方式：{{ detected }}</p>
        <h4>解码结果</h4>
        <pre class="authn-pre">{{ decodedXml }}</pre>
      </template>
    </div>

    <!-- ==================== 生成 ==================== -->
    <div v-show="tab === 'encode'">
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">Issuer（SP EntityID）</label>
          <input v-model="form.issuer" class="authn-input" placeholder="https://sp.example.com/metadata" />
        </div>
        <div class="authn-field">
          <label class="authn-label">Destination（IdP SSO URL）</label>
          <input v-model="form.destination" class="authn-input" placeholder="https://idp.example.com/sso" />
        </div>
      </div>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">AssertionConsumerServiceURL（SP ACS）</label>
          <input v-model="form.acs" class="authn-input" placeholder="https://sp.example.com/acs" />
        </div>
        <div class="authn-field">
          <label class="authn-label">NameID Format</label>
          <select v-model="form.nameIdFormat" class="authn-select">
            <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">emailAddress</option>
            <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:persistent">persistent</option>
            <option value="urn:oasis:names:tc:SAML:2.0:nameid-format:transient">transient</option>
            <option value="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified">unspecified</option>
          </select>
        </div>
      </div>
      <div class="authn-row">
        <div class="authn-field">
          <label class="authn-label">RelayState（可选）</label>
          <input v-model="form.relayState" class="authn-input" placeholder="/dashboard" />
        </div>
        <div class="authn-field">
          <label class="authn-label">ProtocolBinding（Response 回传方式）</label>
          <select v-model="form.protocolBinding" class="authn-select">
            <option value="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">HTTP-POST</option>
            <option value="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Artifact">HTTP-Artifact</option>
          </select>
        </div>
      </div>
      <button class="authn-btn" @click="doEncode">生成</button>
      <p v-if="encodeError" class="authn-error">{{ encodeError }}</p>
      <template v-if="genXml">
        <h4>AuthnRequest XML</h4>
        <pre class="authn-pre">{{ genXml }}</pre>
        <h4>Redirect Binding 编码值（deflate → base64 → urlencode）</h4>
        <pre class="authn-pre">{{ genEncoded }}</pre>
        <h4>完整 Redirect URL</h4>
        <pre class="authn-pre">{{ genUrl }}</pre>
        <p class="authn-note">
          ⚠️ 生成的请求<strong>未签名</strong>。若 IdP 要求
          <code>WantAuthnRequestsSigned</code>,还需追加 SigAlg 与 Signature 参数。
        </p>
      </template>
    </div>

    <p class="authn-note">所有编解码均在浏览器本地完成,报文不会被上传到任何服务器。</p>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const tab = ref('decode')

// ---------- 解码 ----------
const encoded = ref('')
const decodedXml = ref('')
const decodeError = ref('')
const detected = ref('')

function b64ToBytes(s) {
  const bin = atob(s)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(ds)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function deflateRaw(bytes) {
  const cs = new CompressionStream('deflate-raw')
  const stream = new Blob([bytes]).stream().pipeThrough(cs)
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function bytesToB64(bytes) {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function formatXml(xml) {
  let out = ''
  let indent = 0
  const nodes = xml.replace(/>\s*</g, '><').split(/(?=<)|(?<=>)/g).filter(Boolean)
  for (const node of nodes) {
    if (/^<\/[^>]+>/.test(node)) indent = Math.max(0, indent - 1)
    out += '  '.repeat(indent) + node.trim() + '\n'
    if (/^<[^!?/][^>]*[^/]>$/.test(node.trim())) indent++
  }
  return out.trim()
}

async function doDecode() {
  decodeError.value = ''
  decodedXml.value = ''
  detected.value = ''
  let input = encoded.value.trim()
  if (!input) return

  try {
    // 完整 URL：提取 SAMLRequest / SAMLResponse 参数
    if (/^https?:\/\//i.test(input)) {
      const u = new URL(input)
      const param = u.searchParams.get('SAMLRequest') || u.searchParams.get('SAMLResponse')
      if (!param) throw new Error('URL 中未找到 SAMLRequest 或 SAMLResponse 参数。')
      input = param
      detected.value = '完整 URL → '
    } else if (/%[0-9a-fA-F]{2}/.test(input) && !input.startsWith('<')) {
      input = decodeURIComponent(input)
    }

    // 直接是 XML
    if (input.startsWith('<')) {
      detected.value += '原始 XML（未编码）'
      decodedXml.value = formatXml(input)
      return
    }

    const bytes = b64ToBytes(input.replace(/\s/g, ''))
    const asText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    if (asText.trimStart().startsWith('<')) {
      // POST Binding：仅 base64
      detected.value += 'Base64（POST Binding）'
      decodedXml.value = formatXml(asText)
      return
    }

    // Redirect Binding：base64 + raw deflate
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持 DecompressionStream,无法解压 deflate 数据。请使用较新版本的 Chrome / Edge / Firefox / Safari。')
    }
    const inflated = await inflateRaw(bytes)
    const xml = new TextDecoder('utf-8').decode(inflated)
    if (!xml.trimStart().startsWith('<')) throw new Error('解压结果不是 XML。')
    detected.value += 'Base64 + Deflate（Redirect Binding）'
    decodedXml.value = formatXml(xml)
  } catch (e) {
    decodeError.value = '解码失败：' + (e.message || '输入不是合法的 SAML 编码数据。')
  }
}

// ---------- 生成 ----------
const form = reactive({
  issuer: 'https://sp.example.com/metadata',
  destination: 'https://idp.example.com/sso',
  acs: 'https://sp.example.com/acs',
  nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  relayState: '',
  protocolBinding: 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST',
})
const genXml = ref('')
const genEncoded = ref('')
const genUrl = ref('')
const encodeError = ref('')

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}

async function doEncode() {
  encodeError.value = ''
  genXml.value = ''
  genEncoded.value = ''
  genUrl.value = ''

  if (!form.issuer || !form.destination || !form.acs) {
    encodeError.value = 'Issuer、Destination、ACS URL 均为必填。'
    return
  }

  const id = '_' + crypto.randomUUID()
  const issueInstant = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const xml =
    `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ` +
    `xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ` +
    `ID="${id}" Version="2.0" IssueInstant="${issueInstant}" ` +
    `Destination="${esc(form.destination)}" ` +
    `ProtocolBinding="${form.protocolBinding}" ` +
    `AssertionConsumerServiceURL="${esc(form.acs)}">` +
    `<saml:Issuer>${esc(form.issuer)}</saml:Issuer>` +
    `<samlp:NameIDPolicy Format="${form.nameIdFormat}" AllowCreate="true"/>` +
    `</samlp:AuthnRequest>`

  try {
    if (typeof CompressionStream === 'undefined') {
      throw new Error('当前浏览器不支持 CompressionStream,无法生成 deflate 编码。请使用较新版本的 Chrome / Edge / Firefox / Safari。')
    }
    const deflated = await deflateRaw(new TextEncoder().encode(xml))
    const b64 = bytesToB64(deflated)
    genXml.value = formatXml(xml)
    genEncoded.value = encodeURIComponent(b64)
    let url = form.destination + (form.destination.includes('?') ? '&' : '?') + 'SAMLRequest=' + encodeURIComponent(b64)
    if (form.relayState) url += '&RelayState=' + encodeURIComponent(form.relayState)
    genUrl.value = url
  } catch (e) {
    encodeError.value = '生成失败：' + (e.message || String(e))
  }
}
</script>

<style scoped src="./tool-style.css"></style>
