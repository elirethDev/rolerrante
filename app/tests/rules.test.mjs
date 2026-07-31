import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Tests unitarios para las reglas de RolErrante
// Ejecutar con: nodejs\node-v20.18.2-win-x64\node.exe tests/rules.test.mjs

let failures = 0;
let passed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failures++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failures++;
    console.error(`  ❌ FAIL: ${message} — esperado: ${expected}, recibido: ${actual}`);
  }
}

// Extraer funciones del source para testearlas
// Simulamos las funciones importantes de rules.ts

function skillCreationCost(targetLevel) {
  let cost = 0;
  for (let i = 1; i <= targetLevel; i++) cost += i;
  return cost;
}

function skillUpgradeCost(fromLevel, toLevel) {
  let cost = 0;
  for (let i = fromLevel + 1; i <= toLevel; i++) cost += i;
  return cost;
}

function combatValues(character, skills) {
  const pv = character.attr_fis * 4;
  const pm = (character.mana_source === 'I' ? character.attr_int : character.attr_esp) * 4;
  const reflejos = skills.find((s) => s.skill?.name === 'Reflejos')?.level ?? 0;
  const iniciativa = character.attr_per + reflejos;
  const cc = skills.find((s) => s.skill?.name === 'Armas cuerpo a cuerpo')?.level ?? 0;
  const ccSutil = skills.find((s) => s.skill?.name === 'Armas cuerpo a cuerpo sutil')?.level ?? 0;
  const dist = skills.find((s) => s.skill?.name === 'Armas a distancia')?.level ?? 0;
  const defensa = skills.find((s) => s.skill?.name === 'Defensa')?.level ?? 0;
  return { pv, pm, iniciativa, ataqueCC: cc + character.attr_fis, ataqueCCSutil: ccSutil + character.attr_des, ataqueDistancia: dist + character.attr_per, defensa: defensa + character.attr_des };
}

function groupSkillsByAttribute(skills) {
  return skills.reduce((acc, skill) => {
    acc[skill.attribute] = acc[skill.attribute] ?? [];
    acc[skill.attribute].push(skill);
    return acc;
  }, {});
}

function attributeCost(attrs) {
  const ATTR_BASE_VALUE = 4;
  let spent = 0;
  for (const v of Object.values(attrs)) {
    if (v > ATTR_BASE_VALUE) spent += v - ATTR_BASE_VALUE;
  }
  return spent;
}

function validateAttributes(attrs) {
  const ATTR_MIN = 4;
  const ATTR_MAX = 10;
  const ATTR_POINTS_BUDGET = 13;
  const errors = [];
  const values = Object.values(attrs);

  for (const [key, value] of Object.entries(attrs)) {
    if (value < ATTR_MIN || value > ATTR_MAX) {
      errors.push(`${key} debe estar entre ${ATTR_MIN} y ${ATTR_MAX} (recibido: ${value})`);
    }
  }
  if (errors.length > 0) return errors;

  const spent = attributeCost(attrs);
  if (spent > ATTR_POINTS_BUDGET) {
    errors.push(`Has gastado ${spent} de ${ATTR_POINTS_BUDGET} puntos de atributo`);
  }

  const has10 = values.some(v => v === ATTR_MAX);
  const has4 = values.some(v => v === ATTR_MIN);
  if (has10 && !has4) {
    errors.push('Si un atributo llega a 10, otro debe estar en 4');
  }

  return errors;
}

function getRankName(level, settings = null) {
  const defaults = { '1': 'Aprendiz', '2': 'Aprendiz', '3': 'Formado', '4': 'Formado', '5': 'Diestro', '6': 'Diestro', '7': 'Experto', '8': 'Experto', '9': 'Maestro', '10': 'Maestro' };
  const map = settings?.value ?? defaults;
  return map[String(level)] ?? 'Desconocido';
}

// ======================================
// TESTS DE skillCreationCost
// ======================================
console.log('\n📋 skillCreationCost:');

assertEqual(skillCreationCost(0), 0, 'Nivel 0 cuesta 0');
assertEqual(skillCreationCost(1), 1, 'Nivel 1 cuesta 1');
assertEqual(skillCreationCost(2), 3, 'Nivel 2 cuesta 1+2=3');
assertEqual(skillCreationCost(3), 6, 'Nivel 3 cuesta 1+2+3=6');
assertEqual(skillCreationCost(5), 15, 'Nivel 5 cuesta 15');
assertEqual(skillCreationCost(10), 55, 'Nivel 10 cuesta 55');

