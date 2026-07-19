import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasApiKeys } from "@/lib/groqKeys";
import NewInterviewForm from "@/components/NewInterviewForm";

export default async function NewInterviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const hasKey = await hasApiKeys(session.user.id);

  if (!hasKey) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div
          className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.5" cy="15.5" r="5.5" />
            <path d="m21 2-9.6 9.6" />
            <path d="m15.5 7.5 3 3L22 7l-3-3" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold mb-2">Add a Groq API key to start</h1>
        <p className="mb-8" style={{ color: "var(--text-muted)" }}>
          Every interview runs on your own Groq API key — free, no card
          required. Add one from the key icon in the top bar, then come back
          here.
        </p>
        <Link href="/settings/keys" className="btn-primary">
          Add your API key
        </Link>
      </div>
    );
  }

  return <NewInterviewForm />;
}
