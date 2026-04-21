import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssistantDrawer from "./AssistantDrawer";

export default function AssistantButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg h-12 w-12 p-0 md:h-auto md:w-auto md:px-4"
        aria-label="Open assistant"
      >
        <Sparkles className="size-5" />
        <span className="hidden md:inline">Ask MESA.I</span>
      </Button>
      <AssistantDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}