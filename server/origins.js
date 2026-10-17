// Solo se confía en direcciones configuradas por el operador o por Netlify.
// Nunca se amplía la lista a partir de Host, X-Forwarded-Host o Origin del visitante.
export function originPolicy(
  env,
  { serverless = false, production = false } = {},
) {
  const normalize = (value) => {
    if (typeof value !== "string" || !value.trim()) return null;
    try {
      const url = new URL(value.trim());
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        (production && url.protocol !== "https:")
      )
        return null;
      return url.origin;
    } catch {
      return null;
    }
  };
  let configured = normalize(env.PUBLIC_URL);
  const platform = serverless ? normalize(env.URL) : null;
  // Al renombrar el sitio, PUBLIC_URL puede conservar su antiguo dominio netlify.app.
  // La dirección principal que publica Netlify prevalece sobre ese alias obsoleto.
  if (
    platform &&
    configured &&
    new URL(configured).hostname.endsWith(".netlify.app")
  )
    configured = platform;
  const publicUrl =
    configured || platform || (!production ? "http://localhost:5173" : null);
  const allowed = new Set([configured, platform, publicUrl].filter(Boolean));
  return {
    publicUrl,
    origins: [...allowed],
    allows: (value) => {
      const origin = normalize(value);
      return origin !== null && allowed.has(origin);
    },
  };
}
