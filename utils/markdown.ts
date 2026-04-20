// utils/markdown.ts
// Shared lightweight markdown-to-HTML renderer.
// Supports bold, italic, links, and bullet lists.

export function renderMarkdown(text: string): string {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const lines = escaped.split('\n')
  let result = ''
  let inList = false
  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inList) { result += '<ul style="list-style-type:disc;padding-left:1.25rem;margin:0.25rem 0;">'; inList = true }
      result += `<li>${line.slice(2)}</li>`
    } else {
      if (inList) { result += '</ul>'; inList = false }
      result += line + '\n'
    }
  }
  if (inList) result += '</ul>'
  return result
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#0077C8;text-decoration:underline;">$1</a>')
    .replace(/\n/g, '<br/>')
}
