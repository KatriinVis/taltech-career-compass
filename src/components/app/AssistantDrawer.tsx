import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles, Loader2, Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant" | "system";
type ChatMsg = { role: ChatRole; content: string };
type PendingWrite = { id: string; name: string; arguments: Record<string, unknown> };

const SUGGESTIONS = [
  "What's on my calendar this week?",
  "What homework is due in the next 7 days?",
  "Find a machine learning elective",
  "Add a Python internship at Bolt to my CV",
];

export default function AssistantDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingWrite[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending, busy]);

  const runTurn = async (nextMessages: ChatMsg[], confirmedWrites: Array<{ name: string; arguments: Record<string, unknown> }> = []) => {
    setBusy(true);
    setPending([]);
    // Placeholder assistant message we will fill as deltas arrive.
    setMessages([...nextMessages, { role: "assistant", content: "" }]);

    let assistantText = "";
    const updateAssistant = (text: string) => {
      assistantText = text;
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: text };
        return copy;
      });
    };

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: nextMessages, confirmed_writes: confirmedWrites }),
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let toolNote = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "delta") {
              updateAssistant(assistantText + (evt.text ?? ""));
            } else if (evt.type === "tool") {
              toolNote += `\n_• used ${evt.name}_`;
              if (!assistantText) updateAssistant(toolNote.trim());
            } else if (evt.type === "confirm") {
              setPending(evt.pending ?? []);
            } else if (evt.type === "error") {
              toast({ title: "Assistant error", description: evt.message, variant: "destructive" });
            }
          } catch { /* ignore */ }
        }
      }

      if (!assistantText && pending.length === 0) {
        // Drop empty placeholder
        setMessages((prev) => prev.filter((_, i) => !(i === prev.length - 1 && prev[i].role === "assistant" && prev[i].content === "")));
      }
    } catch (e) {
      toast({ title: "Assistant failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      setMessages((prev) => prev.filter((_, i) => !(i === prev.length - 1 && prev[i].role === "assistant" && prev[i].content === "")));
    } finally {
      setBusy(false);
    }
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setInput("");
    runTurn(next);
  };

  const confirmPending = async (accept: boolean) => {
    if (pending.length === 0) return;
    const writes = accept ? pending.map((p) => ({ name: p.name, arguments: p.arguments })) : [];
    const note: ChatMsg = {
      role: "user",
      content: accept
        ? `Confirmed: ${pending.map((p) => p.name).join(", ")}.`
        : `Cancelled: ${pending.map((p) => p.name).join(", ")}.`,
    };
    const next = [...messages, note];
    await runTurn(next, writes);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> MESA.I Assistant
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="px-6 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Ask about your schedule, deadlines, courses, or CV.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-secondary hover:bg-secondary/80 text-foreground/80"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted text-foreground mr-8",
                )}
              >
                {m.role === "assistant" && !m.content && busy ? (
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" /> thinking…
                  </span>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {pending.map((p) => (
              <Card key={p.id} className="p-3 border-primary/40">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Confirm action</div>
                <div className="text-sm font-medium mb-1">{describeAction(p)}</div>
                <pre className="text-[11px] bg-muted rounded p-2 mb-3 overflow-auto">{JSON.stringify(p.arguments, null, 2)}</pre>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmPending(true)} disabled={busy}>
                    <Check className="size-3.5" /> Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => confirmPending(false)} disabled={busy}>
                    <X className="size-3.5" /> Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t p-3 flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            rows={1}
            className="min-h-[40px] max-h-32 resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            disabled={busy}
          />
          <Button onClick={() => send(input)} disabled={busy || !input.trim()} size="icon">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function describeAction(p: PendingWrite): string {
  if (p.name === "add_course_to_plan") return `Add course ${(p.arguments.code as string) ?? ""} to your plan?`;
  if (p.name === "append_to_cv") return `Append to CV (${(p.arguments.section as string) ?? "section"})?`;
  return p.name;
}