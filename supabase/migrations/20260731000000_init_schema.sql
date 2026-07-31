-- Tipos enumerados
CREATE TYPE user_role AS ENUM ('pendiente', 'rolero', 'gm', 'admin');
CREATE TYPE approval_status AS ENUM ('borrador', 'pendiente', 'aprobado', 'rechazado');
CREATE TYPE event_type AS ENUM ('casual', 'evento', 'campana');
CREATE TYPE event_status AS ENUM ('publicado', 'en_curso', 'finalizacion_pendiente', 'finalizado', 'cancelado');
CREATE TYPE audit_action AS ENUM ('aprobar', 'rechazar', 'editar', 'otorgar_xp', 'finalizar_evento', 'cambiar_rol', 'editar_catalogo', 'editar_settings');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  role user_role NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfiles publicamente visibles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuarios editan su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'pendiente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  group_name text NOT NULL,
  description text,
  magic_access text[] DEFAULT '{}',
  size text NOT NULL,
  physical_data jsonb DEFAULT '{}',
  age_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Razas publicamente visibles" ON public.races FOR SELECT USING (true);
CREATE POLICY "Admin gestiona razas" ON public.races
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.is_gm_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('gm', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

INSERT INTO public.races (name, group_name, description, magic_access, size) VALUES
('Humanos', 'Reinos Aliados', 'Raza más extendida y versátil de Azeroth.', ARRAY['Luz','Magia Arcana','Vacío','Magia Vil','Druidismo','Chamanismo'], 'Medio'),
('Enanos', 'Reinos Aliados', 'Aliados ancestrales de los humanos, de constitución robusta.', ARRAY['Luz','Magia Arcana','Vacío','Magia Vil','Chamanismo'], 'Medio'),
('Altos Elfos', 'Reinos Aliados', 'Retazos de un pueblo orgulloso y exiliado.', ARRAY['Luz','Magia Arcana'], 'Medio'),
('Elfos de la Noche', 'Reinos Aliados', 'Milenarios guerreros protectores de Kalimdor.', ARRAY['Luz','Magia Arcana','Druidismo','Magia Vil'], 'Medio'),
('Furbolgs', 'Reinos Aliados', 'Hombres oso espirituales de Kalimdor.', ARRAY['Chamanismo','Druidismo'], 'Grande'),
('Driades', 'Reinos Aliados', 'Habitantes místicos de los bosques.', ARRAY['Druidismo'], 'Medio'),
('Draenei', 'Reinos Aliados', 'Exiliados religiosos interplanetarios.', ARRAY['Luz','Magia Arcana','Vacío','Chamanismo'], 'Medio'),
('Tábidos', 'Reinos Aliados', 'Primos corruptos de los draenei.', ARRAY['Chamanismo','Magia Arcana'], 'Medio'),
('Gnomos', 'Reinos Aliados', 'Inventores minúsculos de Gnomeregan.', ARRAY['Luz','Magia Arcana','Vacío','Magia Vil'], 'Pequeño'),
('Orcos', 'Naciones Hermanadas', 'Guerreros de Draenor forjados en la Horda Orca.', ARRAY['Magia Arcana','Magia Vil','Vacío','Chamanismo'], 'Medio'),
('Trols de la Selva', 'Naciones Hermanadas', 'Tribus dispersas por archipiélagos y selvas.', ARRAY['Magia Arcana','Magia Vil','Vacío','Chamanismo','Druidismo'], 'Medio'),
('Tauren', 'Naciones Hermanadas', 'Confederación de tribus bovinas de Kalimdor.', ARRAY['Luz','Chamanismo','Druidismo','Vacío'], 'Grande'),
('Ogros', 'Naciones Hermanadas', 'Gigantes cornudos y mercenarios.', ARRAY['Magia Arcana','Vacío','Chamanismo','Magia Vil'], 'Grande'),
('Mok''Nathal', 'Naciones Hermanadas', 'Híbridos ermitaños entre ogros y orcos.', ARRAY['Chamanismo'], 'Grande'),
('Goblin', 'Naciones Hermanadas', 'Seres verdes de espíritu voluble y ambicioso.', ARRAY['Magia Arcana','Magia Vil','Vacío','Chamanismo'], 'Pequeño'),
('Elfos de Sangre', 'Naciones Hermanadas', 'Retazos de un reino resquebrajado.', ARRAY['Luz','Magia Arcana','Vacío','Magia Vil'], 'Medio'),
('Renegados', 'Naciones Hermanadas', 'No-muertos alzados como potencia militar.', ARRAY['Magia Arcana','Vacío','Magia Vil'], 'Medio'),
('Pandaren', 'Pueblos Libres', 'Pueblo dado a la meditación y al chi.', ARRAY['Magia Arcana','Chamanismo','Chi'], 'Medio'),
('Hozen', 'Pueblos Libres', 'Hombres macaco de las selvas de Pandaria.', ARRAY['Chamanismo','Chi'], 'Pequeño'),
('Jinyu', 'Pueblos Libres', 'Nobles hombres pez centenarios.', ARRAY['Magia Arcana','Chamanismo','Chi'], 'Medio'),
('Trols Zandalari', 'Pueblos Libres', 'Ancestros orgullosos de todos los trols.', ARRAY['Luz','Magia Arcana','Chamanismo','Vacío','Druidismo'], 'Medio'),
('Trols del Bosque', 'Pueblos Libres', 'Uno de los pueblos trols más antiguos.', ARRAY['Magia Arcana','Chamanismo','Vacío'], 'Medio'),
('Trols de la Arena', 'Pueblos Libres', 'Supervivientes natos de los desiertos de Tanaris.', ARRAY['Magia Arcana','Chamanismo','Vacío'], 'Medio'),
('Vulpera', 'Pueblos Libres', 'Pequeños mamíferos errantes en caravanas.', ARRAY['Magia Arcana','Chamanismo','Vacío'], 'Pequeño'),
('Sethrak', 'Pueblos Libres', 'Hombres serpiente de imperio esclavista colapsado.', ARRAY['Magia Arcana','Chamanismo','Vacío'], 'Medio');

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  attribute char(1) NOT NULL CHECK (attribute IN ('F','D','I','P','E')),
  description text,
  requires_specialization boolean NOT NULL DEFAULT false,
  specializations text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, attribute)
);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Habilidades publicamente visibles" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Admin gestiona habilidades" ON public.skills
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.skills (name, attribute, description, requires_specialization, specializations) VALUES
('Armas cuerpo a cuerpo', 'F', 'Uso de armas pesadas y medianas cuerpo a cuerpo.', true, ARRAY['Espadón','Combate Desarmado Ofensivo','Espada Pesada','Alabarda','Maza','Hacha','Lanza']),
('Atletismo', 'F', 'Capacidad física general entrenada: saltar, correr, resistir.', false, '{}'),
('Escalar', 'F', 'Subir paredes verticales o escarpadas.', false, '{}'),
('Nadar', 'F', 'Nivel de natación.', false, '{}'),
('Armas cuerpo a cuerpo sutil', 'D', 'Armas ligeras, dagas, bastones, técnicas marciales.', true, ARRAY['Espada Ligera','Daga','Bastón','Combate Desarmado Sutil']),
('Equitación', 'D', 'Manejo de monturas.', false, '{}'),
('Defensa', 'D', 'Parar, bloquear o esquivar golpes.', false, '{}'),
('Lanzador', 'D', 'Arrojar objetos con precisión.', false, '{}'),
('Robar bolsillos', 'D', 'Juegos de manos y latrocinio.', false, '{}'),
('Sigilo', 'D', 'Moverse sin ser detectado.', false, '{}'),
('Trampas/Cerraduras', 'D', 'Manipular mecanismos, detectar/desactivar trampas.', false, '{}'),
('Bailar', 'D', 'Habilidad para bailar.', false, '{}'),
('Artillería', 'I', 'Uso de armas de asedio.', true, ARRAY['Catapultas','Balistas','Cañones']),
('Profesión', 'I', 'Maestría en una profesión simple.', true, ARRAY['Herrería','Panadería','Peletería','Joyería','Carpintería','Cocina']),
('Fauna', 'I', 'Conocimiento y trato con animales.', true, ARRAY['Mamíferos','Aves','Réptiles','Anfibios','Fauna Acuática','Dragonantes','Insectoides/Arácnidos']),
('Leyes', 'I', 'Conocimiento de las leyes de una región.', true, ARRAY['Reinos Humanos','Honor Enano','Justicia Kaldorei','Sistema Gnómico de Justicia','Códigos Draenei','Honor Orco','Ley Trol','Honor Tauren','Entramado Goblin','Justicia Thalassiana','Ley de Lordaeron','Justicia Pandaren']),
('Navegar', 'I', 'Gobernar embarcaciones y orientación.', false, '{}'),
('Religión', 'I', 'Conocimiento teológico ceremonial e histórico.', true, ARRAY['Luz Sagrada','Culto de Elune','Druidismo','Chamanismo','Los Loa','Culto de la Sombra Olvidada','Los Augustos Celestiales','La Legión Ardiente','El Culto de los Malditos','El Culto Crepuscular','Culto de la Llama Hierronegro']),
('Sanación/Hierbas', 'I', 'Curación tradicional y uso de hierbas.', false, '{}'),
('Cirugía/Anatomía', 'I', 'Conocimientos médicos avanzados.', false, '{}'),
('Arquitectura', 'I', 'Estructuración y asedio de edificaciones.', false, '{}'),
('Supervivencia', 'I', 'Orientación, fuego, refugio, alimento salvaje.', false, '{}'),
('Conocimiento/Historia', 'I', 'Conocimiento histórico y cultural.', true, ARRAY['Reinos Humanos','Clanes Enanos','El Alto Reino Élfico','Elfos de la Noche','Los Draenei','Los Gnomos','Clanes Orcos','Imperios Trols','Tribus Tauren','Imperio Goriano','Carteles Goblin','El Nuevo Orden Renegado','Pandaria','Magia Arcana','Nigromancia','Brujería Vil','Magia Oscura','Folklore Gilnea','Engendros del Vacío']),
('Tortura', 'I', 'Obtener información o rendición mediante sufrimiento.', false, '{}'),
('Armas a distancia', 'P', 'Uso de arcos, ballestas, armas de fuego.', true, ARRAY['Arco Largo','Arco Corto','Ballesta','Pistola','Rifle']),
('Advertir/Notar', 'P', 'Sentidos activos para detectar peligros.', false, '{}'),
('Dibujar', 'P', 'Arte del dibujo.', false, '{}'),
('Buscar', 'P', 'Búsqueda activa de objetos o pasadizos ocultos.', false, '{}'),
('Callejeo', 'P', 'Conocimiento de bajos fondos y mercado negro.', false, '{}'),
('Comercio', 'P', 'Valor intuitivo de mercancías y regateo.', false, '{}'),
('Disfraz', 'P', 'Hacerse pasar por otra persona.', false, '{}'),
('Etiqueta', 'P', 'Protocolos y costumbres sociales.', false, '{}'),
('Música', 'P', 'Conocimiento de instrumentos y canto.', true, ARRAY['Guitarra','Flauta','Flauta de pan','Laúd','Tambor','Arpa','Canto']),
('Rastrear', 'P', 'Seguir huellas y señales.', false, '{}'),
('Reflejos', 'P', 'Reacción rápida y velocidad en combate.', false, '{}'),
('Rumores', 'P', 'Conocer rumores y noticias del pueblo.', false, '{}'),
('Voluntad', 'E', 'Resiliencia mental contra influencias externas.', false, '{}');

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Settings publicamente legibles" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admin edita settings" ON public.settings
  FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.settings (key, value) VALUES
