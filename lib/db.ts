import Database from "better-sqlite3";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { COURSE_FORMATS, DEFAULT_PRICING, DEFAULT_SITE_SETTINGS, SCHOOL_LEVELS } from "@/lib/constants";
import { getDefaultAdminSeed } from "@/lib/auth";
import type { DashboardStats, Pricing, Reservation, ReservationStatus, SiteSettings, StudentProfile } from "@/lib/types";
import { normalizeMoroccanPhone } from "@/lib/utils";

type Provider = "sqlite" | "supabase";

type AdminRecord = {
  username: string;
  password_hash: string;
};

type ReservationRow = {
  id: number | string;
  student_name: string;
  school: string;
  level: StudentProfile;
  course_format: Reservation["courseFormat"];
  whatsapp: string;
  city: string;
  status: ReservationStatus;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
};

type PricingRow = {
  level: StudentProfile;
  price: number;
};

type SiteSettingsRow = {
  center_name: string;
  center_address: string;
  maps_url: string;
  format_pricing_json: string | null;
  course_formats_json: string;
};

type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushSubscriptionRow = {
  endpoint: string;
  subscription_json: string;
};

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "physique.db");
const requestedProvider = process.env.DATABASE_PROVIDER;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

let sqliteDb: Database.Database | null = null;
let sqliteInitialized = false;
let supabaseClient: SupabaseClient | null = null;
let supabaseSeedPromise: Promise<void> | null = null;

function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function getProvider(): Provider {
  if (requestedProvider === "supabase") {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase est sélectionné mais les variables d'environnement sont incomplètes.");
    }

    return "supabase";
  }

  if (requestedProvider === "sqlite") {
    return "sqlite";
  }

  return isSupabaseConfigured() ? "supabase" : "sqlite";
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase n'est pas configuré. Ajoutez NEXT_PUBLIC_SUPABASE_URL et une cle serveur valide: SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseClient;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapReservation(row: ReservationRow): Reservation {
  return {
    id: Number(row.id),
    studentName: row.student_name,
    school: row.school,
    level: row.level,
    courseFormat: row.course_format,
    whatsapp: row.whatsapp,
    city: row.city,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
  };
}

function normalizeSettings(row?: SiteSettingsRow | null): SiteSettings {
  if (!row) {
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    centerName: row.center_name,
    centerAddress: row.center_address,
    mapsUrl: row.maps_url,
    formatPricing: {
      ...DEFAULT_SITE_SETTINGS.formatPricing,
      ...parseJson(row.format_pricing_json, DEFAULT_SITE_SETTINGS.formatPricing),
    },
    courseFormats: parseJson(row.course_formats_json, DEFAULT_SITE_SETTINGS.courseFormats),
  };
}

function getSqliteDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!sqliteDb) {
    sqliteDb = new Database(dbPath);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("busy_timeout = 5000");
  }

  if (!sqliteInitialized) {
    initSqliteDb(sqliteDb);
    sqliteInitialized = true;
  }

  return sqliteDb;
}

function initSqliteDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      school TEXT NOT NULL,
      level TEXT NOT NULL,
      course_format TEXT NOT NULL DEFAULT 'Cours collectif mini groupe',
      whatsapp TEXT NOT NULL,
      city TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS pricing (
      level TEXT PRIMARY KEY,
      price INTEGER NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      center_name TEXT NOT NULL,
      center_address TEXT NOT NULL,
      maps_url TEXT NOT NULL,
      format_pricing_json TEXT NOT NULL DEFAULT '{}',
      course_formats_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      subscription_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const reservationColumns = database.prepare("PRAGMA table_info(reservations)").all() as Array<{ name: string }>;
  if (!reservationColumns.some((column) => column.name === "course_format")) {
    database.exec("ALTER TABLE reservations ADD COLUMN course_format TEXT NOT NULL DEFAULT 'Cours collectif mini groupe'");
  }

  const settingsColumns = database.prepare("PRAGMA table_info(site_settings)").all() as Array<{ name: string }>;
  if (!settingsColumns.some((column) => column.name === "format_pricing_json")) {
    database.exec("ALTER TABLE site_settings ADD COLUMN format_pricing_json TEXT NOT NULL DEFAULT '{}'");
  }

  const seed = getDefaultAdminSeed();
  database.prepare(
    `
      INSERT INTO admins (username, password_hash)
      VALUES (@username, @passwordHash)
      ON CONFLICT(username) DO NOTHING
    `,
  ).run(seed);

  const insertPricing = database.prepare(
    `
      INSERT INTO pricing (level, price)
      VALUES (@level, @price)
      ON CONFLICT(level) DO NOTHING
    `,
  );

  for (const level of SCHOOL_LEVELS) {
    insertPricing.run({ level, price: DEFAULT_PRICING[level] });
  }

  database.prepare(
    `
      INSERT INTO site_settings (id, center_name, center_address, maps_url, course_formats_json)
      VALUES (1, @centerName, @centerAddress, @mapsUrl, @courseFormatsJson)
      ON CONFLICT(id) DO NOTHING
    `,
  ).run({
    centerName: DEFAULT_SITE_SETTINGS.centerName,
    centerAddress: DEFAULT_SITE_SETTINGS.centerAddress,
    mapsUrl: DEFAULT_SITE_SETTINGS.mapsUrl,
    courseFormatsJson: JSON.stringify(DEFAULT_SITE_SETTINGS.courseFormats),
  });

  database.prepare(
    `
      UPDATE site_settings
      SET format_pricing_json = COALESCE(NULLIF(format_pricing_json, '{}'), @formatPricingJson)
      WHERE id = 1
    `,
  ).run({
    formatPricingJson: JSON.stringify(DEFAULT_SITE_SETTINGS.formatPricing),
  });
}

