// Explicit production entry point for the verified web-deploy role policy.
process.env.NODE_ENV ||= 'production';
process.env.ENFORCE_NAMED_ROLES = '1';
await import('./index.js');
