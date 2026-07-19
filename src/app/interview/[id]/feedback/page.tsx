import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { roundTypeLabel } from "@/lib/roundTypes";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const interview = await prisma.interview.findUnique({
    where: { id },
    select: {
      userId: true,
      jobTitle: true,
      companyName: true,
      roundType: true,
      status: true,
      completedAt: true,
      _count: { select: { questions: { where: { answerText: { not: null } } } } },
    },
  });

  if (!interview || interview.userId !== session.user.id) notFound();

  if (interview.status !== "COMPLETED") {
    redirect(`/interview/${id}`);
  }

  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div
        className="w-12 h-12 rounded-full mx-auto mb-5 flex items-center justify-center"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="text-2xl font-semibold mb-2">Practice complete</h1>
      <p className="mb-1" style={{ color: "var(--text-muted)" }}>
        {interview.jobTitle}
        {interview.companyName ? ` · ${interview.companyName}` : ""} · {roundTypeLabel(interview.roundType)}
      </p>
      <p className="mb-8 text-sm" style={{ color: "var(--text-muted)" }}>
        {interview._count.questions} question{interview._count.questions === 1 ? "" : "s"} answered
        {interview.completedAt
          ? ` · ${new Date(interview.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
          : ""}
      </p>

      <div className="flex gap-4 justify-center">
        <Link href="/interview/new" className="btn-primary">
          Practice again
        </Link>
        <Link href="/dashboard" className="btn-secondary">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
