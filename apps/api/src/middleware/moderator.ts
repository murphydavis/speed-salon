import { MODERATOR_HEADER } from "@speed-salon/shared";
import type { RequestHandler } from "express";
import { findModerator } from "../db/moderators.js";
import { ApiError } from "../errors.js";
import type { Pool } from "../db/pool.js";

export function requireModerator(pool: Pool): RequestHandler {
  return (req, res, next) => {
    const id = req.get(MODERATOR_HEADER)?.trim();
    if (!id) {
      next(new ApiError(401, "unauthorized", `${MODERATOR_HEADER} is required`));
      return;
    }
    findModerator(pool, id)
      .then((mod) => {
        if (!mod) {
          next(new ApiError(401, "unauthorized", "unknown moderator"));
          return;
        }
        req.moderator = mod;
        next();
      })
      .catch(next);
  };
}
