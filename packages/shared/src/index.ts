export const MODERATOR_HEADER = "X-Moderator-Id";

export const RUN_STATUSES = ["pending", "approved", "rejected"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const REJECT_REASONS = [
  "invalid_proof",
  "time_mismatch",
  "wrong_category",
  "illegal_play",
  "timing_method",
  "duplicate",
  "suspicious",
  "other",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const RANKING_MODES = ["players", "runs"] as const;
export type RankingMode = (typeof RANKING_MODES)[number];

export const APPEAL_STATES = [
  "not_appealed",
  "pending",
  "rejected",
  "approved",
] as const;
export type AppealState = (typeof APPEAL_STATES)[number];
