import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMockEnergyDetail } from "@/lib/mock-data";

export async function GET() {
  if (!isSupabaseConfigured) {
    return Response.json({
      data: getMockEnergyDetail(),
      source: "mock",
    });
  }

  try {
    const { data, error } = await supabase
      .from("energy_usage")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);

    if (error) throw error;

    return Response.json({ data, source: "supabase" });
  } catch (err) {
    return Response.json(
      { error: err.message, data: getMockEnergyDetail(), source: "fallback" },
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
      .from("energy_usage")
      .insert(body)
      .select();

    if (error) throw error;

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
