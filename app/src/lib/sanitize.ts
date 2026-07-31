/**
 * Sanitiza HTML para prevenir XSS.
 * Elimina etiquetas script, event handlers on*, y javascript: URLs.
 * No requiere dependencias externas.
 */
export function sanitizeHtml(html: string): string {
  return html
    // Eliminar etiquetas <script> y su contenido
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Eliminar event handlers (onclick, onerror, onload, etc.)
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // Eliminar javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    .replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""')
    // Eliminar etiquetas <iframe>, <embed>, <object>
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<object\b[^>]*>.*?<\/object>/gi, '');
}