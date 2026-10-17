import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabaseRuntime } from "../server/database.js";
import { decode, encode, demo } from "../server/store.js";
// Usa exclusivamente una base aislada: esta prueba sustituye la programación de prueba.
test(
  "Netlify/PostgreSQL: persistencia, concurrencia, cookies HTTPS, tokens de un uso y Excel binario",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const [a, b] = await Promise.all([
      createDatabaseRuntime(process.env.TEST_DATABASE_URL),
      createDatabaseRuntime(process.env.TEST_DATABASE_URL),
    ]);
    try {
      await Promise.all([a.store.init(), b.store.init()]);
      await a.store.mutate(() => structuredClone(demo));
      await Promise.all([
        a.store.mutate((d) => {
          d.Clases_Asignadas[0].estatus = "Aceptada";
        }),
        b.store.mutate((d) => {
          d.Clases_Asignadas[1].comentarios = "Persistente entre funciones";
        }),
      ]);
      assert.equal(
        (await b.store.read()).Clases_Asignadas[0].estatus,
        "Aceptada",
      );
      assert.equal(
        (await a.store.read()).Clases_Asignadas[1].comentarios,
        "Persistente entre funciones",
      );
      await assert.rejects(
        a.store.mutate((d) => {
          d.Clases_Asignadas[0].nomina_profesor = "nadie";
        }),
      );
      assert.equal(
        (await b.store.read()).Clases_Asignadas[0].nomina_profesor,
        "L001",
      );
      await a.offers.put("single-test-token", {
        nomina: "L001",
        expires: Date.now() + 10000,
      });
      const claims = await Promise.all([
        a.offers.consume("single-test-token", "L001"),
        b.offers.consume("single-test-token", "L001"),
      ]);
      assert.equal(claims.filter(Boolean).length, 1);
      Object.assign(process.env, {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        ADMIN_PASSWORD: "test-password",
        SESSION_SECRET: "a-test-secret-with-more-than-32-characters",
        PUBLIC_URL: "https://arte.example.test",
        OFFER_DELIVERY: "manual",
      });
      const worker1 = await import(
        process.env.TEST_NETLIFY_BUNDLE || "../netlify/functions/api.mjs?one"
      );
      const worker2 = await import(
        process.env.TEST_NETLIFY_BUNDLE || "../netlify/functions/api.mjs?two"
      );
      const request = async (worker, path, body, cookie) =>
        worker.handler(
          {
            path: "/.netlify/functions/api/api" + path,
            httpMethod: body ? "POST" : "GET",
            headers: {
              host: "arte.example.test",
              origin: "https://arte.example.test",
              "content-type": "application/json",
              ...(cookie ? { cookie } : {}),
            },
            body: body ? JSON.stringify(body) : null,
            isBase64Encoded: false,
            queryStringParameters: null,
            requestContext: { identity: { sourceIp: "127.0.0.9" } },
          },
          {},
        );
      assert.equal((await request(worker1, "/data")).statusCode, 401);
      assert.equal(
        (
          await request(worker1, "/login", {
            role: "profesor",
            identifier: "L001",
          })
        ).statusCode,
        401,
      );
      const login = await request(worker1, "/login", {
        role: "admin",
        password: "test-password",
      });
      assert.equal(login.statusCode, 200, login.body);
      for (const headers of [
        { "x-nf-client-connection-ip": "192.0.2.33" },
        {},
      ]) {
        const netlifyLogin = await worker2.handler(
          {
            path: "/.netlify/functions/api/api/login",
            httpMethod: "POST",
            headers: {
              ...headers,
              host: "arte.example.test",
              origin: "https://arte.example.test",
              "content-type": "application/json",
            },
            body: JSON.stringify({ role: "admin", password: "test-password" }),
            isBase64Encoded: false,
          },
          {},
        );
        assert.equal(netlifyLogin.statusCode, 200, netlifyLogin.body);
      }
      const cookies = login.multiValueHeaders?.["set-cookie"] || [
        login.headers?.["set-cookie"],
      ];
      assert.match(cookies[0], /Secure/);
      const cookie = cookies[0].split(";")[0];
      const data = await request(worker2, "/data", null, cookie);
      assert.equal(data.statusCode, 200, data.body);
      const out = await request(worker2, "/export", null, cookie);
      assert.equal(out.isBase64Encoded, true);
      const db = await decode(Buffer.from(out.body, "base64"));
      assert.equal(
        db.Clases_Asignadas[1].comentarios,
        "Persistente entre funciones",
      );
      const notify = await request(worker1, "/notify/L001", {}, cookie);
      assert.equal(notify.statusCode, 200, notify.body);
      const url = new URL(
        JSON.parse(notify.body).preview.match(/https:\/\/\S+/)[0],
      );
      const token = url.searchParams.get("token");
      const professor = await request(worker2, "/login", {
        role: "profesor",
        identifier: "L001",
        token,
      });
      assert.equal(professor.statusCode, 200, professor.body);
      assert.equal(
        (
          await request(worker1, "/login", {
            role: "profesor",
            identifier: "L001",
            token,
          })
        ).statusCode,
        401,
      );
      const formBoundary = "ArteBoundary";
      const xlsx = Buffer.from(await encode(db));
      const multipart = Buffer.concat([
        Buffer.from(
          `--${formBoundary}\r\nContent-Disposition: form-data; name="file"; filename="test.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`,
        ),
        xlsx,
        Buffer.from(`\r\n--${formBoundary}--\r\n`),
      ]);
      const imported = await worker2.handler(
        {
          path: "/.netlify/functions/api/api/import",
          httpMethod: "POST",
          headers: {
            host: "arte.example.test",
            origin: "https://arte.example.test",
            cookie,
            "content-type": `multipart/form-data; boundary=${formBoundary}`,
          },
          body: multipart.toString("base64"),
          isBase64Encoded: true,
          requestContext: { identity: { sourceIp: "127.0.0.9" } },
        },
        {},
      );
      assert.equal(imported.statusCode, 200, imported.body);
      const badOrigin = await worker1.handler(
        {
          path: "/.netlify/functions/api/api/login",
          httpMethod: "POST",
          headers: {
            origin: "https://evil.example",
            "content-type": "application/json",
          },
          body: "{}",
          requestContext: { identity: {} },
        },
        {},
      );
      assert.equal(badOrigin.statusCode, 403);
      await request(worker1, "/logout", {}, cookie);
      assert.equal(
        (await request(worker2, "/data", null, cookie)).statusCode,
        401,
      );
      let limited;
      for (let i = 0; i < 16; i++)
        limited = await request(i % 2 ? worker1 : worker2, "/login", {
          role: "admin",
          password: "incorrecta",
        });
      assert.equal(limited.statusCode, 429);
      assert.match(JSON.parse(limited.body).error, /Demasiados intentos/);
      // Nuevos pools y procesos ya no dependen de un archivo local ni memoria de sesión.
      const fresh = await createDatabaseRuntime(process.env.TEST_DATABASE_URL);
      assert.equal(
        (await fresh.store.read()).Clases_Asignadas[1].comentarios,
        "Persistente entre funciones",
      );
      await fresh.sessions.close();
      await fresh.pool.end();
    } finally {
      await a.sessions.close();
      await b.sessions.close();
      await a.pool.end();
      await b.pool.end();
    }
  },
);
