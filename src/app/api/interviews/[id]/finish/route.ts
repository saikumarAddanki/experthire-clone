import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Marks the interview as complete. No AI call here at all — the only
 * token spend in the whole app is the one-time question bank generation
 * when the interview was created.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const interview = await prisma.interview.findUnique({ where: { id } });
  if (!interview || interview.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.interview.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ interview: updated });
}
