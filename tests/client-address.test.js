import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeClientAddress } from "../server/client-address.js";
test("Netlify sin requestContext usa la IP proporcionada por la plataforma", () => {
  const event = {
    headers: {
      "X-Nf-Client-Connection-Ip": "2001:db8::1",
      "x-forwarded-for": "spoofed",
    },
  };
  normalizeClientAddress(event);
  assert.equal(event.requestContext.identity.sourceIp, "2001:db8::1");
  assert.equal(event.headers["x-forwarded-for"], "2001:db8::1");
});
test("sin IP válida no se acepta una cabecera reenviada del visitante", () => {
  const event = {
    headers: {
      "x-nf-client-connection-ip": "invalid",
      "x-forwarded-for": "1.2.3.4",
    },
    multiValueHeaders: { "X-Forwarded-For": ["1.2.3.4"] },
  };
  normalizeClientAddress(event);
  assert.equal(event.requestContext.identity.sourceIp, undefined);
  assert.equal(event.headers["x-forwarded-for"], undefined);
  assert.equal(event.multiValueHeaders["X-Forwarded-For"], undefined);
});
