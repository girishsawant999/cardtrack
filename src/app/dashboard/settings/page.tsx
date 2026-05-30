import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Mail,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  User,
} from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AccountActions } from "@/components/settings/account-actions";
import { getCurrentUser, getProfile } from "@/lib/data";
import { getInitials } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);

  const displayName =
    profile?.full_name ??
    (user.user_metadata?.["full_name"] as string | undefined) ??
    user.email ??
    "Account";
  const email = user.email ?? "—";

  const lastFetched = profile?.email_last_fetched_at
    ? new Date(profile.email_last_fetched_at).toLocaleString()
    : "Never";

  const settingGroups = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Profile",
          subtitle: email,
          href: "/dashboard/settings/profile",
        },
        {
          icon: Mail,
          label: "Gmail Connection",
          subtitle: profile?.gmail_connected
            ? `Connected • Last fetched ${lastFetched}`
            : "Not connected — sign in with Google to enable",
          href: "/dashboard/settings/gmail",
          badge: profile?.gmail_connected ? "Connected" : "Pending",
          badgeColor: profile?.gmail_connected
            ? "bg-primary/10 text-primary border-primary/20"
            : "bg-accent/40 text-accent-foreground border-accent/30",
        },
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          icon: Moon,
          label: "Appearance",
          subtitle: "Light, dark, or system default",
          action: "theme" as const,
        },
        {
          icon: Bell,
          label: "Notifications",
          subtitle: "Due date reminders, new bills",
          href: "/dashboard/settings/notifications",
        },
        {
          icon: Smartphone,
          label: "Install App",
          subtitle: "Add to home screen for quick access",
          href: "/dashboard/settings/install-app",
        },
      ],
    },
    {
      title: "Security",
      items: [
        {
          icon: Shield,
          label: "Privacy & Data",
          subtitle: "How we handle your email data",
          href: "/privacy",
        },
      ],
    },
  ];

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Account
            </p>
            <h1 className="text-[28px] leading-none font-extrabold mt-1 tracking-tight flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-primary" />
              Settings
            </h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-8">
        <Card className="surface-glass-card border-0 p-5 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="relative flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex items-center justify-center text-primary-foreground font-extrabold text-2xl ">
              {getInitials(displayName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground truncate tracking-tight">
                {displayName}
              </p>
              <p className="text-sm font-medium text-muted-foreground truncate">{email}</p>
            </div>
          </div>
        </Card>

        <div className="space-y-7">
          {settingGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.18em] mb-3 px-1.5">
                {group.title}
              </h3>
              <div className="surface-glass-card overflow-hidden">
                {group.items.map((item, i) => {
                  const content = (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover/item:bg-primary/10 group-hover/item:text-primary transition-colors">
                        <item.icon className="w-[18px] h-[18px] text-secondary-foreground group-hover/item:text-primary transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.label}
                        </p>
                        <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                      {"action" in item && item.action === "theme" ? (
                        <div>
                          <ThemeToggle />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {"badge" in item && item.badge && (
                            <Badge
                              variant="secondary"
                              className={`text-[9px] font-bold uppercase tracking-wider ${item.badgeColor}`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/item:text-primary transition-all group-hover/item:translate-x-1" />
                        </div>
                      )}
                    </>
                  );

                  const wrapperClassName = `flex items-center gap-4 px-4 py-3.5 ${
                    i > 0 ? "border-t border-border" : ""
                  } hover:bg-secondary/60 transition-colors duration-200 cursor-pointer group/item`;

                  return "href" in item && item.href ? (
                    <Link key={item.label} href={item.href} className={wrapperClassName}>
                      {content}
                    </Link>
                  ) : (
                    <div key={item.label} className={wrapperClassName}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <AccountActions />
      </div>
    </div>
  );
}
