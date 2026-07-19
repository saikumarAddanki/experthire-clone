"use client";

import { useState, useEffect, useCallback } from "react";

interface ApiKeyRow {
  id: string;
  label: string | null;
  maskedKey: string;
  createdAt: string;
  rateLimited: boolean;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      if (res.ok) setKeys(data.keys);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, [loadKeys]);

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not save that key");
        setSaving(false);
        return;
      }

      setKeys((prev) => [...prev, data]);
      setNewKey("");
      setNewLabel("");
      setSaving(false);
    } catch {
      setError("Could not save that key. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-semibold mb-2">Groq API keys</h1>
      <p className="mb-10" style={{ color: "var(--text-muted)" }}>
        Add one or more of your own Groq API keys (free at{" "}
        <a
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)" }}
        >
          console.groq.com/keys
        </a>
        ). A key is required before you can start an interview — add at
        least one below. If you add more than one, interviews automatically
        rotate to the next key the moment one hits its rate limit — no
        interruption, no error shown to you.
      </p>

      <form onSubmit={handleAddKey} className="card p-5 space-y-4 mb-8">
        <div>
          <label className="block text-sm mb-1.5">API key</label>
          <input
            className="input"
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="gsk_..."
            required
            minLength={10}
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5">Label (optional)</label>
          <input
            className="input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Personal account"
          />
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={saving || !newKey.trim()} className="btn-primary">
          {saving ? "Saving…" : "Save key"}
        </button>
      </form>

      <h2 className="text-sm font-medium mb-3" style={{ color: "var(--text-muted)" }}>
        Your saved keys {keys.length > 0 && `(${keys.length})`}
      </h2>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading…</p>
      ) : keys.length === 0 ? (
        <div className="card p-6 text-sm" style={{ color: "var(--text-muted)" }}>
          No keys saved yet — add one above, then add more any time you like.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="card p-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm">{k.maskedKey}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {k.label ? `${k.label} · ` : ""}
                  added {new Date(k.createdAt).toLocaleDateString()}
                  {k.rateLimited && (
                    <span style={{ color: "var(--warn)" }}> · cooling down (rate limited)</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleDelete(k.id)}
                disabled={deletingId === k.id}
                className="text-sm px-3 py-1.5"
                style={{ color: "var(--danger)" }}
              >
                {deletingId === k.id ? "Removing…" : "Remove"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
