import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMockVehicleEntries } from "@/lib/mock-data";

export async function GET() {
  if (!isSupabaseConfigured) {
    return Response.json({
      data: getMockVehicleEntries(),
      source: "mock",
    });
  }

  try {
    const { data, error } = await supabase
      .from("vehicle_entries")
      .select("*")
      .order("detected_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return Response.json({ data, source: "supabase" });
  } catch (err) {
    return Response.json(
      { error: err.message, data: getMockVehicleEntries(), source: "fallback" },
      { status: 200 }
    );
  }
}

export async function POST(request) {
  if (!isSupabaseConfigured) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("vehicle_entries")
      .insert(body)
      .select();

    if (error) throw error;

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
