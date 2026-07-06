<template>
  <div class="authn-tool">
    <div class="authn-row" style="align-items:flex-end">
      <div class="authn-field">
        <label class="authn-label">{{ t('combinator') }}</label>
        <select v-model="combinator" class="authn-select">
          <option value="&">{{ t('all') }} (&amp;)</option>
          <option value="|">{{ t('any') }} (|)</option>
        </select>
      </div>
    </div>

    <table class="ldap-rows">
      <thead><tr>
        <th>{{ t('not') }}</th><th>{{ t('attribute') }}</th><th>{{ t('operator') }}</th><th>{{ t('value') }}</th><th></th>
      </tr></thead>
      <tbody>
        <tr v-for="(c, i) in conditions" :key="i">
          <td><input type="checkbox" v-model="c.not" /></td>
          <td><input v-model="c.attr" class="authn-input" list="ldap-attrs" spellcheck="false" placeholder="uid" /></td>
          <td>
            <select v-model="c.op" class="authn-select">
              <option value="eq">= ({{ t('opEq') }})</option>
              <option value="present">=* ({{ t('opPresent') }})</option>
              <option value="contains">=*v* ({{ t('opContains') }})</option>
              <option value="startsWith">=v* ({{ t('opStarts') }})</option>
              <option value="endsWith">=*v ({{ t('opEnds') }})</option>
              <option value="ge">&gt;= ({{ t('opGe') }})</option>
              <option value="le">&lt;= ({{ t('opLe') }})</option>
              <option value="approx">~= ({{ t('opApprox') }})</option>
            </select>
          </td>
          <td><input v-model="c.value" class="authn-input" spellcheck="false" :disabled="c.op === 'present'" placeholder="alice" /></td>
          <td><button class="authn-btn sm danger" @click="remove(i)" :disabled="conditions.length === 1">✕</button></td>
        </tr>
      </tbody>
    </table>
    <datalist id="ldap-attrs">
      <option v-for="a in ATTRS" :key="a" :value="a" />
    </datalist>
    <button class="authn-btn" @click="add">+ {{ t('addCond') }}</button>

    <label class="authn-label" style="margin-top:1rem">{{ t('result') }}</label>
    <pre class="authn-pre">{{ filter }}</pre>
    <button class="authn-btn" @click="copy">{{ t('copy') }}</button>

    <div class="ldap-test">
      <label class="authn-label">{{ t('testTitle') }}</label>
      <div class="authn-row" style="align-items:flex-end">
        <div class="authn-field"><label class="authn-label">base</label><input v-model="base" class="authn-input" spellcheck="false" /></div>
        <div class="authn-field"><label class="authn-label">scope</label><select v-model="scope" class="authn-select"><option>base</option><option>one</option><option>sub</option></select></div>
        <div class="authn-field" style="flex:0"><button class="authn-btn" :disabled="busy" @click="test">{{ busy ? t('testing') : t('testBtn') }}</button></div>
      </div>
      <p v-if="testErr" class="authn-error">{{ testErr }}</p>
      <template v-if="results">
        <p class="authn-note">{{ t('matched') }} {{ results.count }}</p>
        <ul class="ldap-results"><li v-for="e in results.entries" :key="e.dn"><code>{{ e.dn }}</code></li></ul>
      </template>
      <p class="authn-note">{{ t('testNote') }} <a href="../mock/ldap.html">Mock LDAP</a>.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useT } from './i18n.js'

const ATTRS = ['uid', 'cn', 'sn', 'givenName', 'mail', 'displayName', 'objectClass', 'memberOf', 'member', 'ou', 'o', 'dc', 'telephoneNumber', 'title', 'departmentNumber', 'employeeType', 'userPrincipalName', 'sAMAccountName']

