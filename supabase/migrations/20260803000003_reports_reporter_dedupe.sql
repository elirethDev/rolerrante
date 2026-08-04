-- Reports dedupe backstop (PR #45 follow-up): a reporter may only report the
-- same post once. The app layer does a check-then-act (select existing ->
-- insert) but a double submit / race can slip duplicates past it, and the old
-- rows are not conflict-safe. Delete any exact duplicates that already exist
-- (keep the lowest id), then add a UNIQUE (post_id, reporter_id) index so the
-- database enforces dedupe from now on. reportPost treats the resulting 23505
-- unique violation as a silent no-op success.
DELETE FROM public.reports r USING public.reports dup
WHERE r.id > dup.id
  AND r.post_id = dup.post_id
  AND r.reporter_id = dup.reporter_id;

CREATE UNIQUE INDEX reports_post_reporter_unique ON public.reports (post_id, reporter_id);
