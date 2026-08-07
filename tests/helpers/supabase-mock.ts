/* eslint-disable no-unused-vars, @typescript-eslint/no-explicit-any -- shared mock helper types intentionally loose */
/**
 * Shared chainable Supabase mock factory (RED-04).
 *
 * Single source for the `from(...).select().eq().in().ilike()...then()` builder
 * that ~27 test files duplicated in slightly divergent copies. Pick this helper
 * over the local factories in new tests.
 *
 * T O D O (out of scope for this lane): migrate the remaining local
 * `makeSupabase` duplicates (~24 files) to import from here:
 *   - The `(authError) => ({ auth: ... })` auth-only mocks (login, registro,
 *     forgot/reset-password) only need a `.rpc`/`.auth` stub — fold them into
 *     `makeAuthClient` or accept the small gap.
 *   - Files with insert/single/limit-specific behavior (eventos/nuevo,
 *     [id]/event-sessions, [id]/participation, personajes/nuevo, [id]/editar,
 *     historias/nueva, forum follow/thread/editar, threads) can map onto the
 *     `tables`/`resolve`/`single`/`inserted` options below.
 */
import type { Mock } from "vitest";

export type Handler = (...args: unknown[]) => unknown;

export interface CallRecord {
  table: string;
  method: string;
  args: unknown[];
}

/** Chain state visible to a custom `resolve` function at .then() time. */
export interface ChainContext {
  table: string;
  /** columns passed to .order(), in call order */
  orders: string[];
  /** "ilike:<col>" / "in:<col>" markers, in call order (foro-style resolution) */
  marks: string[];
  /** in-clause values per column, coerced to strings */
  inSet: Record<string, string[]>;
  /** true when the chain used .eq('status','aprobado') (gm KPI routing) */
  approved: boolean;
  limited: boolean;
}

export interface SupabaseMockOptions {
  /** Per-table rows resolved by a plain chain; null degrades like a missing row. */
  tables?: Partial<Record<string, unknown[] | null>>;
  /** Rows returned when the chain filters .eq('status','aprobado') (gm KPI). */
  approved?: Partial<Record<string, unknown[]>>;
  /** Custom per-table resolution; return undefined to fall through to tables/[]. */
  resolve?: (table: string, ctx: ChainContext) => unknown[] | null | undefined;
  /** Per-table .single() / .maybeSingle() results (e.g. user_sanctions). */
  single?: Partial<Record<string, unknown>>;
  /** rpc name → mock; invoked with the params, error stays null when present. */
  rpc?: Partial<Record<string, Mock>>;
  /** Callback receiving .order() columns when a threads chain resolves. */
  threadsOrder?: (orders: string[]) => void;
  /** Rows appended to per-table by .insert(). */
  inserted?: Partial<Record<string, unknown[]>>;
  /** Error returned by .insert(). */
  insertError?: unknown;
}

export interface SupabaseMock {
  from: (table: string) => any;
  /** Invokes the configured rpc mock (if any); error is null when a mock exists. */
  rpc?: (name: string, params?: unknown) => Promise<{ data: unknown; error: unknown }>;
  calls: CallRecord[];
  tables: Partial<Record<string, unknown[] | null>>;
}

