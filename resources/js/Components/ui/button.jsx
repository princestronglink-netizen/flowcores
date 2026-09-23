import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-clip-padding text-sm font-medium tracking-tight whitespace-nowrap transition-all duration-150 ease-out outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md focus-visible:ring-primary/40",
        outline:
          "border-border bg-background shadow-sm hover:border-foreground/30 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/30 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",

        // Palette: #bccad6 / #8d9db6 / #667292 / #f1e3dd
        // Flat primary — richer depth via layered shadow + subtle inner highlight.
        brand:
          "bg-[#667292] text-[#f1e3dd] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_1px_2px_rgba(58,65,87,0.35)] hover:bg-[#576284] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_2px_6px_rgba(58,65,87,0.45)] focus-visible:ring-[#8d9db6]/50 focus-visible:border-[#8d9db6]",
        // Secondary action — pale blue-gray fill, dark text.
        "brand-soft":
          "bg-[#bccad6] text-[#3a4157] shadow-sm hover:bg-[#a9bbcb] hover:shadow-md focus-visible:ring-[#8d9db6]/50 focus-visible:border-[#8d9db6]",
        // Outline variant, for tertiary actions.
        "brand-outline":
          "border-[#8d9db6] bg-[#f1e3dd]/40 text-[#667292] hover:border-[#667292] hover:bg-[#f1e3dd] focus-visible:ring-[#8d9db6]/50",
        // Tactile gradient — matches the login "Sign in" button and the
        // sidebar "Profile" button exactly: teal→slate fill with a
        // pressed-edge shadow that compresses on active state.
        "brand-gradient":
          "text-white bg-gradient-to-b from-[#8d9db6] to-[#667292] hover:from-[#7d8fab] hover:to-[#576284] shadow-[0_4px_0_0_#3a4157,0_6px_14px_-2px_rgba(102,114,146,0.5)] active:shadow-[0_1px_0_0_#3a4157,0_2px_4px_-1px_rgba(102,114,146,0.5)] focus-visible:ring-[#8d9db6]/50",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
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
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }