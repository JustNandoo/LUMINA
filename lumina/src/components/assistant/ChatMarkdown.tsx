import { Fragment, useMemo } from 'react'
import { parseChatMarkdown } from '../../lib/chatMarkdown'
import type { InlineToken } from '../../lib/chatMarkdown'

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'bold':
        return (
          <strong key={index} className="font-semibold text-white">
            {token.value}
          </strong>
        )
      case 'italic':
        return (
          <em key={index} className="italic">
            {token.value}
          </em>
        )
      case 'code':
        return (
          <code key={index} className="rounded bg-navy-900/70 px-1 py-px text-[12px] text-brand-cyan">
            {token.value}
          </code>
        )
      default:
        return <Fragment key={index}>{token.value}</Fragment>
    }
  })
}

type ChatMarkdownProps = {
  content: string
}

/** Balasan asisten dengan tebal, miring, dan daftar yang benar-benar terformat. */
function ChatMarkdown({ content }: ChatMarkdownProps) {
  const blocks = useMemo(() => parseChatMarkdown(content), [content])

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === 'bullets') {
          return (
            <ul key={index} className="list-disc space-y-1 pl-4 marker:text-brand-cyan">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline tokens={item} />
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'numbered') {
          return (
            <ol
              key={index}
              start={block.start}
              className="list-decimal space-y-1 pl-4 marker:font-semibold marker:text-brand-cyan"
            >
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <Inline tokens={item} />
                </li>
              ))}
            </ol>
          )
        }

        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Inline tokens={line} />
              </Fragment>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export default ChatMarkdown
