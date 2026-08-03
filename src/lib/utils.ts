export function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Relative time in es-ES (REQ-FORUM-06.1 "fecha relativ a"). Falls back to formatDate. */
export function formatRelativeTime(iso: string | null | undefined) {
  if (!iso) return '-';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return formatDate(iso);
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return formatDate(iso);
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusColor(status: string) {
  switch (status) {
    case 'aprobado':
    case 'finalizado':
    case 'confirmado':
      return 'badge-success';
    case 'pendiente':
    case 'finalizacion_pendiente':
    case 'inscrito':
      return 'badge-warning';
    case 'rechazado':
    case 'ausente':
    case 'cancelado':
      return 'badge-error';
    case 'borrador':
    case 'publicado':
    default:
      return 'badge-neutral';
  }
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    borrador: 'Borrador',
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    publicado: 'Publicado',
    en_curso: 'En curso',
    finalizacion_pendiente: 'Finalización pendiente',
    finalizado: 'Finalizado',
    cancelado: 'Cancelado',
    inscrito: 'Inscrito',
    confirmado: 'Confirmado',
    ausente: 'Ausente',
  };
  return labels[status] ?? status;
}

export function roleLabel(role: string) {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    rolero: 'Rolero',
    gm: 'Game Master',
    admin: 'Administrador',
  };
  return labels[role] ?? role;
}
