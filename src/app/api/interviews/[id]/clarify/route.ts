import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClarification } from "@/lib/groq";
import type { RoundType } from "@prisma/client";

const schema = z.object({
  questionId: z.string(),
});

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

  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!interview || interview.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const question = interview.questions.find((q) => q.id === parsed.data.questionId);
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const clarification = await generateClarification(session.user.id, {
    jobTitle: interview.jobTitle,
    roundType: interview.roundType as RoundType,
    questionText: question.questionText,
  });

  return NextResponse.json({ clarification });
}
