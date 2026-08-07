-- delete_category_cascade: borra una sección/categoría con TODO su contenido.
--
-- Motivo: threads.category_id → categories(id) es `REFERENCES` SIN ON DELETE
-- CASCADE (definido en 20260802000000_forum.sql), por lo que un DELETE directo
-- de una categoría con hilos falla con:
--   update or delete on table "categories" violates foreign key constraint
--   "threads_category_id_fkey" on table "threads"
--
-- Este RPC borra en orden (dentro de una transacción):
--   1. threads de la categoría y de todas sus categorías hijas (los posts,
--      reactions, thread_follows y notifications se borran en CASCADE solos)
--   2. las categorías hijas (sus section_permissions/thread_permissions
--      se borran en CASCADE solos)
--   3. la categoría raíz
-- Solo lo ejecuta un admin (is_admin()).
CREATE OR REPLACE FUNCTION public.delete_category_cascade(p_category_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_ids uuid[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Recolecta la categoría y todas sus descendientes (recursivo por parent_id).
  WITH RECURSIVE tree AS (
    SELECT id FROM public.categories WHERE id = p_category_id
    UNION ALL
    SELECT c.id FROM public.categories c
    JOIN tree t ON c.parent_id = t.id
  )
  SELECT array_agg(id) INTO v_ids FROM tree;

  IF v_ids IS NULL OR cardinality(v_ids) = 0 THEN
    RETURN;
  END IF;

  -- 1) Hilos de esas categorías (cascade limpia posts/react/notifs/follows).
  DELETE FROM public.threads WHERE category_id = ANY (v_ids);

  -- 2) Categorías hijas (cascade limpia section/thread_permissions).
  DELETE FROM public.categories WHERE parent_id = ANY (v_ids);

  -- 3) La categoría raíz.
  DELETE FROM public.categories WHERE id = p_category_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_category_cascade(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_category_cascade(uuid) TO authenticated;
