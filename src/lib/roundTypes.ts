export const ROUND_TYPES = [
  { value: "CODING", label: "Coding" },
  { value: "APTITUDE", label: "Problem Solving / Aptitude" },
  { value: "HR", label: "HR Round" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "SYSTEM_DESIGN", label: "System Design" },
  { value: "GENERAL", label: "General Interview" },
  { value: "VC_PITCH", label: "VC Pitch" },
] as const;

export type RoundTypeValue = (typeof ROUND_TYPES)[number]["value"];

export const DURATION_OPTIONS = [25, 30, 45] as const;

/** Round types where questions should draw heavily on the candidate's resume/background. */
export const RESUME_WEIGHTED_ROUNDS: RoundTypeValue[] = ["HR", "GENERAL", "COMMUNICATION"];

export function roundTypeLabel(value: string): string {
  return ROUND_TYPES.find((r) => r.value === value)?.label ?? value;
}