('character_creation', '{"attribute_points": 13, "skill_points": 30, "min_attribute": 4, "max_attribute": 10, "max_initial_skill_level": 2}'::jsonb),
('xp_rewards', '{"participacion": 1, "crear_evento": 3, "campana_larga": 6, "dias_campana_larga": 7}'::jsonb),
('skill_rank_names', '{"1":"Aprendiz","2":"Aprendiz","3":"Formado","4":"Formado","5":"Diestro","6":"Diestro","7":"Experto","8":"Experto","9":"Maestro","10":"Maestro"}'::jsonb);

CREATE TABLE public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  race_id uuid NOT NULL REFERENCES public.races(id),
  age int,
  sex text,
  physical_description text,
  mana_source char(1) NOT NULL DEFAULT 'I' CHECK (mana_source IN ('I','E')),
  attr_fis int NOT NULL DEFAULT 4,
  attr_des int NOT NULL DEFAULT 4,
  attr_int int NOT NULL DEFAULT 4,
  attr_per int NOT NULL DEFAULT 4,
  attr_esp int NOT NULL DEFAULT 4,
  rp_points int NOT NULL DEFAULT 0,
  status approval_status NOT NULL DEFAULT 'borrador',
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personajes visibles si aprobados" ON public.characters
  FOR SELECT USING (status = 'aprobado' OR player_id = auth.uid() OR is_gm_or_admin());

