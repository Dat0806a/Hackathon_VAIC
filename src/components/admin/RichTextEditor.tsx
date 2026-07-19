'use client'

/**
 * Lightweight rich-text editor (contenteditable) — bold, italic, underline,
 * strike, colors, highlight, lists, align, link, headings, undo/redo.
 * No heavy deps (works offline on Windows too).
 */

import { useCallback, useEffect, useRef } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  StrikethroughIcon,
  ListIcon,
  ListOrderedIcon,
  LinkIcon,
  Undo2Icon,
  Redo2Icon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  RemoveFormattingIcon,
  HighlighterIcon,
  Heading2Icon,
  Heading3Icon,
  QuoteIcon,
  CodeIcon,
  PilcrowIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COLORS = [
  '#111827',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ffffff',
]

const HIGHLIGHTS = [
  'transparent',
  '#fef08a',
  '#bbf7d0',
  '#bae6fd',
  '#ddd6fe',
  '#fecdd3',
  '#fed7aa',
]

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: number
}

function exec(cmd: string, value?: string) {
  try {
    document.execCommand(cmd, false, value)
  } catch {
    /* older browsers */
  }
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Viết thông báo…',
  className,
  minHeight = 180,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const lastHtml = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (value !== lastHtml.current && el.innerHTML !== value) {
      el.innerHTML = value || '<p></p>'
      lastHtml.current = value
    }
  }, [value])

  const emit = useCallback(() => {
    const el = ref.current
    if (!el) return
    const html = el.innerHTML
    lastHtml.current = html
    onChange(html)
  }, [onChange])

  const run = (cmd: string, val?: string) => {
    ref.current?.focus()
    exec(cmd, val)
    emit()
  }

  const setLink = () => {
    const url = window.prompt('URL', 'https://')
    if (!url) return
    run('createLink', url)
  }

  const Tool = ({
    onClick,
    title,
    children,
    active,
  }: {
    onClick: () => void
    title: string
    children: React.ReactNode
    active?: boolean
  }) => (
    <Button
      type="button"
      size="icon-sm"
      variant={active ? 'secondary' : 'ghost'}
      className="size-8 shrink-0"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
    >
      {children}
    </Button>
  )

  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-muted/30 p-1.5">
        <Tool title="Bold (Ctrl+B)" onClick={() => run('bold')}>
          <BoldIcon className="size-3.5" />
        </Tool>
        <Tool title="Italic (Ctrl+I)" onClick={() => run('italic')}>
          <ItalicIcon className="size-3.5" />
        </Tool>
        <Tool title="Underline (Ctrl+U)" onClick={() => run('underline')}>
          <UnderlineIcon className="size-3.5" />
        </Tool>
        <Tool title="Strikethrough" onClick={() => run('strikeThrough')}>
          <StrikethroughIcon className="size-3.5" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool title="Heading 2" onClick={() => run('formatBlock', 'h2')}>
          <Heading2Icon className="size-3.5" />
        </Tool>
        <Tool title="Heading 3" onClick={() => run('formatBlock', 'h3')}>
          <Heading3Icon className="size-3.5" />
        </Tool>
        <Tool title="Paragraph" onClick={() => run('formatBlock', 'p')}>
          <PilcrowIcon className="size-3.5" />
        </Tool>
        <Tool title="Quote" onClick={() => run('formatBlock', 'blockquote')}>
          <QuoteIcon className="size-3.5" />
        </Tool>
        <Tool title="Code block" onClick={() => run('formatBlock', 'pre')}>
          <CodeIcon className="size-3.5" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool title="Bullet list" onClick={() => run('insertUnorderedList')}>
          <ListIcon className="size-3.5" />
        </Tool>
        <Tool title="Numbered list" onClick={() => run('insertOrderedList')}>
          <ListOrderedIcon className="size-3.5" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool title="Align left" onClick={() => run('justifyLeft')}>
          <AlignLeftIcon className="size-3.5" />
        </Tool>
        <Tool title="Align center" onClick={() => run('justifyCenter')}>
          <AlignCenterIcon className="size-3.5" />
        </Tool>
        <Tool title="Align right" onClick={() => run('justifyRight')}>
          <AlignRightIcon className="size-3.5" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <Tool title="Link" onClick={setLink}>
          <LinkIcon className="size-3.5" />
        </Tool>
        <Tool title="Clear formatting" onClick={() => run('removeFormat')}>
          <RemoveFormattingIcon className="size-3.5" />
        </Tool>
        <Tool title="Undo" onClick={() => run('undo')}>
          <Undo2Icon className="size-3.5" />
        </Tool>
        <Tool title="Redo" onClick={() => run('redo')}>
          <Redo2Icon className="size-3.5" />
        </Tool>
        <span className="mx-1 h-5 w-px bg-border" />
        <div className="flex items-center gap-1 px-1" title="Text color">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="size-4 rounded-full border border-border shadow-sm"
              style={{ background: c }}
              onMouseDown={(e) => {
                e.preventDefault()
                run('foreColor', c)
              }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 px-1" title="Highlight">
          <HighlighterIcon className="size-3.5 text-muted-foreground" />
          {HIGHLIGHTS.map((c) => (
            <button
              key={c}
              type="button"
              className="size-4 rounded border border-border"
              style={{
                background:
                  c === 'transparent'
                    ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 8px 8px'
                    : c,
              }}
              onMouseDown={(e) => {
                e.preventDefault()
                run('hiliteColor', c === 'transparent' ? 'transparent' : c)
                // fallback
                if (c !== 'transparent') run('backColor', c)
              }}
              aria-label={`Highlight ${c}`}
            />
          ))}
        </div>
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline
        data-placeholder={placeholder}
        className={cn(
          'nf-rich-editor prose prose-sm dark:prose-invert max-w-none px-3 py-2.5 text-sm outline-none',
          'focus-visible:ring-0',
          '[&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground [&:empty]:before:content-[attr(data-placeholder)]',
        )}
        style={{ minHeight }}
        onInput={emit}
        onBlur={emit}
        suppressContentEditableWarning
      />
    </div>
  )
}
