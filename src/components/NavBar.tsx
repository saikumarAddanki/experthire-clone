"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function NavBar() {
  const { status } = useSession();
  const [hasKey, setHasKey] = useState(true); // assume true until checked, to avoid a flash of the dot

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/keys")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHasKey((data.keys?.length ?? 0) > 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <header className="border-b" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "var(--accent)" }}
          />
          <span className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Prepped
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {status === "authenticated" ? (
            <>
              <Link
                href="/settings/keys"
                title={hasKey ? "Manage Groq API keys" : "Add a Groq API key to start interviewing"}
                aria-label="Manage Groq API keys"
                className="btn-secondary !py-2 !px-2.5 flex items-center relative"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="7.5" cy="15.5" r="5.5" />
                  <path d="m21 2-9.6 9.6" />
                  <path d="m15.5 7.5 3 3L22 7l-3-3" />
                </svg>
                {!hasKey && (
                  <span
                    className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2"
                    style={{ background: "var(--warn)", borderColor: "var(--bg)" }}
                  />
                )}
              </Link>
              <Link href="/dashboard" className="btn-secondary !py-2 !px-4">
                Dashboard
              </Link>
              <Link href="/interview/new" className="btn-primary !py-2 !px-4">
                New interview
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[color:var(--text-muted)] hover:text-[color:var(--text)] px-2"
              >
                Sign out
              </button>
            </>
          ) : status === "loading" ? null : (
            <>
              <Link href="/login" className="btn-secondary !py-2 !px-4">
                Log in
              </Link>
              <Link href="/register" className="btn-primary !py-2 !px-4">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
