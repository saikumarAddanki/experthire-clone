"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ROUND_TYPES, roundTypeLabel } from "@/lib/roundTypes";

interface InterviewRow {
  id: string;
  jobTitle: string;
  companyName: string | null;
  roundType: string;
  status: string;
  createdAt: string;
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function InterviewList({ interviews }: { interviews: InterviewRow[] }) {
  const [items, setItems] = useState(interviews);
  const [search, setSearch] = useState("");
  const [roundFilter, setRoundFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (roundFilter !== "ALL" && i.roundType !== roundFilter) return false;
      if (search.trim() && !i.jobTitle.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, search, roundFilter]);

  const showFilters = items.length > 3;

  async function handleDelete(id: string, jobTitle: string) {
    if (!window.confirm(`Delete the "${jobTitle}" interview? This can't be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/interviews/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      {showFilters && (
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            className="input !w-auto flex-1 min-w-[160px]"
            placeholder="Search by role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input !w-auto" value={roundFilter} onChange={(e) => setRoundFilter(e.target.value)}>
            <option value="ALL">All round types</option>
            {ROUND_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
          {items.length === 0 ? "No interviews yet." : "No interviews match those filters."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((interview) => (
            <div
              key={interview.id}
              className="card p-5 flex items-center justify-between gap-4 hover:border-[color:var(--accent)] transition-colors"
            >
              <Link
                href={
                  interview.status === "COMPLETED"
                    ? `/interview/${interview.id}/feedback`
                    : `/interview/${interview.id}`
                }
                className="flex-1 flex items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-medium">{interview.jobTitle}</h3>
                  <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                    {interview.companyName ? `${interview.companyName} · ` : ""}
                    {roundTypeLabel(interview.roundType)} ·{" "}
                    {new Date(interview.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <span
                  className="text-xs px-3 py-1 rounded-full whitespace-nowrap"
                  style={
                    interview.status === "COMPLETED"
                      ? { background: "var(--accent-soft)", color: "var(--accent)" }
                      : { background: "var(--bg-elevated)", color: "var(--text-muted)" }
                  }
                >
                  {interview.status === "COMPLETED" ? "Completed" : "In progress"}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => handleDelete(interview.id, interview.jobTitle)}
                disabled={deletingId === interview.id}
                title="Delete interview"
                aria-label="Delete interview"
                className="p-2 rounded-lg"
                style={{ color: "var(--text-muted)" }}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
