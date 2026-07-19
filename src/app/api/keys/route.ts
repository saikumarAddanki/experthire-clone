import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskApiKey } from "@/lib/groqKeys";

const createSchema = z.object({
  key: z.string().trim().min(10, "That doesn't look like a valid API key").max(300),
  label: z.string().trim().max(60).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    keys: keys.map((k) => ({
      id: k.id,
      label: k.label,
      maskedKey: maskApiKey(k.key),
      createdAt: k.createdAt,
      rateLimited: !!(k.rateLimitedUntil && k.rateLimitedUntil > new Date()),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { key, label } = parsed.data;

  const created = await prisma.apiKey.create({
    data: { userId: session.user.id, key, label },
  });

  return NextResponse.json({
    id: created.id,
    label: created.label,
    maskedKey: maskApiKey(created.key),
    createdAt: created.createdAt,
    rateLimited: false,
  });
}
