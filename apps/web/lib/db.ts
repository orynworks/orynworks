import { createDbClient, type DbClient } from "@oryn/db";

declare global {
  // eslint-disable-next-line no-var
  var _orynDb: DbClient | undefined;
}

export function getDb(): DbClient {
  if (!globalThis._orynDb) {
    globalThis._orynDb = createDbClient(process.env.DATABASE_URL!);
  }
  return globalThis._orynDb;
}
