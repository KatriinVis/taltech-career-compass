

# Show all upcoming items by default on Timetable

Currently the "All upcoming items" list on `/timetable` is capped (likely sliced or scroll-clipped), so the user can't see every upcoming deadline/event without extra interaction.

## Change

### `src/pages/Timetable.tsx` — "All upcoming items" card
- Remove any `.slice(0, N)` cap on the rendered list so every future item is included.
- Remove the fixed-height `ScrollArea` / `max-h-*` wrapper around the list so the card grows to fit all rows naturally on the page.
- Keep sort order: ascending by due date / start time, with completed items still visible (dimmed + strikethrough) at their chronological position.
- Add a small count badge in the card header: "All upcoming items (N)" so the user immediately sees the total.

### Optional polish (same card)
- If the list grows very long, add a lightweight "Hide completed" toggle in the header (default: off → everything visible). No filtering otherwise.

## Out of scope
- Week/month grid views (unchanged)
- Pagination — full list is the goal
- Server-side limits (the query already returns all rows for the user; only the UI is clipping)

