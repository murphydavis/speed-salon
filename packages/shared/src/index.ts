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

/** UTC stamp in the filename so the export’s “as of” time is visible. No colons (Windows). */
export function csvExportFilename(
  slug: string,
  at: Date = new Date(),
  flags: { includePending?: boolean; includeBanned?: boolean } = {},
): string {
  const stamp = `${at.toISOString().slice(0, 19).replaceAll(":", "")}Z`;
  const extras = `${flags.includePending ? "-pending" : ""}${flags.includeBanned ? "-banned" : ""}`;
  return `${slug}-leaderboard-${stamp}${extras}.csv`;
}
