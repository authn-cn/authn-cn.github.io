import { defineClientConfig } from 'vuepress/client'

// 首次访问根路径时,按浏览器语言跳转到对应语言版本(每个会话只跳一次,
// 这样用户手动切回中文根路径不会被反复重定向)。
export default defineClientConfig({
  setup() {
    if (typeof window === 'undefined') return
    try {
      const path = window.location.pathname
      if (path !== '/' && path !== '/index.html') return
      if (sessionStorage.getItem('authn-lang-redirected')) return
      sessionStorage.setItem('authn-lang-redirected', '1')
      const lang = (navigator.language || '').toLowerCase()
      if (lang.startsWith('de')) window.location.replace('/de/')
      else if (lang.startsWith('en')) window.location.replace('/en/')
      // 其余(含 zh)留在中文根路径
    } catch {
      /* 忽略:sessionStorage/navigator 不可用时不跳转 */
    }
  },
})
