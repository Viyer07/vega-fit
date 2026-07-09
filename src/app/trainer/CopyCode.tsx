'use client'

import { useState } from 'react'

export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="mt-2 flex items-center gap-3">
      <code className="rounded-lg bg-card2 px-3 py-2 text-sm text-foreground">{code}</code>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="text-sm font-medium text-accent"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  )
}
