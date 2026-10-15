declare global {
  namespace Express {
    interface Request {
      moderator?: { id: string; displayName: string };
    }
  }
}

export {};
