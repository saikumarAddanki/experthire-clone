import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import InterviewSession from "@/components/InterviewSession";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!interview || interview.userId !== session.user.id) notFound();

  if (interview.status === "COMPLETED") {
    redirect(`/interview/${id}/feedback`);
  }

  return (
    <InterviewSession
      interviewId={interview.id}
      jobTitle={interview.jobTitle}
      companyName={interview.companyName}
      roundType={interview.roundType}
      durationMinutes={interview.durationMinutes}
      createdAt={interview.createdAt.toISOString()}
      initialQuestions={interview.questions.map((q) => ({
        id: q.id,
        order: q.order,
        questionText: q.questionText,
        answerText: q.answerText,
      }))}
    />
  );
}
