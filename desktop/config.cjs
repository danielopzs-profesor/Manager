const { randomBytes } = require('node:crypto');
function validateConfig(input) {
  const url = new URL(String(input.databaseUrl || '').trim());
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password) throw Error('Pega la conexión completa de PostgreSQL que proporciona Neon.');
  if (!['require','verify-full'].includes(url.searchParams.get('sslmode'))) throw Error('La conexión debe incluir sslmode=require o sslmode=verify-full. Usa la conexión segura de Neon.');
  return { databaseUrl: url.toString(), sessionSecret: input.sessionSecret || randomBytes(48).toString('hex'), bootstrapPassword: input.bootstrapPassword || randomBytes(48).toString('hex') };
}
module.exports = { validateConfig };
