import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InterviewList from "@/components/InterviewList";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const interviews = await prisma.interview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const completedCount = interviews.filter((i) => i.status === "COMPLETED").length;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold">Your interviews</h1>
          <p className="mt-1" style={{ color: "var(--text-muted)" }}>
            {interviews.length === 0
              ? "No interviews yet — start your first one."
              : `${completedCount} completed`}
          </p>
        </div>
        <Link href="/interview/new" className="btn-primary">
          New interview
        </Link>
      </div>

      {interviews.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-lg mb-4">Nothing here yet.</p>
          <p className="mb-6" style={{ color: "var(--text-muted)" }}>
            Paste a job description and take your first AI mock interview.
          </p>
          <Link href="/interview/new" className="btn-primary">
            Start your first interview
          </Link>
        </div>
      ) : (
        <InterviewList
          interviews={interviews.map((i) => ({
            id: i.id,
            jobTitle: i.jobTitle,
            companyName: i.companyName,
            roundType: i.roundType,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
