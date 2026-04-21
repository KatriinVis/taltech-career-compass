const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { raw_text } = await req.json();
    if (!raw_text || typeof raw_text !== "string" || raw_text.length < 30 || raw_text.length > 20000) {
      return new Response(JSON.stringify({ error: "raw_text must be 30..20000 chars" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) throw new Error("Azure OpenAI not configured");
    const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/gpt-5.4-nano/chat/completions?api-version=2025-01-01-preview`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "api-key": AZURE_OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "Extract structured info from a student's CV. Be concise. Use lowercase kebab-case skill tags (e.g. 'python','machine-learning','sql'). Always write `summary`, `experience`, `education`, and `interests` in English, even if the CV is in another language. Translate Estonian (or any non-English) content to English before returning." },
          { role: "user", content: raw_text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_cv",
            description: "Return structured CV data.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "1-2 sentence summary." },
                skills: { type: "array", items: { type: "string" } },
                experience: { type: "array", items: { type: "string" } },
                education: { type: "array", items: { type: "string" } },
                interests: { type: "array", items: { type: "string" } },
              },
              required: ["summary","skills","experience","education","interests"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_cv" } },
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
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const extracted = args ? JSON.parse(args) : {};
    return new Response(JSON.stringify({ extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});