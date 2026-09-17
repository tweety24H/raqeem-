import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }) {
  return (
    <label
      data-slot="label"
      className={cn(
        "mb-1 block text-sm font-medium text-slate-600 select-none dark:text-slate-300",
        className
      )}
      {...props}
    />
  )
}

export { Label }
