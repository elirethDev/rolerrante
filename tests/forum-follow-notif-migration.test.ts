import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// RED analysis-level test: no live Postgres in this environment, so we statically
// verify the migration file is self-consistent with the required DDL, RLS bodies,
// trigger and indexes (the "applies on a clean DB" proxy) for Slice 1 of
// forum-follow-notif (tables + RLS + trigger, no UI).
const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260803000000_thread_follows_notifications.sql",
);
const sql = readFileSync(migrationPath, "utf8");

const updatePolicyPath = resolve(
  process.cwd(),
  "supabase/migrations/20260803000001_thread_follows_update_policy.sql",
);
const updatePolicySql = readFileSync(updatePolicyPath, "utf8");

const notificationsUpdatePolicyPath = resolve(
  process.cwd(),
  "supabase/migrations/20260803000002_notifications_update_policy.sql",
);
const notificationsUpdatePolicySql = readFileSync(
  notificationsUpdatePolicyPath,
  "utf8",
);

describe("thread_follows_notifications migration", () => {
  it("defines thread_follows with RLS enabled (REQ-FOLLOW-01)", () => {
    expect(sql).toContain("CREATE TABLE public.thread_follows");
    expect(sql).toContain(
      "ALTER TABLE public.thread_follows ENABLE ROW LEVEL SECURITY;",
    );
  });

  it("thread_follows has UNIQUE(thread_id, user_id) and notify_in_app default true (REQ-FOLLOW-01/02)", () => {
    expect(sql).toMatch(
      /thread_id\s+uuid\s+NOT NULL\s+REFERENCES public\.threads\s*\(id\)/,
    );
    expect(sql).toMatch(
      /user_id\s+uuid\s+NOT NULL\s+REFERENCES public\.profiles\s*\(id\)/,
    );
    expect(sql).toMatch(/notify_in_app\s+boolean\s+NOT NULL\s+DEFAULT\s+true/);
    expect(sql).toMatch(/UNIQUE\s*\(\s*thread_id\s*,\s*user_id\s*\)/);
  });

  it("defines notifications with RLS enabled and type CHECK (REQ-NOTIF-01)", () => {
    expect(sql).toContain("CREATE TABLE public.notifications");
    expect(sql).toContain(
      "ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;",
    );
    expect(sql).toMatch(
      /type\s+text\s+NOT NULL\s+CHECK\s*\(\s*type\s*=\s*'new_reply'\s*\)/s,
    );
  });

  it("notifications references threads/posts/profiles with CASCADE where appropriate", () => {
    expect(sql).toMatch(
      /thread_id\s+uuid\s+NOT NULL\s+REFERENCES public\.threads\s*\(id\)\s+ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /post_id\s+uuid\s+NOT NULL\s+REFERENCES public\.posts\s*\(id\)\s+ON DELETE CASCADE/,
    );
    expect(sql).toMatch(
      /user_id\s+uuid\s+NOT NULL\s+REFERENCES public\.profiles\s*\(id\)/,
    );
    expect(sql).toMatch(
      /actor_id\s+uuid\s+NOT NULL\s+REFERENCES public\.profiles\s*\(id\)/,
    );
  });

  it("thread_follows RLS confines follows to the owner (REQ-FOLLOW-01)", () => {
    // SELECT policy restricted to the owner.
    const selectPolicy =
      /CREATE POLICY ".*?" ON public\.thread_follows\s*FOR SELECT USING \((.*?)\);/s.exec(
        sql,
      );
    expect(selectPolicy).not.toBeNull();
    expect(selectPolicy![1]).toMatch(/user_id = auth\.uid\(\)/);

    // INSERT policy must carry a WITH CHECK so a user cannot follow for someone else.
    const insertPolicy =
      /CREATE POLICY ".*?" ON public\.thread_follows\s*FOR INSERT WITH CHECK \((.*?)\);/s.exec(
        sql,
      );
    expect(insertPolicy).not.toBeNull();
    expect(insertPolicy![1]).toMatch(/user_id = auth\.uid\(\)/);

    // DELETE policy restricted to the owner.
    const deletePolicy =
      /CREATE POLICY ".*?" ON public\.thread_follows\s*FOR DELETE USING \((.*?)\);/s.exec(
        sql,
      );
    expect(deletePolicy).not.toBeNull();
    expect(deletePolicy![1]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("notifications SELECT RLS restricts to the recipient (REQ-NOTIF-03)", () => {
    const selectPolicy =
      /CREATE POLICY ".*?" ON public\.notifications\s*FOR SELECT USING \((.*?)\);/s.exec(
        sql,
      );
    expect(selectPolicy).not.toBeNull();
    expect(selectPolicy![1]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("notifications has NO direct app INSERT policy (trigger-only writes)", () => {
    // There must be no FOR INSERT policy on notifications: app-level inserts are
    // forbidden; only the SECURITY DEFINER trigger writes rows.
    expect(sql).not.toMatch(
      /CREATE POLICY ".*?" ON public\.notifications\s*FOR INSERT/i,
    );
    expect(sql).not.toMatch(
      /CREATE POLICY ".*?" ON public\.notifications\s*FOR ALL/i,
    );
  });

  it("defines notify_thread_followers() as SECURITY DEFINER (REQ-NOTIF-01.3)", () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.notify_thread_followers\(\).*?SECURITY DEFINER/s,
    );
  });

  it("trigger body fans out only to in-app followers and excludes the author", () => {
    const bodyMatch =
      /CREATE OR REPLACE FUNCTION public\.notify_thread_followers\(\)[\s\S]*?\$\$([\s\S]*?)\$\$/s.exec(
        sql,
      );
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch![1];
    // Bulk insert driven by a SELECT over followers.
    expect(body).toMatch(/INSERT\s+INTO\s+public\.notifications/);
    expect(body).toMatch(/SELECT\s+tf\.user_id/);
    expect(body).toMatch(/FROM\s+public\.thread_follows\s+tf/);
    // Self-exclusion: replier (author) must not notify themselves.
    expect(body).toMatch(
      /tf\.user_id\s*<>\s*NEW\.author_id|NEW\.author_id\s*<>\s*tf\.user_id/,
    );
    // In-app preference respected.
    expect(body).toMatch(/tf\.notify_in_app\s*=\s*true/);
    // Only the triggering thread's followers.
    expect(body).toMatch(/tf\.thread_id\s*=\s*NEW\.thread_id/);
  });

  it("attaches the AFTER INSERT trigger on posts (REQ-NOTIF-01.3)", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER trg_notify_followers\s+AFTER INSERT ON public\.posts\s+FOR EACH ROW EXECUTE FUNCTION public\.notify_thread_followers\(\)/s,
    );
  });

  it("creates the required indexes (REQ-NOTIF-01 risk mitigation)", () => {
    expect(sql).toMatch(
      /CREATE INDEX idx_notifications_user_read ON public\.notifications\(user_id, read_at\)/,
    );
    expect(sql).toMatch(
      /CREATE INDEX idx_thread_follows_thread ON public\.thread_follows\(thread_id\)/,
    );
  });
});

describe("thread_follows update policy migration (REQ-FOLLOW-02)", () => {
  it("adds an owner-only UPDATE policy on thread_follows", () => {
    const updatePolicy =
      /CREATE POLICY ".*?"\s*ON public\.thread_follows\s*FOR UPDATE\s*USING \((.*?)\)(?: WITH CHECK \((.*?)\))?;/s.exec(
        updatePolicySql,
      );
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![1]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("restricts the update WITH CHECK to the owner (no cross-user writes)", () => {
    const updatePolicy =
      /CREATE POLICY ".*?"\s*ON public\.thread_follows\s*FOR UPDATE\s*USING \((.*?)\)\s*WITH CHECK \((.*?)\);/s.exec(
        updatePolicySql,
      );
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![2]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("does not open UPDATE access via any FOR ALL policy", () => {
    expect(updatePolicySql).not.toMatch(/ON public\.thread_follows\s*FOR ALL/i);
  });
});

describe("notifications update policy migration (REQ-NOTIF-02 mark-read)", () => {
  it("adds an owner-only UPDATE policy on notifications so mark-read can write read_at", () => {
    const updatePolicy =
      /CREATE POLICY ".*?"\s*ON public\.notifications\s*FOR UPDATE\s*USING \((.*?)\)(?: WITH CHECK \((.*?)\))?;/s.exec(
        notificationsUpdatePolicySql,
      );
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![1]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("restricts the notifications UPDATE WITH CHECK to the recipient (no cross-user writes)", () => {
    const updatePolicy =
      /CREATE POLICY ".*?"\s*ON public\.notifications\s*FOR UPDATE\s*USING \((.*?)\)\s*WITH CHECK \((.*?)\);/s.exec(
        notificationsUpdatePolicySql,
      );
    expect(updatePolicy).not.toBeNull();
    expect(updatePolicy![2]).toMatch(/user_id = auth\.uid\(\)/);
  });

  it("does not open notifications UPDATE via any FOR ALL policy", () => {
    expect(notificationsUpdatePolicySql).not.toMatch(
      /ON public\.notifications\s*FOR ALL/i,
    );
  });
});
