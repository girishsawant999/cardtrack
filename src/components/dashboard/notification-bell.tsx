"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/types/database";

interface NotificationBellProps {
  notifications: Notification[];
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative z-50">
      <button
        id="notifications-button"
        onClick={() => setOpen((v) => !v)}
        className="relative w-10 h-10 rounded-xl bg-card border border-border
          flex items-center justify-center
          hover:bg-primary/5 transition-colors duration-200"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-72 z-50 bg-card rounded-2xl border border-border overflow-hidden animate-slide-down origin-top-right">
            <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
              <h3 className="text-sm font-semibold text-foreground">
                Notifications
              </h3>
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center bg-card">
                <p className="text-xs font-medium text-muted-foreground">
                  You're all caught up.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30 max-h-80 overflow-y-auto bg-card">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`px-4 py-3 hover:bg-muted/30 transition-colors ${notif.is_read ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          notif.type === "warning"
                            ? "bg-destructive"
                            : notif.type === "new_card"
                              ? "bg-primary"
                              : "bg-green-500"
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {notif.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
