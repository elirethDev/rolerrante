export function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
