import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  secondary: "bg-secondary-container text-on-secondary-container hover:opacity-90",
  outline: "border border-outline text-primary hover:bg-surface-container-low",
  ghost: "text-primary hover:bg-surface-container-low"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-md py-xs text-body-sm",
  md: "px-lg py-xs text-headline-sm",
  lg: "px-xl py-md text-headline-sm"
};

export function Button({
  children,
  className = "",
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-xs rounded-lg font-headline-sm transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className
      ].join(" ")}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
