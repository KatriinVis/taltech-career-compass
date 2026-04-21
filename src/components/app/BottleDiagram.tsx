import { useState } from "react";
import { courseProvider } from "@/lib/courseProvider";

type Props = {
  skills: string[];
  interests: string[];
  paths: string[];
  goal: string | null;
};

export default function BottleDiagram({ skills, interests, paths, goal }: Props) {
  const [layer, setLayer] = useState<"skills" | "interests" | "paths" | "goal" | null>(null);

  const norm = (s: string) => s.toLowerCase().replace(/[\s_]+/g, "-");
  const goalPath = goal ? courseProvider.pathByName(goal) : undefined;
  const goalSkillSet = goalPath ? new Set(goalPath.skills.map(norm)) : null;
  const matchedSkills = goalSkillSet ? skills.filter((s) => goalSkillSet.has(norm(s))) : skills;
  const otherSkills = goalSkillSet ? skills.filter((s) => !goalSkillSet.has(norm(s))) : [];

  const layers = [
    {
      id: "skills" as const,
      label: goalSkillSet ? "CV skills (matched to goal)" : "CV skills",
      count: matchedSkills.length,
      total: skills.length,
      items: matchedSkills,
      others: otherSkills,
      w: 360,
    },
    { id: "interests" as const, label: "Interests filter", count: interests.length, items: interests, w: 280 },
    { id: "paths" as const, label: "Candidate paths", count: paths.length, items: paths, w: 200 },
    { id: "goal" as const, label: "Chosen goal", count: goal ? 1 : 0, items: goal ? [goal] : [], w: 110 },
  ];

  return (
    <div className="grid md:grid-cols-[1fr_240px] gap-6 items-start">
      <svg viewBox="0 0 400 300" className="w-full h-auto">
        <defs>
          <linearGradient id="fnl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.85" />
            <stop offset="100%" stopColor="hsl(var(--primary-glow))" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        {layers.map((l, i) => {
          const y = 20 + i * 65;
          const x = (400 - l.w) / 2;
          const active = layer === l.id;
          return (
            <g key={l.id} className="cursor-pointer" onClick={() => setLayer(active ? null : l.id)}>
              <rect
                x={x} y={y} width={l.w} height={50} rx={8}
                fill="url(#fnl)"
                opacity={active ? 1 : 0.75}
                stroke={active ? "hsl(var(--accent))" : "transparent"}
                strokeWidth={2}
              />
              <text x={200} y={y + 22} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="12" fontWeight="600">
                {l.label}
              </text>
              <text x={200} y={y + 38} textAnchor="middle" fill="hsl(var(--primary-foreground))" fontSize="11" opacity="0.85">
                {l.id === "skills" && (l as any).total != null && (l as any).total !== l.count
                  ? `${l.count} of ${(l as any).total} skill${(l as any).total === 1 ? "" : "s"} apply`
                  : `${l.count} item${l.count === 1 ? "" : "s"}`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="rounded-lg border bg-secondary/40 p-4 min-h-[180px]">
        {layer ? (
          <>
            <div className="text-sm font-medium mb-2">{layers.find((l) => l.id === layer)?.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {layers.find((l) => l.id === layer)?.items.map((it) => (
                <span key={it} className="text-xs px-2 py-0.5 rounded-full bg-card border">{it}</span>
              )) || <span className="text-xs text-muted-foreground">No items.</span>}
            </div>
            {layer === "skills" && otherSkills.length > 0 && (
              <>
                <div className="text-xs text-muted-foreground mt-3 mb-1.5">Other skills (not in current goal)</div>
                <div className="flex flex-wrap gap-1.5">
                  {otherSkills.map((it) => (
                    <span key={it} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      {it}
                    </span>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Click any layer to see what was filtered and why.</div>
        )}
      </div>
    </div>
  );
}