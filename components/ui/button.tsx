import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// 아이소매트릭 블록 버튼(docs/decisions/visual-language.md). 누르면 블록이 눌려 들어간다.
const block =
  "iso-block [--d:5px] mr-[5px] mb-[3px] hover:brightness-105 active:translate-x-1 active:translate-y-0.5 active:[--d:1px]"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap cursor-pointer outline-none select-none transition-transform focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--iso-accent-top)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: `${block} iso-accent`,
        outline: block,
        secondary: `${block} iso-info`,
        destructive: `${block} iso-warn`,
        // 프롬프트 선택 칩. aria-pressed가 true면 민트색으로 눌린 모양이 된다.
        chip: "iso-block iso-chip [--d:4px] mr-1 mb-0.5 hover:brightness-105",
        ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-1.5 px-4 text-sm font-bold",
        xs: "h-6 gap-1 px-2 text-xs font-bold",
        sm: "h-8 gap-1 px-3 text-xs font-bold",
        lg: "h-10 gap-1.5 px-4 text-sm font-bold",
        chip: "h-[34px] px-3.5 text-[13px] font-semibold",
        icon: "size-10",
        "icon-xs": "size-6",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
