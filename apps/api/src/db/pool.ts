import pg from "pg";

export function createPool(connectionString: string): pg.Pool {
  return new pg.Pool({ connectionString });
}

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;
