import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("resume") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let text = "";

  try {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // Lazy import — pdf-parse touches the filesystem on module load in some setups.
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(bytes);
      text = result.text;
    } else {
      // Assume plain text (.txt) upload
      text = bytes.toString("utf-8");
    }
  } catch (err) {
    console.error("Resume parse error", err);
    return NextResponse.json({ error: "Could not parse resume file" }, { status: 422 });
  }

  text = text.trim().slice(0, 15000); // guard against huge documents

  if (!text) {
    return NextResponse.json({ error: "No text could be extracted from this file" }, { status: 422 });
  }

  return NextResponse.json({ text });
}
