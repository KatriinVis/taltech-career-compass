

# Switch AI backend to Azure OpenAI (hackathon credentials)

Replace the Lovable AI Gateway calls in our three edge functions with Azure OpenAI calls using the hackathon-provided endpoint, key, and `gpt-5.4-nano` deployment.

## What changes

**1. Store the credentials as backend secrets** (never in frontend code)
Add two secrets to Lovable Cloud:
- `AZURE_OPENAI_API_KEY` = the provided key
- `AZURE_OPENAI_ENDPOINT` = `https://taltech-agent-hackathon-2026-20.openai.azure.com`

(Deployment name `gpt-5.4-nano` and API version `2025-01-01-preview` will be hardcoded constants in the functions — they're not secret.)

## How

**2. Update the three edge functions** — `supabase/functions/analyze-cv/index.ts`, `match-career/index.ts`, `coach/index.ts`.

Replace this Lovable Gateway pattern:
```
POST https://ai.gateway.lovable.dev/v1/chat/completions
Authorization: Bearer ${LOVABLE_API_KEY}
body: { model: "google/gemini-2.5-flash", messages, tools? }
```

With Azure OpenAI's chat completions pattern:
```
POST {AZURE_OPENAI_ENDPOINT}/openai/deployments/gpt-5.4-nano/chat/completions?api-version=2025-01-01-preview
api-key: ${AZURE_OPENAI_API_KEY}
body: { messages, tools?, tool_choice? }   // no `model` field — deployment is in the URL
```

Notes:
- The Azure REST API is OpenAI-compatible, so the existing `tools` / `tool_choice` blocks in `analyze-cv` and `match-career` keep working unchanged.
- Drop the `model` field from the request body (Azure ignores it; deployment is in the path).
- Auth header changes from `Authorization: Bearer …` to `api-key: …`.
- Keep all existing CORS headers, input validation, and error handling. Surface 429 (rate limit) and 402-equivalent errors as toasts (already done in `Career.tsx` / `Dashboard.tsx`).
- Keep `verify_jwt = false` in `supabase/config.toml` (already set).

## Budget safety

To stretch the $5 cap:
- `gpt-5.4-nano` is already the cheapest tier — keep it for all three functions (no Pro upgrade needed).
- Cap CV input at the existing 20,000 chars (already enforced in `analyze-cv`).
- No retry loops on failures — surface errors to user instead.

## Files touched

- `supabase/functions/analyze-cv/index.ts` — swap gateway → Azure
- `supabase/functions/match-career/index.ts` — swap gateway → Azure
- `supabase/functions/coach/index.ts` — swap gateway → Azure

No frontend, schema, or config.toml changes. The existing `Career.tsx`, `Onboarding.tsx`, and `Dashboard.tsx` continue calling the same edge functions with the same payloads.

## Approval needed before implementing

After you approve this plan I'll prompt you to add the two secrets (`AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`) via Lovable Cloud's secret tool, then update the three edge functions.

