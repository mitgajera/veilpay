import {
  pgTable,
  text,
  timestamp,
  boolean,
  bigint,
  integer,
  jsonb,
  uuid,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

/** Wallet = identity. The base58 address is the primary key for a user. */
export const users = pgTable("users", {
  address: text("address").primaryKey(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Short-lived SIWS nonces. Consumed on verify. */
export const authNonces = pgTable(
  "auth_nonces",
  {
    nonce: text("nonce").primaryKey(),
    address: text("address").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("auth_nonces_address_idx").on(t.address)],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerAddress: text("owner_address").notNull(),
    label: text("label").notNull(),
    address: text("address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("contacts_owner_idx").on(t.ownerAddress),
    uniqueIndex("contacts_owner_address_uq").on(t.ownerAddress, t.address),
  ],
);

export const requestStatus = pgEnum("request_status", ["open", "paid", "cancelled", "expired"]);

export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorAddress: text("creator_address").notNull(),
    payerAddress: text("payer_address"), // optional: targeted request
    mint: text("mint").notNull(),
    amount: bigint("amount", { mode: "bigint" }), // null = "any amount"
    memo: text("memo"),
    status: requestStatus("status").default("open").notNull(),
    fulfilledSignature: text("fulfilled_signature"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (t) => [
    index("requests_creator_idx").on(t.creatorAddress),
    index("requests_payer_idx").on(t.payerAddress),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAddress: text("user_address").notNull(),
    kind: text("kind").notNull(), // transfer_received | deposit_confirmed | request_paid | audit_granted | ...
    title: text("title").notNull(),
    body: text("body"),
    data: jsonb("data"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notifications_user_idx").on(t.userAddress, t.createdAt)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userAddress: text("user_address").notNull(),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("push_endpoint_uq").on(t.endpoint)],
);

export const notificationPrefs = pgTable("notification_prefs", {
  userAddress: text("user_address").primaryKey(),
  transferReceived: boolean("transfer_received").default(true).notNull(),
  depositConfirmed: boolean("deposit_confirmed").default(true).notNull(),
  requestPaid: boolean("request_paid").default(true).notNull(),
  auditGranted: boolean("audit_granted").default(true).notNull(),
  webPushEnabled: boolean("web_push_enabled").default(false).notNull(),
});

export const mints = pgTable("mints", {
  mint: text("mint").primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
  decimals: integer("decimals").notNull(),
  logoUrl: text("logo_url"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Indexed on-chain events (amount-less for confidential transfers). */
export const indexedTxs = pgTable(
  "indexed_txs",
  {
    signature: text("signature").primaryKey(),
    slot: bigint("slot", { mode: "bigint" }).notNull(),
    kind: text("kind").notNull(), // deposit | transfer | withdraw | reveal
    mint: text("mint"),
    fromAddress: text("from_address"),
    toAddress: text("to_address"),
    publicAmount: bigint("public_amount", { mode: "bigint" }), // null for confidential transfers
    encrypted: boolean("encrypted").default(false).notNull(),
    blockTime: timestamp("block_time", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("txs_from_idx").on(t.fromAddress, t.slot),
    index("txs_to_idx").on(t.toAddress, t.slot),
  ],
);

/** Pre-launch email waitlist. Email is unique (case-folded before insert). */
export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    source: text("source").default("landing").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("waitlist_email_uq").on(t.email)],
);

export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type IndexedTx = typeof indexedTxs.$inferSelect;
