// Lightweight syntax highlighting (core + 3 grammars only).
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)

const alias = { html: 'xml', vue: 'xml', js: 'javascript' }

// hljs escapes the source, so the returned string is safe for v-html.
export function highlight(code, language) {
  const lang = alias[language] || language
  try {
    if (lang && hljs.getLanguage(lang)) return hljs.highlight(code, { language: lang }).value
  } catch {
    /* fall through */
  }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
