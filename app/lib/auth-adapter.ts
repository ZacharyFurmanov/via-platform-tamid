import { neon } from "@neondatabase/serverless";
import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";

const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is not set.");
  }
  return url;
};

export async function initAuthTables() {
  const sql = neon(getDatabaseUrl());

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255),
      email VARCHAR(255) NOT NULL UNIQUE,
      email_verified TIMESTAMP WITH TIME ZONE,
      image TEXT,
      notification_emails_enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      provider VARCHAR(100) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at BIGINT,
      token_type VARCHAR(50),
      scope TEXT,
      id_token TEXT,
      UNIQUE(provider, provider_account_id)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier VARCHAR(255) NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires TIMESTAMP WITH TIME ZONE NOT NULL,
      PRIMARY KEY (identifier, token)
    )
  `;
}

let tablesInitialized = false;
async function ensureTables() {
  if (!tablesInitialized) {
    await initAuthTables();
    tablesInitialized = true;
  }
}

function mapUser(row: Record<string, unknown>): AdapterUser {
  return {
    id: row.id as string,
    name: (row.name as string) ?? null,
    email: row.email as string,
    emailVerified: row.email_verified ? new Date(row.email_verified as string) : null,
    image: (row.image as string) ?? null,
  };
}

export const neonAdapter: Adapter = {
  async createUser(user) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`
      INSERT INTO users (name, email, email_verified, image)
      VALUES (${user.name ?? null}, ${user.email}, ${user.emailVerified?.toISOString() ?? null}, ${user.image ?? null})
      RETURNING *
    `;
    return mapUser(rows[0]);
  },

  async getUser(id) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`SELECT * FROM users WHERE id = ${id}`;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByEmail(email) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`SELECT * FROM users WHERE email = ${email}`;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`
      SELECT u.* FROM users u
      JOIN accounts a ON a.user_id = u.id
      WHERE a.provider = ${provider} AND a.provider_account_id = ${providerAccountId}
    `;
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async updateUser(user) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`
      UPDATE users SET
        name = COALESCE(${user.name ?? null}, name),
        email = COALESCE(${user.email ?? null}, email),
        email_verified = COALESCE(${user.emailVerified?.toISOString() ?? null}, email_verified),
        image = COALESCE(${user.image ?? null}, image),
        updated_at = NOW()
      WHERE id = ${user.id!}
      RETURNING *
    `;
    return mapUser(rows[0]);
  },

  async linkAccount(account) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    await sql`
      INSERT INTO accounts (user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token)
      VALUES (
        ${account.userId},
        ${account.type},
        ${account.provider},
        ${account.providerAccountId},
        ${account.refresh_token ?? null},
        ${account.access_token ?? null},
        ${account.expires_at ?? null},
        ${account.token_type ?? null},
        ${account.scope ?? null},
        ${account.id_token ?? null}
      )
    `;
    return account as AdapterAccount;
  },

  async createVerificationToken(token) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`
      INSERT INTO verification_tokens (identifier, token, expires)
      VALUES (${token.identifier}, ${token.token}, ${token.expires.toISOString()})
      RETURNING *
    `;
    return {
      identifier: rows[0].identifier as string,
      token: rows[0].token as string,
      expires: new Date(rows[0].expires as string),
    };
  },

  async useVerificationToken({ identifier, token }) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    const rows = await sql`
      DELETE FROM verification_tokens
      WHERE identifier = ${identifier} AND token = ${token}
      RETURNING *
    `;
    if (!rows[0]) return null;
    return {
      identifier: rows[0].identifier as string,
      token: rows[0].token as string,
      expires: new Date(rows[0].expires as string),
    };
  },

  async deleteUser(userId) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    await sql`DELETE FROM users WHERE id = ${userId}`;
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await ensureTables();
    const sql = neon(getDatabaseUrl());
    await sql`DELETE FROM accounts WHERE provider = ${provider} AND provider_account_id = ${providerAccountId}`;
  },
};
