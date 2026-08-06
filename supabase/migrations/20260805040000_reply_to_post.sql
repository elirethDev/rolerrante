-- Reply-to ("respondiendo a") for forum posts.
--
-- A reply can point back at the post it answers. The value is carried by the
-- quote the composer already sends when the user clicks Citar (quote_post_id):
-- the quoted reply IS the reply-to target, so the serving code derives
-- reply_to_post_id from the already-validated quote instead of adding a new UI
-- control or form field. When the target post is deleted the FK is SET NULL, so
-- the chip disappears instead of dangling into a missing row.
ALTER TABLE public.posts ADD COLUMN reply_to_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;
CREATE INDEX idx_posts_reply_to ON public.posts (reply_to_post_id);

-- RLS: posts SELECT policy already keys off the thread; replies to a post only
-- show if the post itself is visible (same thread), so no new policy needed.
