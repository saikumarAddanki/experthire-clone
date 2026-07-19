import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        <p
          className="text-sm font-medium tracking-wide uppercase mb-4"
          style={{ color: "var(--accent)" }}
        >
          The interview happens here first
        </p>
        <h1 className="text-5xl sm:text-6xl font-semibold leading-[1.05] max-w-3xl">
          Practice the interview before it counts.
        </h1>
        <p className="mt-6 text-lg max-w-xl" style={{ color: "var(--text-muted)" }}>
          Paste any job description. An AI interviewer asks real, role-specific
          questions out loud, listens to your answers, and tells you exactly
          what to fix — before you&apos;re in the room that matters.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/register" className="btn-primary text-base">
            Start practicing free
          </Link>
          <Link href="/login" className="btn-secondary text-base">
            I have an account
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-2xl font-semibold mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: "Set the scene",
              body: "Paste the job description and, optionally, your resume. The interview is built around this exact role.",
            },
            {
              step: "Talk it through",
              body: "Answer out loud or by typing. Each question adapts to what you just said, like a real interviewer digging deeper.",
            },
            {
              step: "See the breakdown",
              body: "Get a technical score, a communication score, and specific, actionable feedback — not vague encouragement.",
            },
          ].map((item, i) => (
            <div key={item.step} className="card p-6">
              <div
                className="text-sm font-medium mb-3"
                style={{ color: "var(--accent)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-lg font-semibold mb-2">{item.step}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="card p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Ready for the real thing?</h2>
            <p style={{ color: "var(--text-muted)" }}>
              Your first mock interview is free. No credit card required.
            </p>
          </div>
          <Link href="/register" className="btn-primary text-base whitespace-nowrap">
            Start practicing free
          </Link>
        </div>
      </section>
    </div>
  );
}
