import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are MESA.I, the in-app assistant for a university student.
You help with their schedule, deadlines, course catalog, CV and career path.

Use the provided tools to fetch real data — do NOT invent courses, deadlines, or events.
Be concise. Use markdown lists for schedules and deadlines.
When the user asks to add a course or change their CV, call the corresponding tool.
The UI will show a confirmation card before write tools actually run.
Today's date (UTC) is ${new Date().toISOString().slice(0, 10)}.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_schedule",
      description: "Get the user's scheduled events (classes + one-offs) between two ISO dates. Defaults to next 7 days.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "ISO date, inclusive" },
          to: { type: "string", description: "ISO date, exclusive" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_deadlines",
      description: "Get upcoming deadlines/assignments between two ISO dates. Defaults to next 14 days.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string" },
          to: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_courses",
      description: "Search the course catalog by free text. Optionally filter by faculty or level.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          faculty: { type: "string" },
          level: { type: "string" },
          limit: { type: "number", description: "Max results, default 8" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_course_to_plan",
      description: "Add a catalog course (by code) to the user's programme plan. Requires user confirmation in the UI.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string" },
        },
        required: ["code"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_to_cv",
      description: "Append a bullet/line to the user's latest CV under a section (e.g. 'experience', 'skills', 'education'). Requires user confirmation in the UI.",
      parameters: {
        type: "object",
        properties: {
          section: { type: "string" },
          text: { type: "string" },
        },
        required: ["section", "text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_career_status",
      description: "Read the user's latest career plan (selected path, ranking, reasoning).",
      parameters: { type: "object", properties: {} },
    },
  },
];

// Tools that mutate data — UI must confirm before we run them.
const WRITE_TOOLS = new Set(["add_course_to_plan", "append_to_cv"]);

function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

