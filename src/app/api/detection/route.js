import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request) {
  if (!isSupabaseConfigured) {
    return Response.json({ 
      message: "Detection logged (mock mode — Supabase not configured)",
      source: "mock" 
    });
  }

  try {
    const body = await request.json();
    
    // body should contain: { object_type, object_class, carbon_kg, track_id, camera_id }
    const { data, error } = await supabase
      .from("detection_logs")
      .insert({
        detected_at: new Date().toISOString(),
        object_type: body.object_type,
        object_class: body.object_class,
        carbon_kg: body.carbon_kg,
        track_id: body.track_id,
        camera_id: body.camera_id || 1,
      })
      .select();

    if (error) throw error;

    return Response.json({ data, source: "supabase" });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