export function makeSupabase(options: SupabaseMockOptions = {}): SupabaseMock {
  const calls: CallRecord[] = [];
  const record = (table: string, method: string, ...args: unknown[]) =>
    void calls.push({ table, method, args });

  const from = (table: string) => {
    const marks: string[] = [];
    const inSet: Record<string, string[]> = {};
    const orders: string[] = [];
    let limited = false;
    let approved = false;

    const ctx: ChainContext = {
      table,
      get orders() {
        return orders;
      },
      get marks() {
        return marks;
      },
      get inSet() {
        return inSet;
      },
      get approved() {
        return approved;
      },
      get limited() {
        return limited;
      },
    };

    const resolveData = (): unknown => {
      let data: unknown;
      if (approved) data = options.approved?.[table] ?? [];
      if (data === undefined && options.resolve) {
        const r = options.resolve(table, ctx);
        if (r !== undefined) data = r;
      }
      if (data === undefined) {
        const has = Boolean(
          options.tables && Object.prototype.hasOwnProperty.call(options.tables, table),
        );
        data = has ? (options.tables as Record<string, unknown[] | null>)[table] : [];
      }
      return data;
    };

    const builder: Record<string, unknown> = {
      select: (...a: unknown[]) => {
        record(table, "select", ...a);
        return builder;
      },
      eq: (col: string, val: unknown) => {
        record(table, "eq", col, val);
        if (col === "status" && val === "aprobado") approved = true;
        return builder;
      },
      neq: (...a: unknown[]) => {
        record(table, "neq", ...a);
        return builder;
      },
      in: (col: string, values: unknown[]) => {
        record(table, "in", col, values);
        marks.push(`in:${col}`);
        inSet[col] = (values ?? []).map(String);
        return builder;
      },
      ilike: (col: string, pattern: unknown) => {
        record(table, "ilike", col, pattern);
        marks.push(`ilike:${col}`);
        return builder;
      },
      like: (...a: unknown[]) => {
        record(table, "like", ...a);
        return builder;
      },
      or: (...a: unknown[]) => {
        record(table, "or", ...a);
        return builder;
      },
      not: (...a: unknown[]) => {
        record(table, "not", ...a);
        return builder;
      },
      order: (col: string, ...a: unknown[]) => {
        record(table, "order", col, ...a);
        orders.push(col);
        return builder;
      },
      limit: (n: unknown) => {
        record(table, "limit", n);
        limited = true;
        return builder;
      },
      returns: () => builder,
      maybeSingle: () => {
        record(table, "maybeSingle");
        if (options.single && Object.prototype.hasOwnProperty.call(options.single, table)) {
          return Promise.resolve({ data: options.single[table], error: null });
        }
        return Promise.resolve({ data: null, error: null });
      },
      single: () => {
        record(table, "single");
        if (options.inserted?.[table]?.length) {
          const inserted = options.inserted[table];
          const row = inserted[inserted.length - 1] as Record<string, unknown>;
          return Promise.resolve({
            data: { id: row.id ?? "new", ...row },
            error: options.insertError ?? null,
          });
        }
        return Promise.resolve({
          data: options.single && Object.prototype.hasOwnProperty.call(options.single, table)
            ? options.single[table]
            : null,
          error: null,
        });
      },
      insert: (row: Record<string, unknown>) => {
        record(table, "insert", row);
        (options.inserted ??= {});
        (options.inserted[table] ??= []).push(row);
        return builder;
      },
      upsert: (row: Record<string, unknown>) => {
        record(table, "upsert", row);
        (options.inserted ??= {});
        (options.inserted[table] ??= []).push(row);
        return builder;
      },
      update: (patch: Record<string, unknown>) => {
        record(table, "update", patch);
        return builder;
      },
      delete: () => {
        record(table, "delete");
        return builder;
      },
      then: (res: Handler, rej: Handler) => {
        const data = resolveData();
        if (options.threadsOrder && table === "threads") options.threadsOrder(orders);
        return Promise.resolve({ data, error: null }).then(res, rej);
      },
    };
    return builder;
  };

  return {
    from,
    rpc: (name: string, params?: unknown) => {
      const mock = options.rpc?.[name];
      if (mock) mock(params);
      return Promise.resolve({ data: null, error: mock ? null : { message: `no rpc ${name}` } });
    },
    calls,
    tables: options.tables ?? {},
  };
}

export function makeLocals(
  supabase: SupabaseMock,
  role: string = "pendiente",
  userId: string = "u1",
) {
  return {
    supabase,
    user: role === "pendiente" ? null : { id: userId },
    profile: { id: userId, role },
  };
}

export function makeEvent(
  locals: unknown,
  query: string = "",
  path: string = "/foro",
  params: Record<string, unknown> = {},
) {
  return { locals, url: new URL(`http://localhost${path}${query}`), params };
}