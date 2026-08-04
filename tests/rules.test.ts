import { describe, expect, it } from "vitest";
import {
  attributeCost,
  combatValues,
  skillCreationCost,
  skillUpgradeCost,
  validateAttributes,
} from "../src/lib/rules";
import type { Character, CharacterSkill, Skill } from "../src/lib/types";

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "char-1",
    player_id: "player-1",
    name: "Test",
    race_id: "race-1",
    age: null,
    sex: null,
    physical_description: null,
    mana_source: "I",
    attr_fis: 4,
    attr_des: 3,
    attr_int: 2,
    attr_per: 5,
    attr_esp: 1,
    rp_points: 0,
    status: "borrador",
    avatar_url: null,
    review_notes: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeSkill(
  name: string,
  level: number,
  attribute: Skill["attribute"] = "F",
): CharacterSkill {
  return {
    id: `skill-${name}`,
    character_id: "char-1",
    skill_id: `skill-${name}`,
    skill: {
      id: `skill-${name}`,
      name,
      attribute,
      description: null,
      requires_specialization: false,
      specializations: [],
    },
    specialization: null,
    level,
  };
}

describe("skillCreationCost", () => {
  it("calculates triangular totals: N*(N+1)/2", () => {
    expect(skillCreationCost(0)).toBe(0);
    expect(skillCreationCost(1)).toBe(1);
    expect(skillCreationCost(2)).toBe(3); // 1+2
    expect(skillCreationCost(3)).toBe(6); // 1+2+3
    expect(skillCreationCost(5)).toBe(15);
    expect(skillCreationCost(10)).toBe(55);
  });
});

describe("skillUpgradeCost", () => {
  it("costs the sum of levels between the current and target level", () => {
    expect(skillUpgradeCost(0, 1)).toBe(1);
    expect(skillUpgradeCost(1, 3)).toBe(5); // 2+3
    expect(skillUpgradeCost(5, 7)).toBe(13); // 6+7
    expect(skillUpgradeCost(0, 5)).toBe(15); // same as creation cost to 5
    expect(skillUpgradeCost(3, 3)).toBe(0); // no change
  });
});

describe("combatValues", () => {
  it("computes Pv (Vida) as Físico * 4", () => {
    const combat = combatValues(makeCharacter({ attr_fis: 4 }), []);
    expect(combat.pv).toBe(16);
  });

  it("computes Pm (Maná) from Inteligencia when mana_source is I", () => {
    const combat = combatValues(
      makeCharacter({ attr_int: 2, mana_source: "I" }),
      [],
    );
    expect(combat.pm).toBe(8); // INT*4 = 8
  });

  it("computes Pm (Maná) from Espíritu when mana_source is E", () => {
    const combat = combatValues(
      makeCharacter({ attr_esp: 5, mana_source: "E" }),
      [],
    );
    expect(combat.pm).toBe(20); // ESP*4 = 20
  });

  it("combines attributes with skill levels for attack, defense, and initiative", () => {
    const character = makeCharacter({
      attr_fis: 4,
      attr_des: 3,
      attr_int: 2,
      attr_per: 5,
      attr_esp: 1,
    });
    const skills = [
      makeSkill("Reflejos", 2),
      makeSkill("Armas cuerpo a cuerpo", 3),
      makeSkill("Defensa", 1),
    ];
    const combat = combatValues(character, skills);
    expect(combat.iniciativa).toBe(7); // PER 5 + Reflejos 2
    expect(combat.ataqueCC).toBe(7); // FIS 4 + CC 3
    expect(combat.ataqueCCSutil).toBe(3); // DES 3 + sutil 0
    expect(combat.ataqueDistancia).toBe(5); // PER 5 + distancia 0
    expect(combat.defensa).toBe(4); // DES 3 + Defensa 1
  });
});

describe("attributeCost", () => {
  it("spends 0 when all attributes are at base 4", () => {
    const attrs = {
      attr_fis: 4,
      attr_des: 4,
      attr_int: 4,
      attr_per: 4,
      attr_esp: 4,
    };
    expect(attributeCost(attrs)).toBe(0);
  });

  it("charges the excess over base 4 per attribute", () => {
    expect(
      attributeCost({
        attr_fis: 7,
        attr_des: 4,
        attr_int: 4,
        attr_per: 4,
        attr_esp: 4,
      }),
    ).toBe(3);
    expect(
      attributeCost({
        attr_fis: 7,
        attr_des: 6,
        attr_int: 4,
        attr_per: 4,
        attr_esp: 4,
      }),
    ).toBe(5); // 3+2
    expect(
      attributeCost({
        attr_fis: 10,
        attr_des: 10,
        attr_int: 4,
        attr_per: 4,
        attr_esp: 4,
      }),
    ).toBe(12); // 6+6
  });
});

describe("validateAttributes", () => {
  const allBase = {
    attr_fis: 4,
    attr_des: 4,
    attr_int: 4,
    attr_per: 4,
    attr_esp: 4,
  };

  it("accepts a valid distribution within budget", () => {
    const attrs = {
      attr_fis: 7,
      attr_des: 6,
      attr_int: 5,
      attr_per: 5,
      attr_esp: 6,
    };
    expect(validateAttributes(attrs)).toEqual([]);
  });

  it("accepts an attribute at 10 when another is at 4", () => {
    const attrs = {
      attr_fis: 10,
      attr_des: 4,
      attr_int: 5,
      attr_per: 5,
      attr_esp: 5,
    };
    expect(validateAttributes(attrs)).toEqual([]);
  });

  it("rejects an attribute at 10 without a counterbalancing 4", () => {
    const attrs = {
      attr_fis: 10,
      attr_des: 5,
      attr_int: 5,
      attr_per: 5,
      attr_esp: 5,
    };
    const errors = validateAttributes(attrs);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("10");
  });

  it("rejects values below the minimum of 4", () => {
    const attrs = {
      attr_fis: 3,
      attr_des: 4,
      attr_int: 4,
      attr_per: 4,
      attr_esp: 4,
    };
    expect(validateAttributes(attrs)).toHaveLength(1);
  });

  it("rejects values above the maximum of 10", () => {
    const attrs = {
      attr_fis: 11,
      attr_des: 4,
      attr_int: 4,
      attr_per: 4,
      attr_esp: 4,
    };
    expect(validateAttributes(attrs)).toHaveLength(1);
  });

  it("rejects a budget overflow beyond 13 spent points", () => {
    const attrs = {
      attr_fis: 10,
      attr_des: 10,
      attr_int: 10,
      attr_per: 4,
      attr_esp: 4,
    };
    expect(validateAttributes(attrs)).toHaveLength(1); // spends 18 > 13
  });

  it("accepts all-base attributes", () => {
    expect(validateAttributes(allBase)).toEqual([]);
  });
});
