import type { Character, CharacterSkill, Skill, Setting } from './types';

export const ATTRIBUTE_LABELS: Record<string, string> = {
  F: 'Físico',
  D: 'Destreza',
  I: 'Inteligencia',
  P: 'Percepción',
  E: 'Espíritu',
};

export const ATTR_BASE_VALUE = 4;
export const ATTR_POINTS_BUDGET = 13;
export const ATTR_MAX = 10;
export const ATTR_MIN = 4;

/**
 * Calcula cuántos puntos de atributo se han gastado sobre la base (4).
 * Ej: attr_fis=7 → gasta 3 puntos. attr_fis=4 → gasta 0.
 * La suma de todos los (attrValue - 4) debe ser <= ATTR_POINTS_BUDGET (13).
 */
export function attributeCost(attrs: Record<string, number>): number {
  let spent = 0;
  for (const v of Object.values(attrs)) {
    if (v > ATTR_BASE_VALUE) spent += v - ATTR_BASE_VALUE;
  }
  return spent;
}

/**
 * Valida que los atributos cumplan las reglas.
 * Retorna un array de errores (vacío si todo ok).
 */
export function validateAttributes(attrs: Record<string, number>): string[] {
  const errors: string[] = [];
  const keys = Object.keys(attrs);
  const values = Object.values(attrs);

  // Rango
  for (const [key, value] of Object.entries(attrs)) {
    if (value < ATTR_MIN || value > ATTR_MAX) {
      const label = ATTRIBUTE_LABELS[key.replace('attr_', '').toUpperCase()] ?? key;
      errors.push(`${label} debe estar entre ${ATTR_MIN} y ${ATTR_MAX} (recibido: ${value})`);
    }
  }
  if (errors.length > 0) return errors;

  // Presupuesto
  const spent = attributeCost(attrs);
  if (spent > ATTR_POINTS_BUDGET) {
    errors.push(`Has gastado ${spent} de ${ATTR_POINTS_BUDGET} puntos de atributo`);
  }

  // Regla especial: si un atributo llega a 10, otro debe estar en 4
  const has10 = values.some(v => v === ATTR_MAX);
  const has4 = values.some(v => v === ATTR_MIN);
  if (has10 && !has4) {
    errors.push('Si un atributo llega a 10, otro debe estar en 4');
  }

  return errors;
}

export function getRankName(level: number, settings?: Setting | null) {
  const defaults: Record<string, string> = {
    '1': 'Aprendiz',
    '2': 'Aprendiz',
    '3': 'Formado',
    '4': 'Formado',
    '5': 'Diestro',
    '6': 'Diestro',
    '7': 'Experto',
    '8': 'Experto',
    '9': 'Maestro',
    '10': 'Maestro',
  };
  const map = (settings?.value as Record<string, string>) ?? defaults;
  return map[String(level)] ?? 'Desconocido';
}

export function combatValues(character: Character, skills: CharacterSkill[]) {
  const pv = character.attr_fis * 4;
  const pm = (character.mana_source === 'I' ? character.attr_int : character.attr_esp) * 4;
  const reflejos = skills.find((s) => s.skill?.name === 'Reflejos')?.level ?? 0;
  const iniciativa = character.attr_per + reflejos;

  const cc = skills.find((s) => s.skill?.name === 'Armas cuerpo a cuerpo')?.level ?? 0;
  const ccSutil = skills.find((s) => s.skill?.name === 'Armas cuerpo a cuerpo sutil')?.level ?? 0;
  const dist = skills.find((s) => s.skill?.name === 'Armas a distancia')?.level ?? 0;
  const defensa = skills.find((s) => s.skill?.name === 'Defensa')?.level ?? 0;

  return {
    pv,
    pm,
    iniciativa,
    ataqueCC: cc + character.attr_fis,
    ataqueCCSutil: ccSutil + character.attr_des,
    ataqueDistancia: dist + character.attr_per,
    defensa: defensa + character.attr_des,
  };
}

export function skillCreationCost(targetLevel: number) {
  // Coste acumulado para adquirir una habilidad desde 0 hasta targetLevel
  let cost = 0;
  for (let i = 1; i <= targetLevel; i++) cost += i;
  return cost;
}

export function skillUpgradeCost(fromLevel: number, toLevel: number) {
  let cost = 0;
  for (let i = fromLevel + 1; i <= toLevel; i++) cost += i;
  return cost;
}

export function groupSkillsByAttribute(skills: Skill[]) {
  return skills.reduce((acc, skill) => {
    acc[skill.attribute] = acc[skill.attribute] ?? [];
    acc[skill.attribute].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);
}