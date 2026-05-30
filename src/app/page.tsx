import { redirect } from "next/navigation";

export default function HomePage() {
  // For now, redirect to dashboard (or login)
  redirect("/dashboard");
}
