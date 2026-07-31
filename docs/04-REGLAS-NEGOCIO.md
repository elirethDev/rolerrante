# Reglas de negocio

## 1. Atributos

- Todos los atributos comienzan en 4.
- Puntos para distribuir: 13 (configurable en `settings`).
- Máximo: 10, mínimo: 4.
- **Regla especial:** si un atributo llega a 10, otro debe estar obligatoriamente en 4.
- Total de atributos siempre: `5 * min + attribute_points` = `20 + 13 = 33`.

Validación en Postgres trigger `validate_character_attributes`.

### Atributos disponibles
| Código | Nombre |
|--------|--------|
| F | Físico |
| D | Destreza |
| I | Inteligencia |
| P | Percepción |
| E | Espíritu |

## 2. Habilidades

- Niveles del 1 al 10.
- En creación de ficha: máximo nivel 2.
- Puntos de creación: 30.
- Coste de una habilidad en creación = suma de niveles (subir a 2 cuesta 2 puntos, total 1+2=3).
- Si no está en la ficha, el personaje no la posee.
- Algunas habilidades requieren especialización (sub-categoría). Se registran como `Nombre (Especialización)`.

## 3. Rangos de habilidad

| Nivel | Rango |
|-------|-------|
| 1-2 | Aprendiz |
| 3-4 | Formado |
| 5-6 | Diestro |
| 7-8 | Experto |
| 9-10 | Maestro |

Para subir de nivel se requiere justificación según el rango. El sistema actualmente solo pide justificación libre; en iteraciones futuras se podrían exigir enlaces a roles/masteos.

## 4. Valores de combate (calculados en frontend)

```ts
function combatValues(character, skills) {
  const pv = character.attr_fis * 4;
  const pm = (character.mana_source === 'I' ? character.attr_int : character.attr_esp) * 4;
  const reflejos = skills.find(s => s.name === 'Reflejos')?.level ?? 0;
  const iniciativa = character.attr_per + reflejos;
  // Ataque: Habilidad de arma + atributo vinculado
  // Defensa: Destreza + Habilidad Defensa
}
```

- **PdV** = Físico × 4
- **PdM** = Inteligencia × 4 Ó Espíritu × 4 (elegido por el jugador en `mana_source`)
- **Iniciativa** = Percepción + Reflejos
- **Ataque CC** = Arma Cuerpo a Cuerpo + Físico
- **Ataque CC Sutil** = Arma Cuerpo a Cuerpo Sutil + Destreza
- **Ataque a Distancia** = Arma a Distancia + Percepción
- **Defensa** = Destreza + Defensa

Estos valores no se almacenan en BD, se calculan al renderizar la ficha.

## 5. Flujo de aprobación de personaje

```
Personaje creado (borrador)
   ↓
Jugador envía historia y ficha → historia: pendiente, personaje: borrador
   ↓
GM aprueba historia → historia: aprobada, personaje: pendiente, jugador: rolero
   ↓
Jugador envía ficha → personaje: pendiente
   ↓
GM aprueba ficha → personaje: aprobado
   ↓
Personaje visible, puede participar en eventos, solicitar habilidades
```

Nota: en la versión actual, la historia y la ficha se crean juntas en el wizard, pero se aprueban en dos etapas separadas (primero historia, luego ficha).

## 6. Puntos de experiencia (XP / puntos de rol)

- Cada personaje tiene su propio saldo `characters.rp_points`.
- Los GMs y admin otorgan XP de forma automática al confirmar la finalización de un evento.
- El admin puede editar las cantidades desde `/admin/ajustes`.

Valores iniciales:
| Acción | XP |
|--------|----|
| Participar en evento | 1 |
| Crear evento | 3 |
| Finalizar campaña larga (≥ 7 días) | 6 (adicional a participar) |

## 7. Gasto de XP en habilidades

- Cada solicitud puede contener hasta 4 habilidades.
- Coste de subir una habilidad del nivel N-1 al N = N (el nuevo nivel).
- Ejemplo: subir de 2 a 4 cuesta 3 + 4 = 7 puntos.
- El jugador debe tener saldo suficiente. Se descuenta atómicamente al aprobar el GM.
- No se permite solicitar más de 4 habilidades ni exceder el nivel 10.

## 8. Eventos

### Estados
- `publicado`: visible, se pueden inscribir personajes.
- `en_curso`: el creador/GM puede marcarlo como iniciado.
- `finalizacion_pendiente`: el creador solicita cierre, espera confirmación GM.
- `finalizado`: GM confirmó, XP entregada.
- `cancelado`: cancelado por creador/GM.

### Inscripción
- Solo personajes aprobados del usuario.
- Un mismo personaje no puede inscribirse dos veces.
- El GM puede confirmar o marcar ausente a los participantes antes del cierre.

### Finalización
- Creador pulsa "Finalizar evento".
- GM revisa en su panel `/gm/eventos`.
- GM pulsa "Confirmar finalización" → trigger `confirm_event_completion` otorga XP.

## 9. Auditoría

Toda acción relevante de GM queda en `audit_logs`:
- Aprobaciones/rechazos de historias y fichas.
- Aprobaciones de solicitudes de habilidad (con XP gastado).
- Confirmación de finalización de eventos (con XP otorgado).
- Cambios de rol por admin.
- Ediciones de catálogos/settings por admin.

Solo el rol `admin` puede leer `audit_logs`.

## 10. Reglas configurables

Almacenadas en `settings`:
- `character_creation`: puntos de atributo, puntos de habilidad, máximo inicial de habilidad.
- `xp_rewards`: cuánto XP se otorga por cada concepto.
- `skill_rank_names`: nombres de rangos por nivel.

El administrador puede modificarlas sin necesidad de cambiar código.
