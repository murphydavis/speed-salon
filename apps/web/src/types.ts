import type { RankingMode, RejectReason, RunStatus } from "@speed-salon/shared";

export type Moderator = {
  id: string;
  displayName: string;
  assignedGameIds: string[];
};

export type Game = {
  id: string;
  name: string;
  slug: string;
  defaultCategoryId: string | null;
  totalRuns?: number;
  approvedRuns?: number;
  pendingRuns?: number;
  bannedRuns?: number;
};

export type Category = {
  id: string;
  gameId: string;
  name: string;
  slug: string;
  totalRuns?: number;
  approvedRuns?: number;
  pendingRuns?: number;
  bannedRuns?: number;
};

export type GameDetail = Game & {
  categories: Category[];
  resolvedDefaultCategoryId: string | null;
  defaultIsExplicit: boolean;
};

export type LeaderboardRow = {
  place: number | null;
  runId: string;
  timeMs: number;
  submittedAt: string;
  kind: "ranked" | "pending" | "banned";
  isPb: boolean;
  playerPlace: number | null;
  runPlace: number | null;
  runner: { id: string; name: string };
};

export type GameRunRow = {
  id: string;
  status: RunStatus;
  timeMs: number;
  submittedAt: string;
  categoryId: string;
  categoryName: string;
  runnerId: string;
  runnerName: string;
};

export type Page<T> = {
  page: number;
  limit: number;
  total: number;
  items: T[];
  next: string | null;
};

export type LeaderboardPage = Page<LeaderboardRow> & {
  gameId: string;
  categoryId: string;
  mode: RankingMode;
};

export type RunDetail = {
  id: string;
  status: RunStatus;
  timeMs: number;
  submittedAt: string;
  proofUrl: string | null;
  categoryId: string;
  gameId: string;
  categoryName: string;
  categorySlug: string;
  gameName: string;
  gameSlug: string;
  runnerId: string;
  runnerName: string;
  splits: { ordinal: number; label: string; timeMs: number }[];
  reviewEvents: {
    id: string;
    action: string;
    createdAt: string;
    payload: unknown;
    moderatorId: string;
    moderatorName: string;
  }[];
  ban: {
    id: string;
    appealState: string;
    comment: string;
    createdAt: string;
  } | null;
  activeBan: {
    id: string;
    appealState: string;
    comment: string;
    createdAt: string;
  } | null;
};

export type { RankingMode, RejectReason, RunStatus };