CREATE POLICY "Jugadores gestionan sus personajes" ON public.characters
  FOR ALL USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "GM/Admin gestionan personajes" ON public.characters
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  status approval_status NOT NULL DEFAULT 'borrador',
  review_notes text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Historias visibles si aprobadas" ON public.stories
  FOR SELECT USING (status = 'aprobado' OR EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = stories.character_id AND c.player_id = auth.uid()
  ) OR is_gm_or_admin());

CREATE POLICY "Jugadores editan historias de sus personajes" ON public.stories
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = stories.character_id AND c.player_id = auth.uid()
  ));

CREATE POLICY "GM/Admin gestionan historias" ON public.stories
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.character_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id),
  specialization text,
  level int NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, skill_id, specialization)
);

ALTER TABLE public.character_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Habilidades de personaje visibles según personaje" ON public.character_skills
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = character_skills.character_id
      AND (c.status = 'aprobado' OR c.player_id = auth.uid() OR is_gm_or_admin())
  ));

CREATE POLICY "Jugadores gestionan habilidades propias" ON public.character_skills
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = character_skills.character_id AND c.player_id = auth.uid()
  ));

CREATE POLICY "GM/Admin gestionan habilidades" ON public.character_skills
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id),
  title text NOT NULL,
  description jsonb NOT NULL DEFAULT '{}',
  type event_type NOT NULL DEFAULT 'casual',
  status event_status NOT NULL DEFAULT 'publicado',
  starts_at timestamptz,
  ends_at timestamptz,
  max_players int,
  location text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visibles para roleros en adelante" ON public.events
  FOR SELECT USING (true);