async function runTool(name: string, args: Record<string, unknown>, supabase: ReturnType<typeof createClient>, userId: string) {
  try {
    if (name === "get_schedule") {
      const from = (args.from as string) || new Date().toISOString();
      const to = (args.to as string) || daysFromNow(7);
      const { data, error } = await supabase
        .from("schedule_events")
        .select("title,kind,day_of_week,start_time,end_time,starts_at,ends_at,course_code")
        .eq("user_id", userId)
        .or(`starts_at.gte.${from},day_of_week.not.is.null`)
        .limit(200);
      if (error) throw error;
      const filtered = (data ?? []).filter((e: any) => {
        if (e.starts_at) return e.starts_at >= from && e.starts_at < to;
        return e.day_of_week != null;
      });
      return { from, to, events: filtered };
    }
    if (name === "get_deadlines") {
      const from = (args.from as string) || new Date().toISOString();
      const to = (args.to as string) || daysFromNow(14);
      const { data, error } = await supabase
        .from("schedule_events")
        .select("title,kind,starts_at,ends_at,course_code")
        .eq("user_id", userId)
        .in("kind", ["deadline", "assignment", "exam"])
        .gte("starts_at", from)
        .lt("starts_at", to)
        .order("starts_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return { from, to, deadlines: data ?? [] };
    }
    if (name === "search_courses") {
      const q = String(args.query ?? "");
      const faculty = args.faculty as string | undefined;
      const level = args.level as string | undefined;
      const limit = Math.min(Number(args.limit ?? 8), 20);
      let query = supabase
        .from("courses")
        .select("code,name,name_en,ects,faculty,level,semester,source,day,start,end")
        .limit(limit);
      if (q) query = query.or(`name.ilike.%${q}%,name_en.ilike.%${q}%,code.ilike.%${q}%`);
      if (faculty) query = query.eq("faculty", faculty);
      if (level) query = query.eq("level", level);
      const { data, error } = await query;
      if (error) throw error;
      return { results: data ?? [] };
    }
    if (name === "add_course_to_plan") {
      const code = String(args.code ?? "").trim();
      if (!code) return { error: "code required" };
      const { data: course, error: cErr } = await supabase
        .from("courses")
        .select("code,name,ects,semester,assessment,learning_outcomes")
        .eq("code", code)
        .maybeSingle();
      if (cErr) throw cErr;
      if (!course) return { error: `Course ${code} not found` };
      const { error: insErr } = await supabase.from("user_courses").insert({
        user_id: userId,
        code: course.code,
        name: course.name,
        ects: course.ects,
        semester: course.semester,
        assessment: course.assessment,
        learning_outcomes: course.learning_outcomes,
        status: "planned",
      });
      if (insErr) throw insErr;
      return { ok: true, added: { code: course.code, name: course.name } };
    }
    if (name === "append_to_cv") {
      const section = String(args.section ?? "notes");
      const text = String(args.text ?? "").trim();
      if (!text) return { error: "text required" };
      const { data: latest } = await supabase
        .from("cv_uploads")
        .select("id,raw_text")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const addition = `\n\n[${section.toUpperCase()}] ${text}`;
      if (latest?.id) {
        const newText = (latest.raw_text ?? "") + addition;
        const { error: uErr } = await supabase
          .from("cv_uploads")
          .update({ raw_text: newText })
          .eq("id", latest.id);
        if (uErr) throw uErr;
        return { ok: true, cv_id: latest.id, appended: addition };
      }
      const { data: created, error: iErr } = await supabase
        .from("cv_uploads")
        .insert({ user_id: userId, raw_text: addition.trim() })
        .select("id")
        .single();
      if (iErr) throw iErr;
      return { ok: true, cv_id: created.id, created: true };
    }
    if (name === "get_career_status") {
      const { data, error } = await supabase
        .from("career_plans")
        .select("selected_path,reasoning,ranked,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? { empty: true };
    }
    return { error: `Unknown tool: ${name}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const incoming: Array<{ role: string; content: string }> = body.messages ?? [];
    const confirmedWrites: Array<{ name: string; arguments: Record<string, unknown> }> = body.confirmed_writes ?? [];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Run any pre-confirmed writes first and inject results as a system note.
    const preToolNotes: string[] = [];
    for (const w of confirmedWrites) {
      const res = await runTool(w.name, w.arguments ?? {}, supabase, userId);
      preToolNotes.push(`Confirmed ${w.name}(${JSON.stringify(w.arguments)}) → ${JSON.stringify(res)}`);
    }

    // Build conversation. We loop until the model returns a final message
    // (no tool call), or until we hit a write-tool that needs UI confirmation.
    type ChatMsg = any;
    const messages: ChatMsg[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(preToolNotes.length
        ? [{ role: "system", content: "Recent confirmed actions:\n" + preToolNotes.join("\n") }]
        : []),
      ...incoming,
    ];

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (obj: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        };
        try {
          for (let hop = 0; hop < 6; hop++) {
            // Non-streaming call so we can fully resolve tool loops.
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages,
                tools,
              }),
            });
            if (!aiResp.ok) {
              if (aiResp.status === 429) {
                send({ type: "error", message: "Rate limit hit, please try again shortly." });
              } else if (aiResp.status === 402) {
                send({ type: "error", message: "AI credits exhausted. Add funds in workspace settings." });
              } else {
                const t = await aiResp.text();
                console.error("AI gateway error", aiResp.status, t);
                send({ type: "error", message: "AI gateway error" });
              }
              break;
            }
            const json = await aiResp.json();
            const choice = json.choices?.[0];
            const msg = choice?.message;
            if (!msg) {
              send({ type: "error", message: "Empty AI response" });
              break;
            }

            const toolCalls = msg.tool_calls ?? [];
            if (toolCalls.length === 0) {
              const content: string = msg.content ?? "";
              if (content) send({ type: "delta", text: content });
              send({ type: "done" });
              break;
            }

            // Push assistant message with tool_calls so the next turn matches the role contract.
            messages.push(msg);

            // Detect any write tool — if so, ask UI for confirmation and stop the loop.
            const writeCalls = toolCalls.filter((tc: any) => WRITE_TOOLS.has(tc.function?.name));
            if (writeCalls.length > 0) {
              const pending = writeCalls.map((tc: any) => ({
                id: tc.id,
                name: tc.function.name,
                arguments: safeParse(tc.function.arguments),
              }));
              send({ type: "confirm", pending });
              send({ type: "done" });
              break;
            }

            // Execute read-only tools and feed back.
            for (const tc of toolCalls) {
              const name = tc.function?.name;
              const args = safeParse(tc.function?.arguments);
              const result = await runTool(name, args, supabase, userId);
              send({ type: "tool", name, result });
              messages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
          }
        } catch (e) {
          console.error("assistant error", e);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", message: e instanceof Error ? e.message : "Unknown error" })}\n\n`),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function safeParse(s: unknown): Record<string, unknown> {
  if (typeof s !== "string") return (s as any) ?? {};
  try { return JSON.parse(s); } catch { return {}; }
}