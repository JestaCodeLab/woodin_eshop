import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

/**
 * The "nothing here yet" card: an icon, a short heading, one line of explanation and the obvious next step.
 * Give the button either `href` (a link) or `onClick` (an action on the page).
 */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
  action: { label: string; href: string } | { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-4 border border-line bg-white px-6 py-14 text-center sm:py-16">
      <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-brown">
        <Icon size={28} strokeWidth={1.3} />
      </span>
      <h3 className="m-0 font-display text-[26px] font-normal leading-tight text-brown">{title}</h3>
      <p className="m-0 max-w-[420px] text-[15px] font-light leading-relaxed text-body">{children}</p>
      <div className="mt-2">
        {"href" in action ? <Button href={action.href}>{action.label}</Button> : <Button onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  );
}
