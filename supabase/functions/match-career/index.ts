const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { extracted, interests = [], paths } = await req.json();
    if (!Array.isArray(paths) || paths.length === 0) {
      return new Response(JSON.stringify({ error: "paths required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPayload = {
      cv_summary: extracted?.summary ?? "",
      cv_skills: extracted?.skills ?? [],
      cv_experience: extracted?.experience ?? [],
      interests,
      candidate_paths: paths.map((p: any) => ({ id: p.id, name: p.name, skills: p.skills, description: p.description })),
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a TalTech career advisor. Rank the top 3-5 career paths for this student. Use explainable reasoning citing specific CV signals + interests. Be honest about gaps." },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "rank_paths",
            description: "Return top ranked career paths.",
            parameters: {
              type: "object",
              properties: {
                ranked: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      score: { type: "number", description: "0-100 match score" },
                      reasoning: { type: "string", description: "1-3 sentences explaining the match using CV+interests evidence." },
                      gaps: { type: "array", items: { type: "string" }, description: "Skills the student should build." },
                    },
                    required: ["id","name","score","reasoning","gaps"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["ranked"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "rank_paths" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: `AI ${resp.status}: ${t.slice(0,200)}` }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const json = await resp.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const out = args ? JSON.parse(args) : { ranked: [] };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});