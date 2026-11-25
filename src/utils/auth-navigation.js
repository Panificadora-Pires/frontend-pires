const AUTH_PATHS = new Set(['/login', '/cadastro', '/recuperar-senha', '/redefinir-senha', '/confirmar-email']);

export function safeAuthRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\s]/u.test(value)) return '';
  try {
    let decoded = value;
    for (let i = 0; i < 4; i++) {
      if (decoded.startsWith('//') || /[\\\u0000-\u0020\u007f]/u.test(decoded)) return '';
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    const url = new URL(decoded, 'https://pires.invalid');
    if (url.origin !== 'https://pires.invalid' || AUTH_PATHS.has(url.pathname.toLowerCase().replace(/\/$/, ''))) return '';
    return value;
  } catch {
    return '';
  }
}
