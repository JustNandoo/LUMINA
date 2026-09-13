/**
 * Markdown sederhana untuk balasan Lumina AI.
 *
 * Prompt backend membatasi model pada **tebal**, *miring*, daftar berpoin, dan
 * daftar bernomor, jadi cukup subset itu yang dikenali. Hasilnya berupa token,
 * bukan string HTML: komponen merender token menjadi elemen React, sehingga
 * teks dari model tidak pernah disuntikkan sebagai HTML.
 */

export type InlineToken = {
  type: 'text' | 'bold' | 'italic' | 'code'
  value: string
}

export type ChatBlock =
  | { type: 'paragraph'; lines: InlineToken[][] }
  | { type: 'bullets'; items: InlineToken[][] }
  | { type: 'numbered'; start: number; items: InlineToken[][] }

// Urutan alternatif penting: `**` dicoba sebelum `*`, supaya tebal tidak
// terbaca sebagai dua miring berdempetan.
const INLINE = /\*\*(.+?)\*\*|__(.+?)__|`([^`]+)`|\*(?!\s)(.+?)(?<!\s)\*/g

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  let cursor = 0

  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ type: 'text', value: text.slice(cursor, index) })

    const [, bold, underscoreBold, code, italic] = match
    if (bold !== undefined || underscoreBold !== undefined) {
      tokens.push({ type: 'bold', value: bold ?? underscoreBold })
    } else if (code !== undefined) {
      tokens.push({ type: 'code', value: code })
    } else {
      tokens.push({ type: 'italic', value: italic })
    }
    cursor = index + match[0].length
  }

  if (cursor < text.length) tokens.push({ type: 'text', value: text.slice(cursor) })
  return tokens
}

const BULLET = /^[-*•]\s+(.*)$/
const NUMBERED = /^(\d+)[.)]\s+(.*)$/
const HEADING = /^#{1,6}\s+(.*)$/

export function parseChatMarkdown(content: string): ChatBlock[] {
  const blocks: ChatBlock[] = []
  let current: ChatBlock | null = null

  for (const raw of content.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()

    // Baris kosong memisahkan paragraf dan mengakhiri daftar.
    if (!line) {
      if (current) blocks.push(current)
      current = null
      continue
    }

    const bullet = line.match(BULLET)
    if (bullet) {
      if (current?.type !== 'bullets') {
        if (current) blocks.push(current)
        current = { type: 'bullets', items: [] }
      }
      current.items.push(parseInline(bullet[1]))
      continue
    }

    const numbered = line.match(NUMBERED)
    if (numbered) {
      if (current?.type !== 'numbered') {
        if (current) blocks.push(current)
        current = { type: 'numbered', start: Number(numbered[1]), items: [] }
      }
      current.items.push(parseInline(numbered[2]))
      continue
    }

    // Judul dilarang oleh prompt; kalau tetap muncul, tampilkan sebagai teks
    // tebal alih-alih memperlihatkan tanda pagarnya.
    const heading = line.match(HEADING)
    const text = heading ? `**${heading[1]}**` : line

    if (current?.type !== 'paragraph') {
      if (current) blocks.push(current)
      current = { type: 'paragraph', lines: [] }
    }
    current.lines.push(parseInline(text))
  }

  if (current) blocks.push(current)
  return blocks
}
