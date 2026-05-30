"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, Receipt, Settings } from "lucide-react";

function LinkProgress({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[3px] h-[2px] w-8 overflow-hidden rounded-full"
      style={{
        backgroundColor: active
          ? "color-mix(in oklab, var(--primary-foreground) 25%, transparent)"
          : "color-mix(in oklab, var(--muted-foreground) 18%, transparent)",
      }}
    >
      <span
        className="block h-full w-1/2 rounded-full"
        style={{
          backgroundColor: active
            ? "var(--primary-foreground)"
            : "var(--primary)",
          animation: "nav-progress 900ms cubic-bezier(0.4, 0, 0.2, 1) infinite",
        }}
      />
    </span>
  );
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/cards", label: "Cards", icon: CreditCard },
  { href: "/dashboard/bills", label: "Bills", icon: Receipt },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const PADDING = 6; // px — matches container px-1.5

export function BottomNav() {
  const pathname = usePathname();

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    )
  );

  const slotWidthPct = 100 / navItems.length;

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-md pointer-events-none px-2"
      style={{ paddingBottom: "var(--safe-area-bottom)" }}
    >
      <div
        className="relative pointer-events-auto bg-card border border-border rounded-full h-[68px] flex items-stretch"
        style={{ padding: PADDING }}
      >
        {/* Animated pill — fills the active slot exactly */}
        <span
          aria-hidden
          className="absolute top-[6px] bottom-[6px] rounded-full bg-brand-gradient will-change-transform"
          style={{
            width: `calc((100% - ${PADDING * 2}px) / ${navItems.length})`,
            left: PADDING,
            transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
            transition:
              "transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1)",
          }}
        />

        {navItems.map((item, i) => {
          const isActive = i === activeIndex;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative z-10 flex flex-col items-center justify-center gap-1 select-none"
              style={{ width: `${slotWidthPct}%` }}
            >
              <Icon
                className={`w-[20px] h-[20px] transition-colors duration-300 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                }`}
                strokeWidth={isActive ? 2.4 : 1.9}
              />
              <span
                className={`text-[10px] leading-none font-semibold tracking-wide transition-colors duration-300 ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground/80"
                }`}
              >
                {item.label}
              </span>
              <LinkProgress active={isActive} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
