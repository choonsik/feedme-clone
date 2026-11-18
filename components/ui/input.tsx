import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "iso-input h-10 w-full min-w-0 px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--iso-accent-top)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
