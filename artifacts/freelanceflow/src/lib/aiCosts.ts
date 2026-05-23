// Mirror of artifacts/api-server/src/lib/aiCosts.ts — keep in sync.
export const AI_COSTS = {
  bio: 1,
  cover_letter: 1,
  linkedin_post: 1,
  outreach: 1,
  discovery_questions: 1,
  late_payment: 1,
  rate_calculator: 1,
  predict_success: 1,
  niche_finder: 1,
  proposal_analyze_job: 1,
  proposal_generate_draft: 1,
  proposal_regenerate: 1,
  proposal_create: 1,
  resume_match: 2,
  contract: 2,
  negotiate: 2,
  scope_creep: 2,
  skill_gap: 2,
  case_study: 2,
  dream_job: 2,
} as const;

export type AiAction = keyof typeof AI_COSTS;

export function costFor(action: AiAction): number {
  return AI_COSTS[action];
}
