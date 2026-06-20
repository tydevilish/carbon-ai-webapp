import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMockEmissionsTable } from "@/lib/mock-data";

export async function GET() {
  if (!isSupabaseConfigured) {
    // Return mock data when Supabase is not configured
    return Response.json({
      data: getMockEmissionsTable(),
      source: "mock",
    });
  }

  try {
    const { data, error } = await supabase
      .from("carbon_emissions")
      .select("*")
      .order("date", { ascending: false })
      .limit(30);

    if (error) throw error;

    return Response.json({ data, source: "supabase" });
  } catch (err) {
    return Response.json(
      { error: err.message, data: getMockEmissionsTable(), source: "fallback" },
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
      .from("carbon_emissions")
      .insert(body)
      .select();

    if (error) throw error;

    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
