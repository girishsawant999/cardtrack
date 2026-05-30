import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getCurrentUser();
    const supabase = await createClient();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Demo data seeding removed
    return NextResponse.json({ success: true, message: "No demo data seeded." });
  } catch (error) {
    console.error("Error seeding data:", error);
    return NextResponse.json(
      { error: "Failed to seed data" },
      { status: 500 }
    );
  }
}
