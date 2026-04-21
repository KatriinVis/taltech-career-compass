

# Switch career page copy to second-person English ("you" form)

Update user-facing strings on the Career page to address the user directly in English, using "you/your" phrasing.

## Changes in `src/pages/Career.tsx`

- Page subtitle:
  - From: "Map your CV and interests to ranked career paths — with explainable reasoning."
  - To: "You can map your CV and interests to ranked career paths — with clear reasoning you can follow."
- Card title "Your CV" → keep (already second-person).
- Upload helper text "or paste below" → "or paste yours below".
- Textarea placeholder "Paste your CV text here…" → "Paste your CV text here so we can analyze it…".
- Toasts:
  - "We ranked the best career paths for you." → "Here are the best career paths for you, ranked."
  - "Timetable updated with recommended courses." → "Your timetable is updated with the recommended courses."
  - "CV loaded" description → "We extracted {n} characters from {file}. Click 'Run AI analysis' when you're ready."
- Section heading "Closing your career gap" → "Closing your career gap" (already fine; add second-person sub-line in `CardContent` above the existing "Choose your goal" h2 area — actually keep card title, no change).
- Section heading "Choose your goal" → "Choose your goal" (imperative second-person, already fine).
- Small labels:
  - "Gaps to close" → "Gaps you should close"
  - "Recommended courses" → "Courses we recommend for you"
- Selected toast: `Selected ${r.name}` → `You picked ${r.name}`.

No logic, layout, or component changes — text only. No other files touched.

