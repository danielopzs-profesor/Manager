import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabaseRuntime } from "../server/database.js";
import { fixture } from "./fixtures.js";
import ExcelJS from "exceljs";
test(
  "Netlify + PostgreSQL: migration backup, concurrency, persistent sessions, tokens, approvals and binary Excel",
  { skip: !process.env.TEST_DATABASE_URL },
  async () => {
    const [a, b] = await Promise.all([
      createDatabaseRuntime(process.env.TEST_DATABASE_URL),
      createDatabaseRuntime(process.env.TEST_DATABASE_URL),
    ]);
    try {
      await Promise.all([a.store.init(), b.store.init()]);
      await a.store.mutate(() => fixture());
      await Promise.all([
        a.store.mutate((d) => {
          d.academic.participaciones[0].comentarios = "Cambio A";
        }),
        b.store.mutate((d) => {
          d.academic.participaciones[1].comentarios = "Cambio B";
        }),
      ]);
      const saved = await b.store.read();
      assert.equal(saved.academic.participaciones[0].comentarios, "Cambio A");
      assert.equal(saved.academic.participaciones[1].comentarios, "Cambio B");
      assert.equal(
        (await a.pool.query("SELECT count(*) FROM arte_workbook_backup"))
          .rows[0].count,
        "1",
      );
      await assert.rejects(
        a.store.mutate((d) => {
          d.academic.participaciones[0].profesor = "inexistente";
        }),
      );
      await a.offers.put("single-token", {
        nomina: "L001",
        expires: Date.now() + 10000,
      });
      assert.equal(
        (
          await Promise.all([
            a.offers.consume("single-token", "L001"),
            b.offers.consume("single-token", "L001"),
          ])
        ).filter(Boolean).length,
        1,
      );
      Object.assign(process.env, {
        DATABASE_URL: process.env.TEST_DATABASE_URL,
        ADMIN_PASSWORD: "test-password",
        SESSION_SECRET: "test-secret-longer-than-thirty-two-characters",
        PUBLIC_URL: "https://otro.example.test",
        URL: "https://arte.example.test",
        OFFER_DELIVERY: "manual",
      });
      const one = await import(
        process.env.TEST_NETLIFY_BUNDLE || "../netlify/functions/api.mjs?one"
      );
      const two = await import(
        process.env.TEST_NETLIFY_BUNDLE || "../netlify/functions/api.mjs?two"
      );
      const request = async (worker, route, body, cookie, ip = "192.0.2.12") =>
        worker.handler(
          {
            path: "/.netlify/functions/api/api" + route,
            httpMethod: body ? "POST" : "GET",
            headers: {
              host: "arte.example.test",
              origin: "https://arte.example.test",
              "x-nf-client-connection-ip": ip,
              "content-type": "application/json",
              ...(cookie ? { cookie } : {}),
            },
            body: body ? JSON.stringify(body) : null,
            isBase64Encoded: false,
          },
          {},
        );
      const login = await request(one, "/login", {
        role: "admin",
        password: "test-password",
      });
      assert.equal(login.statusCode, 200, login.body);
      const cookie = (login.multiValueHeaders?.["set-cookie"] || [
        login.headers?.["set-cookie"],
      ])[0];
      assert.match(cookie, /Secure/);
      const ac = cookie.split(";")[0];
      let d = JSON.parse((await request(two, "/academic", null, ac)).body);
      const rev = d.revision;
      assert.equal(d.cargas[0].total, 1.5);
      const racing = await Promise.all([
        request(
          one,
          "/academic/save",
          {
            revision: rev,
            collection: "ufs",
            item: { id: "UF2", nombre: "Nuevo A", tipo: "Materia", udc: 2 },
          },
          ac,
        ),
        request(
          two,
          "/academic/save",
          {
            revision: rev,
            collection: "ufs",
            item: { id: "UF2", nombre: "Nuevo B", tipo: "Materia", udc: 2 },
          },
          ac,
        ),
      ]);
      assert.deepEqual(racing.map((r) => r.statusCode).sort(), [200, 409]);
      d = JSON.parse((await request(one, "/academic", null, ac)).body);
      assert.equal(
        (
          await request(
            two,
            "/academic/publish",
            { id: "O1", revision: d.revision },
            ac,
          )
        ).statusCode,
        200,
      );
      d = JSON.parse((await request(one, "/academic", null, ac)).body);
      assert.equal(d.ofertas[0].estado, "Publicada");
      const notify = await request(one, "/notify/L001", {}, ac);
      assert.equal(notify.statusCode, 200, notify.body);
      const url = new URL(
        JSON.parse(notify.body).preview.match(/https:\/\/\S+/)[0],
      );
      assert.equal(url.searchParams.has("token"), false);
      let accessData = JSON.parse(
        (await request(one, "/academic", null, ac)).body,
      );
      const setup = await request(
        one,
        "/academic/professor-password",
        {
          profesor: "L001",
          password: "professor-password-123",
          revision: accessData.revision,
        },
        ac,
      );
      assert.equal(setup.statusCode, 200, setup.body);
      assert.equal(
        (
          await request(two, "/login", {
            role: "profesor",
            identifier: "mariana@example.edu",
            password: "wrong",
          })
        ).statusCode,
        401,
      );
      const p = await request(two, "/login", {
        role: "profesor",
        identifier: "mariana@example.edu",
        password: "professor-password-123",
      });
      assert.equal(p.statusCode, 200, p.body);
      assert.equal(
        (
          await request(one, "/login", {
            role: "profesor",
            identifier: "mariana@example.edu",
            password: "professor-password-123",
          })
        ).statusCode,
        200,
      );
      const pc = (p.multiValueHeaders?.["set-cookie"] || [
        p.headers?.["set-cookie"],
      ])[0].split(";")[0];
      const pd = JSON.parse((await request(one, "/academic", null, pc)).body);
      assert.equal(pd.participaciones.length, 1);
      assert.equal(
        (
          await request(
            two,
            "/academic/respond",
            { revision: pd.revision, ids: ["R1"], estatus: "Aceptada" },
            pc,
          )
        ).statusCode,
        200,
      );
      const out = await request(two, "/academic/export", null, ac);
      assert.equal(out.isBase64Encoded, true);
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(Buffer.from(out.body, "base64"));
      assert.equal(
        book.getWorksheet("ofertas").getRow(2).getCell(2).text,
        "123",
      );
      assert.equal(
        book.getWorksheet("ofertas").getRow(2).getCell(3).text,
        "302",
      );
      assert.equal(book.getWorksheet("admins"), undefined);
      const fresh = await createDatabaseRuntime(process.env.TEST_DATABASE_URL);
      await fresh.store.init();
      assert.equal(
        (await fresh.store.read()).academic.participaciones[0].estatus,
        "Aceptada",
      );
      await fresh.sessions.close();
      await fresh.pool.end();
      await request(one, "/logout", {}, ac);
      assert.equal((await request(two, "/academic", null, ac)).statusCode, 401);
      let limited;
      for (let i = 0; i < 17; i++)
        limited = await request(
          i % 2 ? one : two,
          "/login",
          { role: "admin", password: "bad" },
          null,
          "192.0.2.88",
        );
      assert.equal(limited.statusCode, 429);
      assert.match(JSON.parse(limited.body).error, /Demasiados/);
    } finally {
      await a.sessions.close();
      await b.sessions.close();
      await a.pool.end();
      await b.pool.end();
    }
  },
);
