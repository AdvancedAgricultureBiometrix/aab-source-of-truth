const FUNCTION_NAME = "wa-area-investigations";

async function proxy(request: Request, method: "GET" | "POST") {
  const supabaseUrl = process.env.AAB_SUPABASE_URL;
  const publishableKey = process.env.AAB_SUPABASE_PUBLISHABLE_KEY;
  const areaKey = request.headers.get("x-aab-area-key");

  if (!supabaseUrl || !publishableKey) {
    return Response.json({ error: "Persistent investigation memory is not configured." }, { status: 503 });
  }
  if (!areaKey) return Response.json({ error: "Area recovery key is missing." }, { status: 401 });

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${FUNCTION_NAME}`, {
      method,
      headers: {
        apikey: publishableKey,
        authorization: `Bearer ${publishableKey}`,
        "content-type": "application/json",
        "x-aab-area-key": areaKey,
      },
      body: method === "POST" ? await request.text() : undefined,
    });
    const payload = await response.json();
    return Response.json(payload, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Persistent investigation memory could not be reached." }, { status: 502 });
  }
}

export async function GET(request: Request) {
  return proxy(request, "GET");
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return Response.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  return proxy(request, "POST");
}
