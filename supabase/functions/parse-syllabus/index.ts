const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { raw_text } = await req.json();
    if (!raw_text || typeof raw_text !== "string" || raw_text.length < 30 || raw_text.length > 50000) {
      return new Response(JSON.stringify({ error: "raw_text must be 30..50000 chars" }), {
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
          { role: "system", content: "You parse TalTech course syllabi (ainekava) in Estonian or English. Extract structured data. Use lowercase kebab-case skill tags (e.g. 'python','machine-learning','entrepreneurship'). Preserve original Estonian or English text for names, outcomes and topics." },
          { role: "user", content: raw_text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_syllabus",
            description: "Return structured syllabus data.",
            parameters: {
              type: "object",
              properties: {
                code: { type: "string", description: "Course code, e.g. TMJ0140" },
                name_et: { type: "string" },
                name_en: { type: "string" },
                ects: { type: "number" },
                semester: { type: "string", description: "e.g. 'sügis', 'kevad', 'sügis-kevad'" },
                assessment: { type: "string", description: "e.g. 'eksam', 'arvestus'" },
                language: { type: "array", items: { type: "string" } },
                prerequisites: { type: "array", items: { type: "string" } },
                learning_outcomes: { type: "array", items: { type: "string" } },
                topics: { type: "array", items: { type: "string" } },
                workload: {
                  type: "object",
                  properties: {
                    lectures: { type: "number" },
                    practicals: { type: "number" },
                    seminars: { type: "number" },
                    independent: { type: "number" },
                  },
                  additionalProperties: true,
                },
                skills: { type: "array", items: { type: "string" } },
              },
              required: ["code", "name_et", "ects", "learning_outcomes", "topics", "skills"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_syllabus" } },
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