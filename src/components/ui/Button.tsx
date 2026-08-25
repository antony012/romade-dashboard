"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-zinc-950 text-white hover:bg-zinc-800 shadow-sm shadow-zinc-950/10",
  secondary:
    "bg-white/80 text-zinc-800 border border-zinc-200 hover:bg-white backdrop-blur",
  danger: "bg-red-600 text-white hover:bg-red-500 shadow-sm shadow-red-600/20",
  ghost: "bg-transparent text-zinc-600 hover:bg-zinc-100",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
