const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { notes = "", risk = 0, career = null } = await req.json();
    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) throw new Error("Azure OpenAI not configured");
    const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/gpt-5.4-nano/chat/completions?api-version=2025-01-01-preview`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "api-key": AZURE_OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are an empathetic study coach for TalTech students. Reply in 3-5 sentences with a concrete next action." },
          { role: "user", content: `Career goal: ${career ?? "not chosen"}.\nRetention risk: ${risk}/100.\nStudent notes: ${notes}` },
        ],
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI ${resp.status}` }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await resp.json();
    const message = json.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});