CREATE POLICY "Roleros y GM crean eventos" ON public.events
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('rolero','gm','admin')
  ));

CREATE POLICY "Creador edita sus eventos" ON public.events
  FOR UPDATE USING (creator_id = auth.uid());

CREATE POLICY "GM/Admin gestionan eventos" ON public.events
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.event_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text,
  summary text,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  counts_as_masteo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sesiones visibles" ON public.event_sessions FOR SELECT USING (true);
CREATE POLICY "Creador/GM gestionan sesiones" ON public.event_sessions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.events e WHERE e.id = event_sessions.event_id AND (e.creator_id = auth.uid() OR is_gm_or_admin())
  ));

CREATE TABLE public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.characters(id),
  status text NOT NULL DEFAULT 'inscrito' CHECK (status IN ('inscrito','confirmado','ausente')),
  xp_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, character_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes visibles" ON public.event_participants FOR SELECT USING (true);

CREATE POLICY "Jugadores inscriben sus personajes" ON public.event_participants
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = event_participants.character_id AND c.player_id = auth.uid()
  ));

CREATE POLICY "GM/Admin gestionan participaciones" ON public.event_participants
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.skill_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  status approval_status NOT NULL DEFAULT 'pendiente',
  justification text NOT NULL,
  reviewer_id uuid REFERENCES public.profiles(id),
  review_notes text,
  reviewed_at timestamptz,
  total_xp_cost int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jugadores ven sus solicitudes" ON public.skill_requests
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = skill_requests.character_id AND c.player_id = auth.uid()
  ) OR is_gm_or_admin());

CREATE POLICY "Jugadores crean solicitudes" ON public.skill_requests
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = skill_requests.character_id AND c.player_id = auth.uid()
  ));

CREATE POLICY "GM/Admin gestionan solicitudes" ON public.skill_requests
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.skill_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.skill_requests(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id),
  specialization text,
  from_level int NOT NULL,
  to_level int NOT NULL,
  xp_cost int NOT NULL
);

ALTER TABLE public.skill_request_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Items visibles según request" ON public.skill_request_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.skill_requests r
    JOIN public.characters c ON c.id = r.character_id
    WHERE r.id = skill_request_items.request_id AND (c.player_id = auth.uid() OR is_gm_or_admin())
  ));
CREATE POLICY "GM/Admin gestionan items" ON public.skill_request_items
  FOR ALL USING (is_gm_or_admin());

