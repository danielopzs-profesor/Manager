import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { createHash } from "node:crypto";
import { validate, demo } from "./store.js";
const digest = (token) => createHash("sha256").update(token).digest("hex");
async function transaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
async function schemaTransaction(pool, fn) {
  return transaction(pool, async (client) => {
    // Serializa el primer arranque de varias funciones sobre una base nueva.
    await client.query("SELECT pg_advisory_xact_lock(277027)");
    return fn(client);
  });
}
export class DatabaseStore {
  constructor(pool) {
    this.pool = pool;
  }
  async init() {
    await schemaTransaction(this.pool, async (client) => {
      await client.query(
        "CREATE TABLE IF NOT EXISTS arte_workbook (id integer PRIMARY KEY CHECK (id = 1), data jsonb NOT NULL)",
      );
      await client.query(
        "INSERT INTO arte_workbook(id,data) VALUES (1,$1) ON CONFLICT (id) DO NOTHING",
        [JSON.stringify(demo)],
      );
      await client.query(
        "CREATE TABLE IF NOT EXISTS arte_workbook_history (id bigserial PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())",
      );
      await client.query(
        "CREATE TABLE IF NOT EXISTS arte_workbook_backup (version integer PRIMARY KEY, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())",
      );
      await client.query(
        "INSERT INTO arte_workbook_backup(version,data) SELECT 1,data FROM arte_workbook WHERE id=1 AND NOT (data ? 'academic') ON CONFLICT(version) DO NOTHING",
      );
    });
  }
  async read() {
    const { rows } = await this.pool.query(
      "SELECT data FROM arte_workbook WHERE id=1",
    );
    return validate(rows[0].data);
  }
  async mutate(fn, { snapshot = true } = {}) {
    return transaction(this.pool, async (client) => {
      const { rows } = await client.query(
        "SELECT data FROM arte_workbook WHERE id=1 FOR UPDATE",
      );
      const db = rows[0].data;
      const previous = JSON.stringify(db);
      const next = validate((await fn(db)) || db);
      if (snapshot) {
      await client.query("INSERT INTO arte_workbook_history(data) VALUES($1)", [
        previous,
      ]);
      await client.query(
        "DELETE FROM arte_workbook_history WHERE id NOT IN (SELECT id FROM arte_workbook_history ORDER BY id DESC LIMIT 30)",
      );
      }
      await client.query("UPDATE arte_workbook SET data=$1 WHERE id=1", [
        JSON.stringify(next),
      ]);
      return next;
    });
  }
  async listBackups() {
    const { rows } = await this.pool.query(
      "SELECT id,created_at,data->'academic'->>'revision' AS revision FROM arte_workbook_history ORDER BY id DESC",
    );
    return rows;
  }
  async getBackup(id) {
    const { rows } = await this.pool.query(
      "SELECT data FROM arte_workbook_history WHERE id=$1",
      [id],
    );
    if (!rows[0]) throw Error("Respaldo no encontrado");
    return rows[0].data;
  }
}
export async function createDatabaseRuntime(connectionString) {
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  pool.on("error", () =>
    console.error(
      "Se perdió una conexión PostgreSQL; se reintentará en la siguiente solicitud.",
    ),
  );
  try {
    await schemaTransaction(pool, (client) =>
      client.query(`CREATE TABLE IF NOT EXISTS arte_session (sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL);
      CREATE INDEX IF NOT EXISTS arte_session_expire ON arte_session(expire);
      CREATE TABLE IF NOT EXISTS arte_offer (token_hash text PRIMARY KEY, nomina text NOT NULL, expires timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS arte_login_limit (key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL);`),
    );
    const PgSession = connectPgSimple(session);
    const sessions = new PgSession({
      pool,
      tableName: "arte_session",
      pruneSessionInterval: false,
    });
    // Limpieza oportunista: no depende de procesos o temporizadores permanentes.
    await pool.query(
      `DELETE FROM arte_session WHERE expire < NOW(); DELETE FROM arte_offer WHERE expires < NOW(); DELETE FROM arte_login_limit WHERE reset_at < NOW()`,
    );
    const offers = {
      async put(token, offer) {
        await pool.query("INSERT INTO arte_offer VALUES($1,$2,$3)", [
          digest(token),
          offer.nomina,
          new Date(offer.expires),
        ]);
      },
      async consume(token, nomina) {
        const r = await pool.query(
          "DELETE FROM arte_offer WHERE token_hash=$1 AND nomina=$2 AND expires>NOW() RETURNING nomina",
          [digest(token), nomina],
        );
        return r.rowCount === 1;
      },
    };
    const limiter = {
      localKeys: false,
      init(options) {
        this.windowMs = options.windowMs;
      },
      async increment(key) {
        const { rows } = await pool.query(
          `INSERT INTO arte_login_limit(key,hits,reset_at) VALUES($1,1,NOW()+$2*INTERVAL '1 millisecond')
        ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN arte_login_limit.reset_at<=NOW() THEN 1 ELSE arte_login_limit.hits+1 END,
        reset_at=CASE WHEN arte_login_limit.reset_at<=NOW() THEN EXCLUDED.reset_at ELSE arte_login_limit.reset_at END RETURNING hits,reset_at`,
          [key, this.windowMs],
        );
        return { totalHits: rows[0].hits, resetTime: rows[0].reset_at };
      },
      async decrement(key) {
        await pool.query(
          "UPDATE arte_login_limit SET hits=GREATEST(0,hits-1) WHERE key=$1",
          [key],
        );
      },
      async resetKey(key) {
        await pool.query("DELETE FROM arte_login_limit WHERE key=$1", [key]);
      },
    };
    return { pool, sessions, offers, limiter, store: new DatabaseStore(pool) };
  } catch (e) {
    await pool.end();
    throw e;
  }
}
