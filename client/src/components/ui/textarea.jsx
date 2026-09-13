import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content min-h-16 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 transition outline-none placeholder:text-slate-400 focus:border-gold focus:ring-2 focus:ring-gold/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
