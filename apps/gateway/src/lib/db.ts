import { createDbClient, type DbClient } from "@oryn/db";
import { env } from "../env.js";

let _db: DbClient | undefined;

export function getDb(): DbClient {
  if (!_db) _db = createDbClient(env.DATABASE_URL);
  return _db;
}