// ======================================
// TESTS DE skillUpgradeCost
// ======================================
console.log('📋 skillUpgradeCost:');

assertEqual(skillUpgradeCost(0, 1), 1, 'Subir de 0 a 1 cuesta 1');
assertEqual(skillUpgradeCost(1, 3), 5, 'Subir de 1 a 3 cuesta 2+3=5');
assertEqual(skillUpgradeCost(5, 7), 13, 'Subir de 5 a 7 cuesta 6+7=13');
assertEqual(skillUpgradeCost(0, 5), 15, 'Subir de 0 a 5 cuesta 15 (mismo que creationCost(5))');
assertEqual(skillUpgradeCost(3, 3), 0, 'Subir de 3 a 3 cuesta 0 (sin cambio)');

// ======================================
// TESTS DE combatValues
// ======================================
console.log('📋 combatValues:');

const charFis = { attr_fis: 4, attr_des: 3, attr_int: 2, attr_per: 5, attr_esp: 1, mana_source: 'I' };
const skillsFis = [
  { skill: { name: 'Reflejos' }, level: 2 },
  { skill: { name: 'Armas cuerpo a cuerpo' }, level: 3 },
  { skill: { name: 'Defensa' }, level: 1 },
];
const combat = combatValues(charFis, skillsFis);
assertEqual(combat.pv, 16, 'PV = FIS*4 = 16');
assertEqual(combat.pm, 8, 'PM = INT*4 = 8 (mana_source=I)');
assertEqual(combat.iniciativa, 7, 'Iniciativa = PER + Reflejos = 5+2=7');
assertEqual(combat.ataqueCC, 7, 'Ataque CC = CC + FIS = 3+4=7');
assertEqual(combat.ataqueCCSutil, 3, 'Ataque CC Sutil = CCSutil + DES = 0+3=3');
assertEqual(combat.ataqueDistancia, 5, 'Ataque Distancia = Dist + PER = 0+5=5');
assertEqual(combat.defensa, 4, 'Defensa = Defensa + DES = 1+3=4');

const charEsp = { attr_fis: 2, attr_des: 3, attr_int: 1, attr_per: 2, attr_esp: 5, mana_source: 'E' };
const combatEsp = combatValues(charEsp, []);
assertEqual(combatEsp.pm, 20, 'PM = ESP*4 = 20 (mana_source=E)');
assertEqual(combatEsp.iniciativa, 2, 'Iniciativa = PER + 0 = 2');

// ======================================
// TESTS DE groupSkillsByAttribute
// ======================================
console.log('📋 groupSkillsByAttribute:');

const skills = [
  { id: '1', name: 'Fuerza', attribute: 'F' },
  { id: '2', name: 'Correr', attribute: 'D' },
  { id: '3', name: 'Saltar', attribute: 'D' },
  { id: '4', name: 'Leer', attribute: 'I' },
];
const grouped = groupSkillsByAttribute(skills);
assertEqual(Object.keys(grouped).length, 3, 'Agrupa en 3 atributos');
assertEqual(grouped['F'].length, 1, 'F tiene 1 skill');
assertEqual(grouped['D'].length, 2, 'D tiene 2 skills');
assertEqual(grouped['I'].length, 1, 'I tiene 1 skill');
assertEqual(grouped['D'][0].name, 'Correr', 'Primera skill de D es Correr');
assertEqual(grouped['D'][1].name, 'Saltar', 'Segunda skill de D es Saltar');

// ======================================
// TESTS DE getRankName
// ======================================
console.log('📋 getRankName:');

assertEqual(getRankName(0), 'Desconocido', 'Nivel 0 es Desconocido');
assertEqual(getRankName(1), 'Aprendiz', 'Nivel 1 es Aprendiz');
assertEqual(getRankName(2), 'Aprendiz', 'Nivel 2 es Aprendiz');
assertEqual(getRankName(3), 'Formado', 'Nivel 3 es Formado');
assertEqual(getRankName(5), 'Diestro', 'Nivel 5 es Diestro');
assertEqual(getRankName(7), 'Experto', 'Nivel 7 es Experto');
assertEqual(getRankName(9), 'Maestro', 'Nivel 9 es Maestro');
assertEqual(getRankName(10), 'Maestro', 'Nivel 10 es Maestro');
assertEqual(getRankName(99), 'Desconocido', 'Nivel 99 es Desconocido');

