const FUNCTION_NAME = "wa-discovery-memory";

export async function GET() {
  const supabaseUrl = process.env.AAB_SUPABASE_URL;
  const publishableKey = process.env.AAB_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return Response.json({ available: false, error: "Live discovery memory is not configured." });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        accept: "application/json",
      },
    });
    const payload = await response.json();
    if (!response.ok) {
      return Response.json({ available: false, error: "Live discovery memory could not be read." });
    }
    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ available: false, error: "Live discovery memory could not be reached." });
  }
}
