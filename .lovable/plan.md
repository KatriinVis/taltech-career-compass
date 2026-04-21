

# Move "Choose your goal" heading

Move the **"Choose your goal"** heading out of `BottleDiagram.tsx` and place it directly under the **"Closing your career gap"** card title in `Career.tsx`, so it sits at the top of the section (above the diagram) as a sub-heading of that card.

## Changes

- **`src/components/app/BottleDiagram.tsx`** — remove the `<h3>Choose your goal</h3>` and the wrapping `space-y-3` div added previously. Component goes back to rendering just the diagram + side panel grid.
- **`src/pages/Career.tsx`** — in the "Closing your career gap" `Card`, add a short sub-heading/description above `<BottleDiagram />` inside `CardContent`:
  ```tsx
  <CardContent className="space-y-3">
    <h3 className="text-sm font-semibold text-foreground">Choose your goal</h3>
    <BottleDiagram ... />
  </CardContent>
  ```

No other behavior changes.

