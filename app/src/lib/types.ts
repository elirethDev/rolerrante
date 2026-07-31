export type UserRole = 'pendiente' | 'rolero' | 'gm' | 'admin';
export type ApprovalStatus = 'borrador' | 'pendiente' | 'aprobado' | 'rechazado';
export type EventType = 'casual' | 'evento' | 'campana';
export type EventStatus = 'publicado' | 'en_curso' | 'finalizacion_pendiente' | 'finalizado' | 'cancelado';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Race {
  id: string;
  name: string;
  group_name: string;
  description: string | null;
  magic_access: string[];
  size: string;
  physical_data: Record<string, unknown>;
  age_data: Record<string, unknown>;
}

export interface Skill {
  id: string;
  name: string;
  attribute: 'F' | 'D' | 'I' | 'P' | 'E';
  description: string | null;
  requires_specialization: boolean;
  specializations: string[];
}

export interface Character {
  id: string;
  player_id: string;
  name: string;
  race_id: string;
  race?: Race;
  age: number | null;
  sex: string | null;
  physical_description: string | null;
  mana_source: 'I' | 'E';
  attr_fis: number;
  attr_des: number;
  attr_int: number;
  attr_per: number;
  attr_esp: number;
  rp_points: number;
  status: ApprovalStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterSkill {
  id: string;
  character_id: string;
  skill_id: string;
  skill?: Skill;
  specialization: string | null;
  level: number;
}

export interface Story {
  id: string;
  character_id: string;
  title: string;
  content: Record<string, unknown>;
  status: ApprovalStatus;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface EventItem {
  id: string;
  creator_id: string;
  creator?: Profile;
  title: string;
  description: Record<string, unknown>;
  type: EventType;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  max_players: number | null;
  location: string | null;
  created_at: string;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  character_id: string;
  character?: Character;
  status: 'inscrito' | 'confirmado' | 'ausente';
  xp_awarded: number;
}

export interface EventSession {
  id: string;
  event_id: string;
  title: string | null;
  summary: string | null;
  session_date: string;
  counts_as_masteo: boolean;
}

export interface SkillRequest {
  id: string;
  character_id: string;
  character?: Character;
  status: ApprovalStatus;
  justification: string;
  reviewer_id: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  total_xp_cost: number;
  created_at: string;
}

export interface SkillRequestItem {
  id: string;
  request_id: string;
  skill_id: string;
  skill?: Skill;
  specialization: string | null;
  from_level: number;
  to_level: number;
  xp_cost: number;
}

export interface Setting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  created_at: string;
}
