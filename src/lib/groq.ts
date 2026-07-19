import type Groq from "groq-sdk";
import { withGroqFailover } from "@/lib/groqKeys";
import { RESUME_WEIGHTED_ROUNDS, type RoundTypeValue } from "@/lib/roundTypes";

const MODEL = "openai/gpt-oss-120b";

const RESUME_PROMPT_CHARS = 3500;
const JOB_DESC_PROMPT_CHARS = 2500;

const MIN_BANK_SIZE = 40;
const MAX_BANK_SIZE = 50;

// Randomly picked per generation so two separate attempts at the same
// role/round don't converge on the same "default" question set even though
// the resume/JD input is identical each time.
const VARIETY_SEEDS = [
  "Lean slightly more into the candidate's specific resume projects and technologies by name.",
  "Lean slightly more into core computer science fundamentals over resume specifics.",
  "Lean slightly more into behavioral/motivation questions early, then get technical.",
  "Lean slightly more into scenario/hypothetical questions relevant to the role.",
  "Lean slightly more into trade-off and decision-making questions.",
  "Mix in a few unconventional or unexpected angles a typical interviewer might not default to.",
];

function randomVarietySeed(): string {
  return VARIETY_SEEDS[Math.floor(Math.random() * VARIETY_SEEDS.length)];
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

const ROUND_GUIDANCE: Record<RoundTypeValue, string> = {
  CODING:
    "CODING round. Ask algorithm/data-structure/problem-solving questions. The candidate has a code editor and may write real code or pseudocode.",
  APTITUDE:
    "PROBLEM SOLVING / APTITUDE round. Logical reasoning and structured problem-solving questions relevant to the role.",
  HR: "HR round. Background, motivations, career goals, why this role/company, strengths/weaknesses, behavioral questions. Draw on their resume.",
  COMMUNICATION:
    "COMMUNICATION round. Ask the candidate to explain projects/decisions clearly, handle disagreement, or simplify something complex.",
  SYSTEM_DESIGN:
    "SYSTEM DESIGN round. Design/reasoning questions about relevant systems (scalability, data modeling, trade-offs).",
  GENERAL:
    "GENERAL interview. Spread questions across three areas: (1) core computer science fundamentals relevant to the role - data structures, algorithms, OOP, databases, networking, systems basics; (2) specifics from the candidate's own resume - particular projects, technologies, and decisions they mention by name; (3) role-relevant skills and motivation.",
  VC_PITCH:
    "VC PITCH practice. Investor-style questions: problem, market, traction, business model, moat, team.",
};

function buildContextBlock(params: {
  jobTitle: string;
  companyName?: string | null;
  jobDescription: string;
  resumeText?: string | null;
  roundType: RoundTypeValue;
}): string {
  const { jobTitle, companyName, jobDescription, resumeText, roundType } = params;
  const resumeIsWeighted = RESUME_WEIGHTED_ROUNDS.includes(roundType);

  return `Role: ${jobTitle}${companyName ? ` at ${companyName}` : ""}
JD: ${truncate(jobDescription, JOB_DESC_PROMPT_CHARS)}
${
  resumeText
    ? `Resume: ${truncate(resumeText, RESUME_PROMPT_CHARS)}\n${
        resumeIsWeighted
          ? "Cover ALL notable skills, technologies, and projects in this resume across the question set."
          : "Use resume for light context on a handful of questions."
      }`
    : "No resume provided."
}`;
}

/**
 * Generate the ENTIRE question set for an interview in a single call -
 * question[0] is the interviewer's self-introduction + "introduce yourself"
 * ask, the rest are the actual interview questions. This is the only AI call
 * that happens before the interview starts; nothing generates per-turn while
 * the candidate is answering, so moving between questions during the
 * interview is instant and free.
 */
export async function generateQuestionBank(
  userId: string,
  params: {
    jobTitle: string;
    companyName?: string | null;
    jobDescription: string;
    resumeText?: string | null;
    roundType: RoundTypeValue;
  }
): Promise<string[]> {
  const { roundType, companyName, resumeText } = params;
  const count = MIN_BANK_SIZE + Math.floor(Math.random() * (MAX_BANK_SIZE - MIN_BANK_SIZE + 1));

  const system = `You are designing a full mock interview question set, role-playing a real human interviewer. ${ROUND_GUIDANCE[roundType]}

Output ONLY a JSON object: {"questions": string[]} with exactly ${count} items, in the order they'll be asked.

Item 1 - the opening, spoken naturally (2-3 sentences):
- Introduce yourself with a plausible human first+last name and your role as interviewer.
- ${
    companyName
      ? `You represent "${companyName}" exactly - use this exact name.`
      : "No company was given - invent one plausible, realistic name consistent with the role."
  }
- ${resumeText ? "If the candidate's name is identifiable in their resume, greet them by it." : "Greet the candidate warmly."}
- Ask them to briefly introduce themselves.

Items 2 through ${count} - real interview questions, each 1-2 sentences, each testing something genuinely different from all the others (no duplicates or near-rephrasings). Spread them across the full breadth implied by the round type and the candidate's resume/role - don't cluster on one topic. Vary difficulty naturally across the set. Natural spoken tone throughout, like a real person talking, not a form.

${randomVarietySeed()} Avoid defaulting to the most generic, textbook version of this question set — write a set that feels specific to this exact resume and role, not interchangeable with any other candidate's.`;

  const user = `${buildContextBlock(params)}

Generate the ${count}-item question set as described.`;

  return withGroqFailover(userId, async (client) => {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 5000,
      temperature: 0.9,
      reasoning_effort: "low",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = extractText(res).trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(text) as { questions?: unknown };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error("The question set came back empty - please try again.");
    }

    return parsed.questions.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
  });
}

/**
 * Answer a candidate's meta-request - "can you repeat that", "can you
 * clarify" - without advancing the interview or counting as an answer.
 * Small, on-demand, only fires if the candidate actually asks for it.
 */
export async function generateClarification(
  userId: string,
  params: {
    jobTitle: string;
    roundType: RoundTypeValue;
    questionText: string;
  }
): Promise<string> {
  const { jobTitle, roundType, questionText } = params;

  const system = `You are an interviewer in a live mock interview for a ${jobTitle} role (${ROUND_GUIDANCE[roundType].split(".")[0]}).
The candidate just asked you to clarify or elaborate on your last question. Briefly clarify or rephrase it - do NOT ask a new question, do NOT answer it for them. 1-2 sentences, spoken and natural, no preamble.`;

  const user = `Your question was: "${questionText}"
Clarify it briefly.`;

  return withGroqFailover(userId, async (client) => {
    const res = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 300,
      reasoning_effort: "low",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    return extractText(res);
  });
}

function extractText(res: Groq.Chat.Completions.ChatCompletion): string {
  return res.choices[0]?.message?.content?.trim() ?? "";
}
