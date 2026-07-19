"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JOB_ROLE_PRESETS, CUSTOM_ROLE_VALUE } from "@/lib/jobRolePresets";
import { ROUND_TYPES, DURATION_OPTIONS } from "@/lib/roundTypes";

export default function NewInterviewForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedRole, setSelectedRole] = useState<string>(CUSTOM_ROLE_VALUE);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [roundType, setRoundType] = useState<string>("GENERAL");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [parsingResume, setParsingResume] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsKey, setNeedsKey] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleRoleChange(value: string) {
    setSelectedRole(value);
    if (value === CUSTOM_ROLE_VALUE) return;
    const preset = JOB_ROLE_PRESETS.find((r) => r.title === value);
    if (preset) {
      setJobTitle(preset.title);
      setJobDescription(preset.description);
    }
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingResume(true);
    setError(null);
    setResumeFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/resume/parse", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not read that resume");
        setResumeFileName(null);
      } else {
        setResumeText(data.text);
      }
    } catch {
      setError("Could not read that resume");
      setResumeFileName(null);
    } finally {
      setParsingResume(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsKey(false);
    setLoading(true);

    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          companyName,
          jobDescription,
          resumeText,
          roundType,
          durationMinutes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "NO_API_KEY") {
          setNeedsKey(true);
          setLoading(false);
          return;
        }
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/interview/${data.interviewId}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-semibold mb-2">Set up your interview</h1>
      <p className="mb-10" style={{ color: "var(--text-muted)" }}>
        Pick a role to auto-fill the job description, or write your own.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm mb-1.5">Job role</label>
          <select
            className="input"
            value={selectedRole}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            <option value={CUSTOM_ROLE_VALUE}>Custom / write my own</option>
            {JOB_ROLE_PRESETS.map((role) => (
              <option key={role.title} value={role.title}>
                {role.title} — {role.category}
              </option>
            ))}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Job title</label>
            <input
              className="input"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              required
              placeholder="Senior Product Designer"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5">Company (optional)</label>
            <input
              className="input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5">
            Job description{" "}
            {selectedRole !== CUSTOM_ROLE_VALUE && (
              <span style={{ color: "var(--text-muted)" }}>(auto-filled — edit freely)</span>
            )}
          </label>
          <textarea
            className="input"
            rows={8}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
            minLength={10}
            placeholder="Paste the full job description here…"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1.5">Round type</label>
            <select
              className="input"
              value={roundType}
              onChange={(e) => setRoundType(e.target.value)}
            >
              {ROUND_TYPES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1.5">Duration</label>
            <select
              className="input"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5">Resume (optional, PDF or .txt)</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
              disabled={parsingResume}
            >
              {parsingResume ? "Reading…" : resumeFileName ? "Replace file" : "Upload resume"}
            </button>
            {resumeFileName && !parsingResume && (
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {resumeFileName} ✓
              </span>
            )}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            HR, General, and Communication rounds ask questions based directly on your resume.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={handleResumeUpload}
          />
        </div>

        {needsKey && (
          <div
            className="text-sm rounded-lg px-4 py-3"
            style={{ background: "rgba(240, 180, 41, 0.12)", color: "var(--warn)" }}
          >
            You need a Groq API key to start an interview.{" "}
            <Link href="/settings/keys" className="underline font-medium">
              Add one now
            </Link>
            .
          </div>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading || parsingResume} className="btn-primary w-full">
          {loading ? "Preparing your interview…" : "Start interview"}
        </button>
      </form>
    </div>
  );
}
