import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  questionId: z.string(),
  answerText: z.string().min(1).max(10000),
});

/**
 * Just persists the answer for a question from the pre-generated bank.
 * There is no AI call here — the client already has every question up
 * front and advances locally, so this only needs to be a fast DB write.
 * Returns whether the bank is exhausted (no question after this one) so
 * the client's local bookkeeping has a server-verified backstop.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview || interview.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { questionId, answerText } = parsed.data;

  const currentQuestion = await prisma.question.findUnique({ where: { id: questionId } });
  if (!currentQuestion || currentQuestion.interviewId !== id) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  await prisma.question.update({
    where: { id: questionId },
    data: { answerText, answeredAt: new Date() },
  });

  const nextExists = await prisma.question.findFirst({
    where: { interviewId: id, order: currentQuestion.order + 1 },
    select: { id: true },
  });

  return NextResponse.json({ bankExhausted: !nextExists });
}
