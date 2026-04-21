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
    const AZURE_OPENAI_API_KEY = Deno.env.get("AZURE_OPENAI_API_KEY");
    const AZURE_OPENAI_ENDPOINT = Deno.env.get("AZURE_OPENAI_ENDPOINT");
    if (!AZURE_OPENAI_API_KEY || !AZURE_OPENAI_ENDPOINT) throw new Error("Azure OpenAI not configured");
    const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/gpt-5.4-nano/chat/completions?api-version=2025-01-01-preview`;

    const userPayload = {
      cv_summary: extracted?.summary ?? "",
      cv_skills: extracted?.skills ?? [],
      cv_experience: extracted?.experience ?? [],
      interests,
      candidate_paths: paths.map((p: any) => ({ id: p.id, name: p.name, skills: p.skills, description: p.description })),
    };

    const resp = await fetch(url, {
      method: "POST",
      headers: { "api-key": AZURE_OPENAI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a TalTech career advisor. Rank the top 3-5 career paths for this student. Use explainable reasoning citing specific CV signals + interests. Be honest about gaps. ALWAYS write in English, even if the CV, interests, or any other input is in Estonian or another language — translate everything to English before writing. Address the user directly as 'you' / 'your' (e.g. 'You already have…', 'You still need…', 'Your background in…'). NEVER use third-person ('the student', 'the candidate', 'Katriin', or any person's name). Gaps must be short English skill names like 'SQL', 'Statistics', 'Public speaking' — never Estonian, never full sentences." },
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
                      reasoning: { type: "string", description: "1-3 sentences in English, addressing the user as 'you', explaining the match using CV+interests evidence." },
                      gaps: { type: "array", items: { type: "string", description: "Short English skill label (e.g. 'SQL', 'Public speaking', 'Distributed systems'). Never use Estonian, never full sentences." }, description: "Skills you still need to build, as short English skill names." },
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