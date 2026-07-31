import { error, fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, profile } }) => {
  if (!isAdmin(profile?.role ?? null)) throw error(403, 'Acceso denegado');

  const [{ data: races }, { data: skills }] = await Promise.all([
    supabase.from('races').select('*').order('group_name').order('name'),
    supabase.from('skills').select('*').order('attribute').order('name'),
  ]);

  return { races: races ?? [], skills: skills ?? [] };
};

export const actions: Actions = {
  createRace: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();

    const name = String(form.get('name') ?? '').trim();
    const group_name = String(form.get('group_name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const size = String(form.get('size') ?? '').trim();
    const magic_access_raw = String(form.get('magic_access') ?? '').trim();

    if (!name || !group_name || !size) return fail(400, { message: 'Nombre, grupo y tamaño son obligatorios' });

    const magic_access = magic_access_raw
      ? magic_access_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const physical_data = {
      altura_min: Number(form.get('altura_min') ?? 0),
      altura_max: Number(form.get('altura_max') ?? 0),
      peso_min: Number(form.get('peso_min') ?? 0),
      peso_max: Number(form.get('peso_max') ?? 0),
    };

    const age_data = {
      adultez: Number(form.get('adultez') ?? 0),
      mediana_edad: Number(form.get('mediana_edad') ?? 0),
      vejez: Number(form.get('vejez') ?? 0),
    };

    const { error: dbError } = await supabase.from('races').insert({
      name,
      group_name,
      description,
      size,
      magic_access,
      physical_data,
      age_data,
    });

    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },

  updateRace: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();

    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const group_name = String(form.get('group_name') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const size = String(form.get('size') ?? '').trim();
    const magic_access_raw = String(form.get('magic_access') ?? '').trim();

    if (!id || !name || !group_name || !size) return fail(400, { message: 'ID, nombre, grupo y tamaño son obligatorios' });

    const magic_access = magic_access_raw
      ? magic_access_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const physical_data = {
      altura_min: Number(form.get('altura_min') ?? 0),
      altura_max: Number(form.get('altura_max') ?? 0),
      peso_min: Number(form.get('peso_min') ?? 0),
      peso_max: Number(form.get('peso_max') ?? 0),
    };

    const age_data = {
      adultez: Number(form.get('adultez') ?? 0),
      mediana_edad: Number(form.get('mediana_edad') ?? 0),
      vejez: Number(form.get('vejez') ?? 0),
    };

    const { error: dbError } = await supabase
      .from('races')
      .update({ name, group_name, description, size, magic_access, physical_data, age_data })
      .eq('id', id);

    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },

  deleteRace: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');

    if (!id) return fail(400, { message: 'ID obligatorio' });

    const { error: dbError } = await supabase.from('races').delete().eq('id', id);
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },

  createSkill: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();

    const name = String(form.get('name') ?? '').trim();
    const attribute = String(form.get('attribute') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const requires_specialization = form.get('requires_specialization') === 'on';
    const specializations_raw = String(form.get('specializations') ?? '').trim();

    if (!name || !attribute) return fail(400, { message: 'Nombre y atributo son obligatorios' });
    if (!['F', 'D', 'I', 'P', 'E'].includes(attribute)) return fail(400, { message: 'Atributo inválido' });

    const specializations = specializations_raw
      ? specializations_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const { error: dbError } = await supabase.from('skills').insert({
      name,
      attribute,
      description,
      requires_specialization,
      specializations,
    });

    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },

  updateSkill: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();

    const id = String(form.get('id') ?? '');
    const name = String(form.get('name') ?? '').trim();
    const attribute = String(form.get('attribute') ?? '').trim();
    const description = String(form.get('description') ?? '').trim() || null;
    const requires_specialization = form.get('requires_specialization') === 'on';
    const specializations_raw = String(form.get('specializations') ?? '').trim();

    if (!id || !name || !attribute) return fail(400, { message: 'ID, nombre y atributo son obligatorios' });
    if (!['F', 'D', 'I', 'P', 'E'].includes(attribute)) return fail(400, { message: 'Atributo inválido' });

    const specializations = specializations_raw
      ? specializations_raw.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const { error: dbError } = await supabase
      .from('skills')
      .update({ name, attribute, description, requires_specialization, specializations })
      .eq('id', id);

    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },

  deleteSkill: async ({ request, locals: { supabase, profile } }) => {
    if (!isAdmin(profile?.role ?? null)) throw error(403);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');

    if (!id) return fail(400, { message: 'ID obligatorio' });

    const { error: dbError } = await supabase.from('skills').delete().eq('id', id);
    if (dbError) return fail(400, { message: dbError.message });
    throw redirect(303, '/admin/catalogos');
  },
};