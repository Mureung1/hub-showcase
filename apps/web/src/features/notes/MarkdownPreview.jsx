import { Fragment } from 'react'

function inline(text, keyPrefix) {
  const tokens = text.split(/(\*\*.+?\*\*|\*.+?\*|`.+?`)/g).filter(Boolean)
  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={key}>{token.slice(2, -2)}</strong>
    if (token.startsWith('*') && token.endsWith('*')) return <em key={key}>{token.slice(1, -1)}</em>
    if (token.startsWith('`') && token.endsWith('`')) return <code key={key}>{token.slice(1, -1)}</code>
    return <Fragment key={key}>{token}</Fragment>
  })
}

export function MarkdownPreview({ content }) {
  const lines = content.split('\n')
  const elements = []
  let list = []
  let listType = null

  function flushList() {
    if (list.length === 0) return
    const Tag = listType === 'ordered' ? 'ol' : 'ul'
    elements.push(<Tag key={`list-${elements.length}`}>{list.map((item, index) => <li key={`${item}-${index}`}>{inline(item, `list-${elements.length}-${index}`)}</li>)}</Tag>)
    list = []
    listType = null
  }

  lines.forEach((line, index) => {
    const ordered = line.match(/^\d+\.\s(.+)/)
    const unordered = line.match(/^[-*]\s(.+)/)
    if (ordered || unordered) {
      const nextType = ordered ? 'ordered' : 'unordered'
      if (listType && listType !== nextType) flushList()
      listType = nextType
      list.push((ordered ?? unordered)[1])
      return
    }

    flushList()
    if (!line.trim()) return elements.push(<div className="markdown-spacer" key={`space-${index}`} />)
    if (line.startsWith('### ')) return elements.push(<h3 key={index}>{inline(line.slice(4), `h3-${index}`)}</h3>)
    if (line.startsWith('## ')) return elements.push(<h2 key={index}>{inline(line.slice(3), `h2-${index}`)}</h2>)
    if (line.startsWith('# ')) return elements.push(<h1 key={index}>{inline(line.slice(2), `h1-${index}`)}</h1>)
    if (line.startsWith('> ')) return elements.push(<blockquote key={index}>{inline(line.slice(2), `quote-${index}`)}</blockquote>)
    elements.push(<p key={index}>{inline(line, `p-${index}`)}</p>)
  })
  flushList()
  return <div className="markdown-preview">{elements}</div>
}
