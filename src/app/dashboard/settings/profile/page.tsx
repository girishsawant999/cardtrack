import Link from "next/link";
import { ArrowLeft, User } from "lucide-react";
import { getCurrentUser, getProfile } from "@/lib/data";
import { ProfileForm } from "@/components/settings/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);

  return (
    <div className="pb-28 animate-fade-in relative z-10">
      <header className="page-header">
        <Link href="/dashboard/settings" className="inline-flex items-center text-xs text-muted-foreground gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to settings
        </Link>
        <h1 className="text-[28px] leading-none font-extrabold mt-3 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          Profile
        </h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        <p className="text-sm text-muted-foreground">Manage your profile details used across your account.</p>
        <ProfileForm
          initialFullName={
            profile?.full_name ??
            ((user.user_metadata?.["full_name"] as string | undefined) ?? "")
          }
          initialAvatarUrl={profile?.avatar_url ?? ""}
        />
      </div>
    </div>
  );
}
