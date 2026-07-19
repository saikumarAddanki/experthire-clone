import { NextResponse } from "next/server";
import { z } from "zod";
import type { RoundType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestionBank } from "@/lib/groq";
import { hasApiKeys } from "@/lib/groqKeys";
import { ROUND_TYPES, DURATION_OPTIONS } from "@/lib/roundTypes";
import { MAX_INTERVIEWS_PER_DAY } from "@/lib/limits";

const roundTypeValues = ROUND_TYPES.map((r) => r.value) as [string, ...string[]];

const createSchema = z.object({
  jobTitle: z.string().min(1).max(200),
  companyName: z.string().max(200).optional(),
  jobDescription: z.string().min(10).max(20000),
  resumeText: z.string().max(20000).optional(),
  roundType: z.enum(roundTypeValues),
  durationMinutes: z.number().refine((v) => (DURATION_OPTIONS as readonly number[]).includes(v)),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const interviews = await prisma.interview.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobTitle: true,
      companyName: true,
      roundType: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ interviews });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { jobTitle, companyName, jobDescription, resumeText, durationMinutes } = parsed.data;
  const roundType = parsed.data.roundType as RoundType;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [keyOk, recentCount] = await Promise.all([
    hasApiKeys(session.user.id),
    prisma.interview.count({ where: { userId: session.user.id, createdAt: { gte: since } } }),
  ]);

  if (!keyOk) {
    return NextResponse.json(
      { error: "Add a Groq API key before starting an interview.", code: "NO_API_KEY" },
      { status: 400 }
    );
  }
  if (recentCount >= MAX_INTERVIEWS_PER_DAY) {
    return NextResponse.json(
      {
        error: `You've reached today's limit of ${MAX_INTERVIEWS_PER_DAY} interviews. Try again tomorrow.`,
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  // Generate every question up front — this is the ONLY AI call for the
  // whole interview besides the final scoring. Nothing generates per-turn
  // while the candidate is answering, so advancing between questions during
  // the interview is a local array lookup, not a network+LLM round trip.
  let questionTexts: string[];
  try {
    questionTexts = await generateQuestionBank(session.user.id, {
      jobTitle,
      companyName,
      jobDescription,
      resumeText,
      roundType,
    });
  } catch (err) {
    console.error("generateQuestionBank failed:", err);
    return NextResponse.json(
      { error: "Couldn't put together your interview questions right now. Please try again.", code: "AI_ERROR" },
      { status: 502 }
    );
  }

  const interviewId = crypto.randomUUID();
  const questionData = questionTexts.map((text, i) => ({
    id: crypto.randomUUID(),
    interviewId,
    order: i + 1,
    questionText: text,
  }));

  const [interview] = await prisma.$transaction([
    prisma.interview.create({
      data: {
        id: interviewId,
        userId: session.user.id,
        jobTitle,
        companyName,
        jobDescription,
        resumeText,
        roundType,
        durationMinutes,
        status: "IN_PROGRESS",
      },
    }),
    prisma.question.createMany({ data: questionData }),
  ]);

  return NextResponse.json({
    interviewId: interview.id,
    questions: questionData.map((q) => ({ id: q.id, order: q.order, questionText: q.questionText, answerText: null })),
    durationMinutes: interview.durationMinutes,
    createdAt: interview.createdAt,
  });
}