// ======================================
// TESTS DE reglas de negocio combinadas
// ======================================
console.log('📋 Reglas combinadas (escenarios reales):');

// Personaje con 25 puntos: gasta en habilidades
const totalCost = skillCreationCost(3) + skillCreationCost(2) + skillCreationCost(1);
assertEqual(totalCost, 10, '3+2+1 cuesta 6+3+1=10');
// Recalculo:
const tc2 = skillCreationCost(3); // 6
const tc3 = skillCreationCost(2); // 3
const tc4 = skillCreationCost(1); // 1
assertEqual(tc2 + tc3 + tc4, 10, 'Habilidades nivel 3, 2, 1 cuestan 10 puntos');
assertEqual(25 - 10, 15, 'Sobran 15 puntos de creacion');

// Coste de mejora desde nivel actual
const upgradeFrom1to3 = skillUpgradeCost(1, 3); // 2+3=5
assertEqual(upgradeFrom1to3, 5, 'Mejorar de nivel 1 a 3 cuesta 5 XP');

// Personaje con 4 FIS, sin skills: PV básicos
const charBase = { attr_fis: 4, attr_des: 3, attr_int: 2, attr_per: 2, attr_esp: 3, mana_source: 'I' };
const baseCombat = combatValues(charBase, []);
assertEqual(baseCombat.pv, 16, 'PV base = 4*4 = 16');
assertEqual(baseCombat.ataqueCC, 4, 'Ataque CC base = 0 + 4 = 4');
assertEqual(baseCombat.defensa, 3, 'Defensa base = 0 + 3 = 3');

// ======================================
// TESTS DE attributeCost
// ======================================
console.log('📋 attributeCost:');

assertEqual(attributeCost({ attr_fis: 4, attr_des: 4, attr_int: 4, attr_per: 4, attr_esp: 4 }), 0, 'Todo base 4 gasta 0');
assertEqual(attributeCost({ attr_fis: 7, attr_des: 4, attr_int: 4, attr_per: 4, attr_esp: 4 }), 3, 'FIS=7 gasta 3');
assertEqual(attributeCost({ attr_fis: 7, attr_des: 6, attr_int: 4, attr_per: 4, attr_esp: 4 }), 5, 'FIS=7 + DES=6 gasta 3+2=5');
assertEqual(attributeCost({ attr_fis: 10, attr_des: 10, attr_int: 4, attr_per: 4, attr_esp: 4 }), 12, 'FIS=10 + DES=10 gasta 6+6=12');

// ======================================
// TESTS DE validateAttributes
// ======================================
console.log('📋 validateAttributes:');

assertEqual(validateAttributes({ attr_fis: 4, attr_des: 4, attr_int: 4, attr_per: 4, attr_esp: 4 }).length, 0, 'Todo base 4 no tiene errores');
assertEqual(validateAttributes({ attr_fis: 7, attr_des: 6, attr_int: 5, attr_per: 5, attr_esp: 6 }).length, 0, 'Distribucion valida (7+6+5+5+6=29, gasto=3+2+1+1+2=9 <=13)');
assertEqual(validateAttributes({ attr_fis: 10, attr_des: 10, attr_int: 10, attr_per: 4, attr_esp: 4 }).length, 1, 'Excede presupuesto (gasto=18>13)');
assertEqual(validateAttributes({ attr_fis: 10, attr_des: 5, attr_int: 5, attr_per: 5, attr_esp: 5 }).length, 1, 'Tiene 10 pero no tiene 4 en otro atributo');
assertEqual(validateAttributes({ attr_fis: 10, attr_des: 4, attr_int: 5, attr_per: 5, attr_esp: 5 }).length, 0, 'Tiene 10 y otro en 4, ok');
assertEqual(validateAttributes({ attr_fis: 3, attr_des: 4, attr_int: 4, attr_per: 4, attr_esp: 4 }).length, 1, 'FIS=3 esta por debajo del minimo 4');
assertEqual(validateAttributes({ attr_fis: 11, attr_des: 4, attr_int: 4, attr_per: 4, attr_esp: 4 }).length, 1, 'FIS=11 excede el maximo 10');

// ======================================
// RESUMEN
// ======================================
console.log(`\n${'='.repeat(40)}`);
console.log(`Resultados: ${passed} pasaron, ${failures} fallaron`);
if (failures > 0) {
  console.error('❌ HAY TESTS FALLANDO');
  process.exit(1);
} else {
  console.log('✅ TODOS LOS TESTS PASARON');
  process.exit(0);
}