CREATE TABLE public.xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id),
  amount int NOT NULL,
  reason text NOT NULL,
  source text NOT NULL,
  source_id uuid,
  awarded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jugadores ven XP de sus personajes" ON public.xp_transactions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.characters c WHERE c.id = xp_transactions.character_id AND c.player_id = auth.uid()
  ) OR is_gm_or_admin());

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action audit_action NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Audit logs solo admin" ON public.audit_logs
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.is_gm_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('gm', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action audit_action,
  p_entity_type text,
  p_entity_id uuid,
  p_details jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_story(p_story_id uuid, p_notes text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_character_id uuid;
  v_player_id uuid;
BEGIN
  SELECT character_id INTO v_character_id FROM public.stories WHERE id = p_story_id;
  SELECT player_id INTO v_player_id FROM public.characters WHERE id = v_character_id;

  UPDATE public.stories
  SET status = 'aprobado', review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_story_id;

  UPDATE public.characters
  SET status = 'pendiente'
  WHERE id = v_character_id AND status = 'borrador';

  UPDATE public.profiles
  SET role = 'rolero'
  WHERE id = v_player_id AND role = 'pendiente';

  PERFORM public.log_audit('aprobar', 'story', p_story_id, jsonb_build_object('notes', p_notes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_character(p_character_id uuid, p_notes text DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET status = 'aprobado', review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_character_id;

  PERFORM public.log_audit('aprobar', 'character', p_character_id, jsonb_build_object('notes', p_notes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reject_story(p_story_id uuid, p_notes text)
RETURNS void AS $$
BEGIN
  UPDATE public.stories
  SET status = 'rechazado', review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_story_id;
  PERFORM public.log_audit('rechazar', 'story', p_story_id, jsonb_build_object('notes', p_notes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reject_character(p_character_id uuid, p_notes text)
RETURNS void AS $$
BEGIN
  UPDATE public.characters
  SET status = 'rechazado', review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now()
  WHERE id = p_character_id;
  PERFORM public.log_audit('rechazar', 'character', p_character_id, jsonb_build_object('notes', p_notes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.approve_skill_request(p_request_id uuid, p_notes text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_character_id uuid;
  v_total_cost int;
  v_balance int;
BEGIN
  SELECT character_id, total_xp_cost INTO v_character_id, v_total_cost
  FROM public.skill_requests WHERE id = p_request_id;

  SELECT rp_points INTO v_balance FROM public.characters WHERE id = v_character_id;

  IF v_balance < v_total_cost THEN
    RAISE EXCEPTION 'Puntos de rol insuficientes';
  END IF;

  UPDATE public.characters SET rp_points = rp_points - v_total_cost WHERE id = v_character_id;

  INSERT INTO public.character_skills (character_id, skill_id, specialization, level)
  SELECT v_character_id, skill_id, specialization, to_level
  FROM public.skill_request_items WHERE request_id = p_request_id
  ON CONFLICT (character_id, skill_id, specialization)
  DO UPDATE SET level = EXCLUDED.level;

  UPDATE public.skill_requests
  SET status = 'aprobado', reviewer_id = auth.uid(), review_notes = p_notes, reviewed_at = now()
  WHERE id = p_request_id;

  INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
  VALUES (v_character_id, -v_total_cost, 'Compra de habilidades', 'skill_request', p_request_id, auth.uid());

  PERFORM public.log_audit('aprobar', 'skill_request', p_request_id, jsonb_build_object('notes', p_notes, 'xp_cost', v_total_cost));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.confirm_event_completion(p_event_id uuid, p_notes text DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_type event_type;
  v_start timestamptz;
  v_end timestamptz;
  v_xp_participation int;
  v_xp_creator int;
  v_xp_campaign int;
  v_days_threshold int;
  v_creator uuid;
BEGIN
  SELECT type, starts_at, ends_at, creator_id
  INTO v_type, v_start, v_end, v_creator
  FROM public.events WHERE id = p_event_id;

  v_xp_participation := (SELECT (value->>'participacion')::int FROM public.settings WHERE key = 'xp_rewards');
  v_xp_creator := (SELECT (value->>'crear_evento')::int FROM public.settings WHERE key = 'xp_rewards');
  v_xp_campaign := (SELECT (value->>'campana_larga')::int FROM public.settings WHERE key = 'xp_rewards');
  v_days_threshold := (SELECT (value->>'dias_campana_larga')::int FROM public.settings WHERE key = 'xp_rewards');

  INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
  SELECT id, v_xp_creator, 'Crear evento', 'event', p_event_id, auth.uid()
  FROM public.characters
  WHERE player_id = v_creator AND status = 'aprobado'
  LIMIT 1;

  UPDATE public.characters SET rp_points = rp_points + v_xp_creator
  WHERE player_id = v_creator AND status = 'aprobado';

  UPDATE public.characters SET rp_points = rp_points + v_xp_participation
  WHERE id IN (SELECT character_id FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado');

  INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
  SELECT character_id, v_xp_participation, 'Participación en evento', 'event', p_event_id, auth.uid()
  FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado';

  UPDATE public.event_participants SET xp_awarded = v_xp_participation
  WHERE event_id = p_event_id AND status = 'confirmado';

  IF v_type = 'campana' AND v_start IS NOT NULL AND v_end IS NOT NULL AND EXTRACT(EPOCH FROM (v_end - v_start))/86400 >= v_days_threshold THEN
    UPDATE public.characters SET rp_points = rp_points + v_xp_campaign
    WHERE id IN (SELECT character_id FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado');

    INSERT INTO public.xp_transactions (character_id, amount, reason, source, source_id, awarded_by)
    SELECT character_id, v_xp_campaign, 'Finalización de campaña larga', 'event', p_event_id, auth.uid()
    FROM public.event_participants WHERE event_id = p_event_id AND status = 'confirmado';

    UPDATE public.event_participants SET xp_awarded = xp_awarded + v_xp_campaign
    WHERE event_id = p_event_id AND status = 'confirmado';
  END IF;

  UPDATE public.events
  SET status = 'finalizado', updated_at = now()
  WHERE id = p_event_id;

  PERFORM public.log_audit('finalizar_evento', 'event', p_event_id, jsonb_build_object('notes', p_notes));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_character_attributes()
RETURNS TRIGGER AS $$
DECLARE
  v_min int;
  v_max int;
  v_total int;
BEGIN
  SELECT (value->>'min_attribute')::int, (value->>'max_attribute')::int
  INTO v_min, v_max FROM public.settings WHERE key = 'character_creation';

  v_total := NEW.attr_fis + NEW.attr_des + NEW.attr_int + NEW.attr_per + NEW.attr_esp;

  IF NEW.attr_fis < v_min OR NEW.attr_des < v_min OR NEW.attr_int < v_min OR NEW.attr_per < v_min OR NEW.attr_esp < v_min THEN
    RAISE EXCEPTION 'Atributo por debajo del mínimo permitido';
  END IF;

  IF NEW.attr_fis > v_max OR NEW.attr_des > v_max OR NEW.attr_int > v_max OR NEW.attr_per > v_max OR NEW.attr_esp > v_max THEN
    RAISE EXCEPTION 'Atributo por encima del máximo permitido';
  END IF;

  IF v_total != (v_min * 5 + (SELECT (value->>'attribute_points')::int FROM public.settings WHERE key = 'character_creation')) THEN
    RAISE EXCEPTION 'Distribución de atributos incorrecta';
  END IF;

  IF (
    NEW.attr_fis = v_max OR NEW.attr_des = v_max OR NEW.attr_int = v_max OR NEW.attr_per = v_max OR NEW.attr_esp = v_max
  ) AND NOT (
    NEW.attr_fis = v_min OR NEW.attr_des = v_min OR NEW.attr_int = v_min OR NEW.attr_per = v_min OR NEW.attr_esp = v_min
  ) THEN
    RAISE EXCEPTION 'Si un atributo es 10, otro debe ser 4';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_character_attributes
  BEFORE INSERT OR UPDATE ON public.characters
  FOR EACH ROW EXECUTE FUNCTION public.validate_character_attributes();

CREATE INDEX idx_characters_player ON public.characters(player_id);
CREATE INDEX idx_characters_status ON public.characters(status);
CREATE INDEX idx_stories_character ON public.stories(character_id);
CREATE INDEX idx_stories_status ON public.stories(status);
CREATE INDEX idx_character_skills_character ON public.character_skills(character_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX idx_xp_transactions_character ON public.xp_transactions(character_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
