import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store } from "../server/store.js";
import { fixture } from "./fixtures.js";
import { createApp } from "../server/app.js";
import { exportAcademic, importAcademic } from "../server/academic-excel.js";
test("acceso docente por contraseña sin enlace, aislamiento, restablecimiento y conservación de credenciales al importar/restaurar", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arte-password-"));
  const file = path.join(dir, "book.xlsx");
  const store = new Store(file);
  await store.init();
  await store.mutate(() => fixture());
  const runtime = await createApp({
    env: {
      EXCEL_PATH: file,
      NODE_ENV: "production",
      PUBLIC_URL: "https://academic.example.edu",
      ADMIN_PASSWORD: "initial-admin-password",
      SESSION_SECRET: "a-secret-of-more-than-thirty-two-characters",
      TRUST_PROXY: "1",
    },
  });
  const server = runtime.app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const req = (url, body, cookie) =>
    fetch(base + "/api" + url, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-proto": "https",
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    const login = await req("/login", {
      role: "admin",
      password: "initial-admin-password",
    });
    const ac = login.headers.get("set-cookie").split(";")[0];
    let a = await (await req("/academic", null, ac)).json();
    assert.equal(
      (await req("/login", { role: "profesor", identifier: "mariana@example.edu" })).status,
      401,
    );
    const set = await req(
      "/academic/professor-password",
      {
        profesor: "L001",
        password: "professor-password-123",
        revision: a.revision,
      },
      ac,
    );
    assert.equal(set.status, 200, await set.text());
    a = await (await req("/academic", null, ac)).json();
    assert.equal(a.profesores[0].hasPassword, true);
    assert.equal(JSON.stringify(a).includes("passwordHash"), false);
    assert.equal(
      (
        await req("/login", {
          role: "profesor",
          identifier: "mariana@example.edu",
          password: "incorrecta",
        })
      ).status,
      401,
    );
    assert.equal((await req("/login", {
      role: "profesor", identifier: "L001", password: "professor-password-123",
    })).status, 401, "La nómina no permite iniciar sesión");
    const teacher = await req("/login", {
      role: "profesor",
      identifier: "  MARIANA@EXAMPLE.EDU  ",
      password: "professor-password-123",
    });
    assert.equal(teacher.status, 200);
    const tc = teacher.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (
        await req("/login", {
          role: "profesor",
          identifier: "mariana@example.edu",
          password: "professor-password-123",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await req(
          "/academic/professor-password",
          {
            profesor: "L002",
            password: "hacked-password-123",
            revision: a.revision,
          },
          tc,
        )
      ).status,
      403,
    );
    const privateBefore = (await store.read()).academic;
    const imported = await importAcademic(
      await exportAcademic(privateBefore),
      privateBefore,
    );
    assert.equal(
      imported.profesores[0].passwordHash,
      privateBefore.profesores[0].passwordHash,
    );
    const snapshots = await (await req("/academic/backups", null, ac)).json();
    const reset = await req(
      "/academic/professor-password",
      {
        profesor: "L001",
        password: "replacement-password-123",
        revision: a.revision,
      },
      ac,
    );
    assert.equal(reset.status, 200);
    assert.equal((await req("/academic", null, tc)).status, 401);
    const latest = await (await req("/academic", null, ac)).json();
    await req(
      "/academic/restore",
      { id: snapshots[0].id, revision: latest.revision },
      ac,
    );
    assert.equal(
      (
        await req("/login", {
          role: "profesor",
          identifier: "mariana@example.edu",
          password: "professor-password-123",
        })
      ).status,
      401,
    );
    assert.equal(
      (
        await req("/login", {
          role: "profesor",
          identifier: "mariana@example.edu",
          password: "replacement-password-123",
        })
      ).status,
      200,
    );
    const backup = await (await req("/academic/backup", null, ac)).text();
    assert.equal(backup.includes("passwordHash"), false);
  } finally {
    await new Promise((r) => server.close(r));
    await runtime.close();
    await rm(dir, { recursive: true, force: true });
  }
});
