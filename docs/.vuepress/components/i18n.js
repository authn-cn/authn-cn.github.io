import { computed } from 'vue'
import { useRouteLocale } from 'vuepress/client'

/** 当前语言键:'zh' | 'en' | 'de'(由路由前缀 / /en/ /de/ 推断)。 */
export function useLocaleKey() {
  const rl = useRouteLocale()
  return computed(() => (rl.value === '/en/' ? 'en' : rl.value === '/de/' ? 'de' : 'zh'))
}

/**
 * 传入 { zh:{...}, en:{...}, de:{...} } 形式的消息表,返回取词函数 t(key)。
 * 在模板中直接 {{ t('key') }},在 script 中也可 t('key');随路由语言自动生效。
 * 缺失的语言/键回退到中文,再回退到 key 本身。
 */
export function useT(messages) {
  const key = useLocaleKey()
  return (k) => {
    const dict = messages[key.value] || messages.zh || {}
    const zh = messages.zh || {}
    return k in dict ? dict[k] : k in zh ? zh[k] : k
  }
}
