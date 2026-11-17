import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant =
  | "primary" // brown fill
  | "outline" // ink outline
  | "outline-brown"
  | "outline-light" // ivory outline on dark bands
  | "ivory" // ivory fill on brown
  | "gold"; // gold fill (Bold Fusion tile)

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brown text-ivory hover:bg-[#3a1307]",
  outline: "border border-ink text-ink hover:bg-ink hover:text-ivory",
  "outline-brown": "border border-brown text-brown hover:bg-brown hover:text-ivory",
  "outline-light": "border border-ivory text-ivory hover:bg-ivory hover:text-brown",
  ivory: "bg-ivory text-brown hover:bg-white",
  gold: "bg-gold-btn font-semibold text-ink hover:brightness-95",
};

const base =
  "label-caps inline-flex items-center justify-center text-center no-underline transition-colors";

type CommonProps = {
  variant?: ButtonVariant;
  /** md = 16px/30px padding, lg = 58px tall full-width style used for CTAs. */
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

type LinkButtonProps = CommonProps & { href: string } & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;
type NativeButtonProps = CommonProps & { href?: undefined } & Omit<ComponentProps<"button">, "className" | "children">;

/** Square, uppercase, tracked button. Renders a <Link> when `href` is given, otherwise a <button>. */
export function Button(props: LinkButtonProps | NativeButtonProps) {
  const { variant = "primary", size = "md", className = "", children, ...rest } = props;
  const cls = `${base} ${variants[variant]} ${size === "lg" ? "h-[58px] px-8" : "px-7 py-4 md:px-[30px]"} ${className}`;

  if (rest.href !== undefined) {
    return (
      <Link {...(rest as Omit<LinkButtonProps, keyof CommonProps>)} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" {...(rest as Omit<NativeButtonProps, keyof CommonProps>)} className={cls}>
      {children}
    </button>
  );
}
