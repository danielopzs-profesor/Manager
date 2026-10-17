import { test } from "node:test";
import assert from "node:assert/strict";
import { originPolicy } from "../server/origins.js";
test("Netlify acepta la dirección principal aunque PUBLIC_URL conserve otra dirección", () => {
  const p = originPolicy(
    {
      PUBLIC_URL: "https://herramientas.example.edu",
      URL: "https://graceful-taffy-4b9452.netlify.app/",
    },
    { serverless: true, production: true },
  );
  assert.equal(p.allows("https://graceful-taffy-4b9452.netlify.app"), true);
  assert.equal(p.allows("https://herramientas.example.edu"), true);
  assert.equal(p.allows("https://evil.example"), false);
  assert.equal(
    p.allows("https://graceful-taffy-4b9452.netlify.app.evil.example"),
    false,
  );
  assert.equal(p.allows("null"), false);
});
test("normaliza configuración y conserva controles HTTPS sin confiar en dominios de previews", () => {
  const p = originPolicy(
    {
      PUBLIC_URL: "  http://localhost:3000 ",
      URL: "https://arte.netlify.app",
      DEPLOY_PRIME_URL: "https://deploy-preview-1--arte.netlify.app",
    },
    { serverless: true, production: true },
  );
  assert.equal(p.publicUrl, "https://arte.netlify.app");
  assert.equal(p.allows("http://localhost:3000"), false);
  assert.equal(p.allows("https://deploy-preview-1--arte.netlify.app"), false);
  const local = originPolicy({}, { production: false });
  assert.equal(local.allows("http://localhost:5173"), true);
});

test("renombrar el sitio actualiza acceso y enlaces sin conservar el alias antiguo de Netlify", () => {
  const p = originPolicy(
    {
      PUBLIC_URL: "https://graceful-taffy-4b9452.netlify.app",
      URL: "https://manager-chan.netlify.app",
    },
    { serverless: true, production: true },
  );
  assert.equal(p.publicUrl, "https://manager-chan.netlify.app");
  assert.equal(p.allows("https://manager-chan.netlify.app"), true);
  assert.equal(p.allows("https://graceful-taffy-4b9452.netlify.app"), false);
});
