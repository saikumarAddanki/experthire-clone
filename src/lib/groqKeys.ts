import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

export async function hasApiKeys(userId: string): Promise<boolean> {
  const count = await prisma.apiKey.count({ where: { userId } });
  return count > 0;
}

export function maskApiKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 7)}${"•".repeat(6)}${key.slice(-4)}`;
}

interface CandidateKey {
  id: string;
  apiKey: string;
}

export class NoApiKeyError extends Error {
  constructor() {
    super("Add a Groq API key before starting an interview.");
    this.name = "NoApiKeyError";
  }
}

const DEFAULT_BACKOFF_SECONDS = 60;

function isRateLimitError(err: unknown): boolean {
  return (err as { status?: number } | null)?.status === 429;
}

function isAuthError(err: unknown): boolean {
  const status = (err as { status?: number } | null)?.status;
  return status === 401 || status === 403;
}

function extractRetryAfterSeconds(err: unknown): number {
  const headers = (err as { headers?: Record<string, string> } | null)?.headers;
  const raw = headers?.["retry-after"];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_BACKOFF_SECONDS;
}

async function getCandidateKeys(userId: string): Promise<CandidateKey[]> {
  const now = new Date();
  const userKeys = await prisma.apiKey.findMany({
    where: { userId },
    orderBy: { lastUsedAt: { sort: "asc", nulls: "first" } },
  });

  // Keys that are past their rate-limit cooldown go first; ones still
  // cooling down go last (as a last resort, in case they recovered early).
  const available = userKeys.filter((k) => !k.rateLimitedUntil || k.rateLimitedUntil <= now);
  const cooling = userKeys.filter((k) => k.rateLimitedUntil && k.rateLimitedUntil > now);

  return [
    ...available.map((k) => ({ id: k.id, apiKey: k.key })),
    ...cooling.map((k) => ({ id: k.id, apiKey: k.key })),
  ];
}

/**
 * Runs a Groq call, trying the user's saved API keys in rotation (least
 * recently used first) and silently moving to the next key on a rate limit
 * or auth error — no delay, no error surfaced, unless every key fails.
 * There is no shared fallback key: if the user has none saved, this throws
 * NoApiKeyError, which callers should surface as "add a key first".
 */
export async function withGroqFailover<T>(
  userId: string,
  fn: (client: Groq) => Promise<T>
): Promise<T> {
  const candidates = await getCandidateKeys(userId);

  if (candidates.length === 0) {
    throw new NoApiKeyError();
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    const client = new Groq({ apiKey: candidate.apiKey });
    try {
      const result = await fn(client);
      prisma.apiKey
        .update({
          where: { id: candidate.id },
          data: { lastUsedAt: new Date(), rateLimitedUntil: null },
        })
        .catch(() => {});
      return result;
    } catch (err) {
      lastError = err;

      if (isRateLimitError(err)) {
        const backoffSeconds = extractRetryAfterSeconds(err);
        prisma.apiKey
          .update({
            where: { id: candidate.id },
            data: { rateLimitedUntil: new Date(Date.now() + backoffSeconds * 1000) },
          })
          .catch(() => {});
        continue; // silently try the next key
      }

      if (isAuthError(err)) {
        continue; // this particular key is invalid — try the next one
      }

      throw err; // genuine error (bad request, network, etc.) — don't mask it
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All configured Groq API keys failed.");
}