async function ensureSupabaseSeed() {
  if (supabaseSeedPromise) {
    return supabaseSeedPromise;
  }

  supabaseSeedPromise = (async () => {
    const supabase = getSupabaseClient();
    const seed = getDefaultAdminSeed();

    const adminResult = await supabase.from("admins").upsert(
      {
        username: seed.username,
        password_hash: seed.passwordHash,
      },
      { onConflict: "username", ignoreDuplicates: true },
    );

    if (adminResult.error) {
      throw formatSupabaseError(adminResult.error);
    }

    const pricingRows = SCHOOL_LEVELS.map((level) => ({
      level,
      price: DEFAULT_PRICING[level],
      updated_at: new Date().toISOString(),
    }));

    const pricingResult = await supabase.from("pricing").upsert(pricingRows, {
      onConflict: "level",
      ignoreDuplicates: true,
    });

    if (pricingResult.error) {
      throw formatSupabaseError(pricingResult.error);
    }

    const settingsResult = await supabase.from("site_settings").upsert(
      {
        id: 1,
        center_name: DEFAULT_SITE_SETTINGS.centerName,
        center_address: DEFAULT_SITE_SETTINGS.centerAddress,
        maps_url: DEFAULT_SITE_SETTINGS.mapsUrl,
        format_pricing_json: JSON.stringify(DEFAULT_SITE_SETTINGS.formatPricing),
        course_formats_json: JSON.stringify(DEFAULT_SITE_SETTINGS.courseFormats),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    if (settingsResult.error) {
      throw formatSupabaseError(settingsResult.error);
    }

    const existingSettings = await supabase
      .from("site_settings")
      .select("format_pricing_json, course_formats_json")
      .eq("id", 1)
      .maybeSingle<Pick<SiteSettingsRow, "format_pricing_json" | "course_formats_json">>();

    if (existingSettings.error) {
      throw formatSupabaseError(existingSettings.error);
    }

    const needsFormatPricing = !existingSettings.data?.format_pricing_json || existingSettings.data.format_pricing_json === "{}";
    const needsCourseFormats = !existingSettings.data?.course_formats_json;

    if (needsFormatPricing || needsCourseFormats) {
      const patchResult = await supabase
        .from("site_settings")
        .update({
          format_pricing_json: needsFormatPricing
            ? JSON.stringify(DEFAULT_SITE_SETTINGS.formatPricing)
            : existingSettings.data?.format_pricing_json,
          course_formats_json: needsCourseFormats
            ? JSON.stringify(DEFAULT_SITE_SETTINGS.courseFormats)
            : existingSettings.data?.course_formats_json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (patchResult.error) {
        throw formatSupabaseError(patchResult.error);
      }
    }

    const pushSubscriptionsResult = await supabase.from("push_subscriptions").select("endpoint").limit(1);
    if (pushSubscriptionsResult.error && pushSubscriptionsResult.error.message.includes("does not exist")) {
      throw formatSupabaseError(pushSubscriptionsResult.error);
    }
  })().catch((error) => {
    supabaseSeedPromise = null;
    throw error;
  });

  return supabaseSeedPromise;
}

function formatSupabaseError(error: { message: string; code?: string }) {
  if (error.message.includes("relation") && error.message.includes("does not exist")) {
    return new Error("Les tables Supabase n'existent pas encore. Exécutez le fichier supabase/schema.sql dans votre projet Supabase.");
  }

  return new Error(error.code ? `${error.message} (${error.code})` : error.message);
}

async function getAdminByUsernameSqlite(username: string) {
  return getSqliteDb().prepare("SELECT username, password_hash FROM admins WHERE username = ?").get(username) as
    | AdminRecord
    | undefined;
}

async function getAdminByUsernameSupabase(username: string) {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("admins")
    .select("username, password_hash")
    .eq("username", username)
    .maybeSingle<AdminRecord>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return data ?? undefined;
}

export async function getAdminByUsername(username: string) {
  return getProvider() === "supabase" ? getAdminByUsernameSupabase(username) : getAdminByUsernameSqlite(username);
}

async function createReservationSqlite(input: Omit<Reservation, "id" | "status" | "createdAt" | "updatedAt" | "confirmedAt">) {
  const now = new Date().toISOString();
  const result = getSqliteDb()
    .prepare(
      `
        INSERT INTO reservations (student_name, school, level, course_format, whatsapp, city, status, created_at, updated_at)
        VALUES (@studentName, @school, @level, @courseFormat, @whatsapp, @city, 'pending', @createdAt, @updatedAt)
      `,
    )
    .run({
      ...input,
      whatsapp: normalizeMoroccanPhone(input.whatsapp),
      createdAt: now,
      updatedAt: now,
    });

  return getReservationByIdSqlite(Number(result.lastInsertRowid));
}

async function createReservationSupabase(input: Omit<Reservation, "id" | "status" | "createdAt" | "updatedAt" | "confirmedAt">) {
  await ensureSupabaseSeed();
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .insert({
      student_name: input.studentName,
      school: input.school,
      level: input.level,
      course_format: input.courseFormat,
      whatsapp: normalizeMoroccanPhone(input.whatsapp),
      city: input.city,
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single<ReservationRow>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return mapReservation(data);
}

export async function createReservation(input: Omit<Reservation, "id" | "status" | "createdAt" | "updatedAt" | "confirmedAt">) {
  return getProvider() === "supabase" ? createReservationSupabase(input) : createReservationSqlite(input);
}

async function getReservationByIdSqlite(id: number) {
  const row = getSqliteDb().prepare("SELECT * FROM reservations WHERE id = ?").get(id) as ReservationRow | undefined;
  return row ? mapReservation(row) : null;
}

async function getReservationByIdSupabase(id: number) {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle<ReservationRow>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return data ? mapReservation(data) : null;
}

export async function getReservationById(id: number) {
  return getProvider() === "supabase" ? getReservationByIdSupabase(id) : getReservationByIdSqlite(id);
}

async function getReservationsSqlite() {
  const rows = getSqliteDb().prepare("SELECT * FROM reservations ORDER BY id DESC").all() as ReservationRow[];
  return rows.map(mapReservation);
}

async function getReservationsSupabase() {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .select("*")
    .order("id", { ascending: false })
    .returns<ReservationRow[]>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return (data ?? []).map(mapReservation);
}

export async function getReservations() {
  return getProvider() === "supabase" ? getReservationsSupabase() : getReservationsSqlite();
}

async function getLatestReservationSqlite() {
  const row = getSqliteDb().prepare("SELECT * FROM reservations ORDER BY id DESC LIMIT 1").get() as ReservationRow | undefined;
  return row ? mapReservation(row) : null;
}

async function getLatestReservationSupabase() {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .select("*")
    .order("id", { ascending: false })
    .limit(1)
    .returns<ReservationRow[]>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return data?.[0] ? mapReservation(data[0]) : null;
}

export async function getLatestReservation() {
  return getProvider() === "supabase" ? getLatestReservationSupabase() : getLatestReservationSqlite();
}

async function updateReservationSqlite(
  id: number,
  input: Omit<Reservation, "id" | "createdAt" | "updatedAt" | "confirmedAt">,
) {
  const now = new Date().toISOString();
  const confirmedAt = input.status === "confirmed" ? now : null;

  getSqliteDb().prepare(
    `
      UPDATE reservations
      SET student_name = @studentName,
          school = @school,
          level = @level,
          course_format = @courseFormat,
          whatsapp = @whatsapp,
          city = @city,
          status = @status,
          updated_at = @updatedAt,
          confirmed_at = @confirmedAt
      WHERE id = @id
    `,
  ).run({
    id,
    ...input,
    whatsapp: normalizeMoroccanPhone(input.whatsapp),
    updatedAt: now,
    confirmedAt,
  });

  return getReservationByIdSqlite(id);
}

async function updateReservationSupabase(
  id: number,
  input: Omit<Reservation, "id" | "createdAt" | "updatedAt" | "confirmedAt">,
) {
  await ensureSupabaseSeed();
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .update({
      student_name: input.studentName,
      school: input.school,
      level: input.level,
      course_format: input.courseFormat,
      whatsapp: normalizeMoroccanPhone(input.whatsapp),
      city: input.city,
      status: input.status,
      updated_at: now,
      confirmed_at: input.status === "confirmed" ? now : null,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle<ReservationRow>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return data ? mapReservation(data) : null;
}

export async function updateReservation(
  id: number,
  input: Omit<Reservation, "id" | "createdAt" | "updatedAt" | "confirmedAt">,
) {
  return getProvider() === "supabase" ? updateReservationSupabase(id, input) : updateReservationSqlite(id, input);
}

async function confirmReservationSqlite(id: number) {
  const now = new Date().toISOString();
  getSqliteDb().prepare(
    `
      UPDATE reservations
      SET status = 'confirmed',
          updated_at = ?,
          confirmed_at = ?
      WHERE id = ?
    `,
  ).run(now, now, id);

  return getReservationByIdSqlite(id);
}

async function confirmReservationSupabase(id: number) {
  await ensureSupabaseSeed();
  const now = new Date().toISOString();
  const { data, error } = await getSupabaseClient()
    .from("reservations")
    .update({
      status: "confirmed",
      updated_at: now,
      confirmed_at: now,
    })
    .eq("id", id)
    .select("*")
    .maybeSingle<ReservationRow>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return data ? mapReservation(data) : null;
}

export async function confirmReservation(id: number) {
  return getProvider() === "supabase" ? confirmReservationSupabase(id) : confirmReservationSqlite(id);
}

async function deleteReservationSqlite(id: number) {
  return getSqliteDb().prepare("DELETE FROM reservations WHERE id = ?").run(id);
}

async function deleteReservationSupabase(id: number) {
  await ensureSupabaseSeed();
  const { error } = await getSupabaseClient().from("reservations").delete().eq("id", id);
  if (error) {
    throw formatSupabaseError(error);
  }

  return { changes: 1 };
}

export async function deleteReservation(id: number) {
  return getProvider() === "supabase" ? deleteReservationSupabase(id) : deleteReservationSqlite(id);
}

async function getPricingSqlite(): Promise<Pricing> {
  const rows = getSqliteDb().prepare("SELECT level, price FROM pricing").all() as PricingRow[];
  return rows.reduce(
    (acc, row) => {
      acc[row.level] = row.price;
      return acc;
    },
    { ...DEFAULT_PRICING },
  );
}

async function getPricingSupabase(): Promise<Pricing> {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient().from("pricing").select("level, price").returns<PricingRow[]>();
  if (error) {
    throw formatSupabaseError(error);
  }

  return (data ?? []).reduce(
    (acc, row) => {
      acc[row.level] = row.price;
      return acc;
    },
    { ...DEFAULT_PRICING },
  );
}

export async function getPricing() {
  return getProvider() === "supabase" ? getPricingSupabase() : getPricingSqlite();
}

async function updatePricingSqlite(pricing: Pricing) {
  const now = new Date().toISOString();
  const database = getSqliteDb();
  const statement = database.prepare(
    `
      INSERT INTO pricing (level, price, updated_at)
      VALUES (@level, @price, @updatedAt)
      ON CONFLICT(level) DO UPDATE SET
        price = excluded.price,
        updated_at = excluded.updated_at
    `,
  );

  const transaction = database.transaction((input: Pricing) => {
    for (const level of SCHOOL_LEVELS) {
      statement.run({
        level,
        price: input[level],
        updatedAt: now,
      });
    }
  });

  transaction(pricing);
  return getPricingSqlite();
}

async function updatePricingSupabase(pricing: Pricing) {
  await ensureSupabaseSeed();
  const now = new Date().toISOString();
  const rows = SCHOOL_LEVELS.map((level) => ({
    level,
    price: pricing[level],
    updated_at: now,
  }));
  const { error } = await getSupabaseClient().from("pricing").upsert(rows, { onConflict: "level" });
  if (error) {
    throw formatSupabaseError(error);
  }

  return getPricingSupabase();
}

export async function updatePricing(pricing: Pricing) {
  return getProvider() === "supabase" ? updatePricingSupabase(pricing) : updatePricingSqlite(pricing);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [settings, reservations] = await Promise.all([getSiteSettings(), getReservations()]);
  const today = new Date().toISOString().slice(0, 10);
  const getReservationValue = (reservation: Reservation) => settings.formatPricing[reservation.courseFormat] ?? 0;

  return {
    totalReservations: reservations.length,
    todayReservations: reservations.filter((reservation) => reservation.createdAt.slice(0, 10) === today).length,
    confirmedReservations: reservations.filter((reservation) => reservation.status === "confirmed").length,
    estimatedRevenue: reservations
      .filter((reservation) => reservation.status === "confirmed")
      .reduce((total, reservation) => total + getReservationValue(reservation), 0),
    pendingRevenue: reservations
      .filter((reservation) => reservation.status === "pending")
      .reduce((total, reservation) => total + getReservationValue(reservation), 0),
    revenueByFormat: COURSE_FORMATS.map((format) => {
      const confirmed = reservations.filter((reservation) => reservation.status === "confirmed" && reservation.courseFormat === format);
      return {
        format,
        count: confirmed.length,
        revenue: confirmed.reduce((total, reservation) => total + getReservationValue(reservation), 0),
      };
    }),
    levelBreakdown: SCHOOL_LEVELS.map((level) => ({
      level,
      count: reservations.filter((reservation) => reservation.level === level).length,
    })),
  };
}

async function getSiteSettingsSqlite() {
  const row = getSqliteDb()
    .prepare("SELECT center_name, center_address, maps_url, format_pricing_json, course_formats_json FROM site_settings WHERE id = 1")
    .get() as SiteSettingsRow | undefined;

  return normalizeSettings(row);
}

async function getSiteSettingsSupabase() {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("site_settings")
    .select("center_name, center_address, maps_url, format_pricing_json, course_formats_json")
    .eq("id", 1)
    .maybeSingle<SiteSettingsRow>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return normalizeSettings(data);
}

export async function getSiteSettings() {
  return getProvider() === "supabase" ? getSiteSettingsSupabase() : getSiteSettingsSqlite();
}

async function updateSiteSettingsSqlite(settings: SiteSettings) {
  const now = new Date().toISOString();
  getSqliteDb().prepare(
    `
      INSERT INTO site_settings (id, center_name, center_address, maps_url, course_formats_json, updated_at)
      VALUES (1, @centerName, @centerAddress, @mapsUrl, @courseFormatsJson, @updatedAt)
      ON CONFLICT(id) DO UPDATE SET
        center_name = excluded.center_name,
        center_address = excluded.center_address,
        maps_url = excluded.maps_url,
        course_formats_json = excluded.course_formats_json,
        updated_at = excluded.updated_at
    `,
  ).run({
    centerName: settings.centerName,
    centerAddress: settings.centerAddress,
    mapsUrl: settings.mapsUrl,
    courseFormatsJson: JSON.stringify(settings.courseFormats),
    updatedAt: now,
  });

  getSqliteDb().prepare(
    "UPDATE site_settings SET format_pricing_json = @formatPricingJson, updated_at = @updatedAt WHERE id = 1",
  ).run({
    formatPricingJson: JSON.stringify(settings.formatPricing),
    updatedAt: now,
  });

  return getSiteSettingsSqlite();
}

async function updateSiteSettingsSupabase(settings: SiteSettings) {
  await ensureSupabaseSeed();
  const { error } = await getSupabaseClient().from("site_settings").upsert(
    {
      id: 1,
      center_name: settings.centerName,
      center_address: settings.centerAddress,
      maps_url: settings.mapsUrl,
      format_pricing_json: JSON.stringify(settings.formatPricing),
      course_formats_json: JSON.stringify(settings.courseFormats),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    throw formatSupabaseError(error);
  }

  return getSiteSettingsSupabase();
}

export async function updateSiteSettings(settings: SiteSettings) {
  return getProvider() === "supabase" ? updateSiteSettingsSupabase(settings) : updateSiteSettingsSqlite(settings);
}

async function getPushSubscriptionsSqlite() {
  const rows = getSqliteDb().prepare("SELECT endpoint, subscription_json FROM push_subscriptions").all() as PushSubscriptionRow[];
  return rows
    .map((row) => parseJson<StoredPushSubscription | null>(row.subscription_json, null))
    .filter(
      (subscription): subscription is StoredPushSubscription =>
        Boolean(subscription?.endpoint && subscription.keys?.auth && subscription.keys?.p256dh),
    );
}

async function getPushSubscriptionsSupabase() {
  await ensureSupabaseSeed();
  const { data, error } = await getSupabaseClient()
    .from("push_subscriptions")
    .select("endpoint, subscription_json")
    .returns<PushSubscriptionRow[]>();

  if (error) {
    throw formatSupabaseError(error);
  }

  return (data ?? [])
    .map((row) => parseJson<StoredPushSubscription | null>(row.subscription_json, null))
    .filter(
      (subscription): subscription is StoredPushSubscription =>
        Boolean(subscription?.endpoint && subscription.keys?.auth && subscription.keys?.p256dh),
    );
}

export async function getPushSubscriptions() {
  return getProvider() === "supabase" ? getPushSubscriptionsSupabase() : getPushSubscriptionsSqlite();
}

async function upsertPushSubscriptionSqlite(subscription: StoredPushSubscription) {
  const now = new Date().toISOString();
  getSqliteDb().prepare(
    `
      INSERT INTO push_subscriptions (endpoint, subscription_json, created_at, updated_at)
      VALUES (@endpoint, @subscriptionJson, @createdAt, @updatedAt)
      ON CONFLICT(endpoint) DO UPDATE SET
        subscription_json = excluded.subscription_json,
        updated_at = excluded.updated_at
    `,
  ).run({
    endpoint: subscription.endpoint,
    subscriptionJson: JSON.stringify(subscription),
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertPushSubscriptionSupabase(subscription: StoredPushSubscription) {
  await ensureSupabaseSeed();
  const { error } = await getSupabaseClient().from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      subscription_json: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    throw formatSupabaseError(error);
  }
}

export async function upsertPushSubscription(subscription: StoredPushSubscription) {
  return getProvider() === "supabase"
    ? upsertPushSubscriptionSupabase(subscription)
    : upsertPushSubscriptionSqlite(subscription);
}

async function deletePushSubscriptionByEndpointSqlite(endpoint: string) {
  getSqliteDb().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

async function deletePushSubscriptionByEndpointSupabase(endpoint: string) {
  await ensureSupabaseSeed();
  const { error } = await getSupabaseClient().from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    throw formatSupabaseError(error);
  }
}

export async function deletePushSubscriptionByEndpoint(endpoint: string) {
  return getProvider() === "supabase"
    ? deletePushSubscriptionByEndpointSupabase(endpoint)
    : deletePushSubscriptionByEndpointSqlite(endpoint);
}
