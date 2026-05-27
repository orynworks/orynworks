import { createDbClient, type DbClient } from "@oryn/db";

let _db: DbClient | undefined;
export function getDb(): DbClient {
  if (!_db) _db = createDbClient(process.env.DATABASE_URL!);
  return _db;
}