const messages = {
  zh: {
    combinator: '组合方式', all: '全部满足', any: '任一满足', not: '非', attribute: '属性', operator: '运算符', value: '值',
    opEq: '等于', opPresent: '存在', opContains: '包含', opStarts: '前缀', opEnds: '后缀', opGe: '大于等于', opLe: '小于等于', opApprox: '近似',
    addCond: '添加条件', result: '生成的过滤器(RFC 4515)', copy: '复制',
    testTitle: '对 Mock LDAP 测试', testBtn: '搜索', testing: '搜索中…', matched: '匹配条目数:', testNote: '针对示例目录搜索,后端为',
  },
  en: {
    combinator: 'Combinator', all: 'Match all', any: 'Match any', not: 'NOT', attribute: 'Attribute', operator: 'Operator', value: 'Value',
    opEq: 'equals', opPresent: 'present', opContains: 'contains', opStarts: 'starts with', opEnds: 'ends with', opGe: 'greater/equal', opLe: 'less/equal', opApprox: 'approx',
    addCond: 'Add condition', result: 'Generated filter (RFC 4515)', copy: 'Copy',
    testTitle: 'Test against Mock LDAP', testBtn: 'Search', testing: 'Searching…', matched: 'Matched entries:', testNote: 'Searches the sample directory; backend is',
  },
  de: {
    combinator: 'Verknüpfung', all: 'Alle erfüllen', any: 'Eine erfüllen', not: 'NICHT', attribute: 'Attribut', operator: 'Operator', value: 'Wert',
    opEq: 'gleich', opPresent: 'vorhanden', opContains: 'enthält', opStarts: 'beginnt mit', opEnds: 'endet mit', opGe: 'größer/gleich', opLe: 'kleiner/gleich', opApprox: 'ungefähr',
    addCond: 'Bedingung hinzufügen', result: 'Erzeugter Filter (RFC 4515)', copy: 'Kopieren',
    testTitle: 'Gegen Mock LDAP testen', testBtn: 'Suchen', testing: 'Suche läuft…', matched: 'Treffer:', testNote: 'Durchsucht das Beispielverzeichnis; Backend ist',
  },
}
const t = useT(messages)

const combinator = ref('&')
const conditions = ref([{ attr: 'objectClass', op: 'eq', value: 'person', not: false }])
const base = ref('dc=example,dc=com')
const scope = ref('sub')
const busy = ref(false)
const testErr = ref('')
const results = ref(null)

function add() {
  conditions.value.push({ attr: '', op: 'eq', value: '', not: false })
}
function remove(i) {
  conditions.value.splice(i, 1)
}

// RFC 4515 值转义
function esc(v) {
  return String(v).replace(/\\/g, '\\5c').replace(/\*/g, '\\2a').replace(/\(/g, '\\28').replace(/\)/g, '\\29').replace(/\0/g, '\\00')
}
function item(c) {
  const a = c.attr.trim()
  if (!a) return ''
  let s
  switch (c.op) {
    case 'present': s = `(${a}=*)`; break
    case 'contains': s = `(${a}=*${esc(c.value)}*)`; break
    case 'startsWith': s = `(${a}=${esc(c.value)}*)`; break
    case 'endsWith': s = `(${a}=*${esc(c.value)})`; break
    case 'ge': s = `(${a}>=${esc(c.value)})`; break
    case 'le': s = `(${a}<=${esc(c.value)})`; break
    case 'approx': s = `(${a}~=${esc(c.value)})`; break
    default: s = `(${a}=${esc(c.value)})`
  }
  return c.not ? `(!${s})` : s
}

const filter = computed(() => {
  const items = conditions.value.map(item).filter(Boolean)
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return `(${combinator.value}${items.join('')})`
})

function copy() {
  if (filter.value) navigator.clipboard?.writeText(filter.value)
}

async function test() {
  testErr.value = ''
  results.value = null
  if (!filter.value) {
    testErr.value = t('result')
    return
  }
  busy.value = true
  try {
    const u = new URL('https://mock.authn.tech/ldap/search')
    u.searchParams.set('base', base.value)
    u.searchParams.set('scope', scope.value)
    u.searchParams.set('filter', filter.value)
    const res = await fetch(u)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    results.value = body
  } catch (e) {
    testErr.value = String(e.message || e)
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.ldap-rows { width: 100%; border-collapse: collapse; margin: 0.6rem 0; font-size: 0.85rem; }
.ldap-rows th, .ldap-rows td { padding: 0.3rem 0.4rem; text-align: left; border-bottom: 1px solid var(--vp-c-border, #eee); }
.ldap-rows .authn-input, .ldap-rows .authn-select { margin: 0; }
.ldap-test { margin-top: 1.4rem; border-top: 1px solid var(--vp-c-border, #dcdfe6); padding-top: 1rem; }
.ldap-results { margin: 0.4rem 0; padding-left: 1.2rem; }
.ldap-results li { margin: 0.2rem 0; word-break: break-all; }
.authn-btn.sm { padding: 0.2rem 0.5rem; font-size: 0.8rem; }
.authn-btn.danger { border-color: #e05252; }
</style>
<style scoped src="./tool-style.css"></style>
