import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store } from "../server/store.js";
import { createApp } from "../server/app.js";
import { fixture } from "./fixtures.js";
test("Consulta: ve toda la programación sin secretos, no puede modificar ni exportar, y no elimina la protección del último administrador", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arte-consulta-"));
  const file = path.join(dir, "data.xlsx");
  const store = new Store(file);
  await store.init();
  await store.mutate(() => fixture());
  const runtime = await createApp({
    env: { EXCEL_PATH: file, ADMIN_PASSWORD: "test-password" },
  });
  const server = runtime.app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = "http://127.0.0.1:" + server.address().port;
  const req = (route, body, cookie) =>
    fetch(base + "/api" + route, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  try {
    const login = await req("/login", {
      role: "admin",
      password: "test-password",
    });
    const ac = login.headers.get("set-cookie").split(";")[0];
    let data = await (await req("/academic", null, ac)).json();
    assert.equal(
      (
        await req(
          "/academic/admin",
          {
            id: "lector",
            nombre: "Lector",
            role: "consulta",
            password: "reader-password-123",
            revision: data.revision,
          },
          ac,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/academic/admin",
          {
            id: "admin.uno",
            nombre: "Administrador",
            role: "admin",
            password: "admin-password-123",
            revision: data.revision,
          },
          ac,
        )
      ).status,
      200,
    );
    data = await (await req("/academic", null, ac)).json();
    assert.equal(
      (
        await req(
          "/academic/admin",
          {
            id: "lector",
            nombre: "Lector",
            role: "consulta",
            password: "reader-password-123",
            revision: data.revision,
          },
          ac,
        )
      ).status,
      200,
    );
    data = await (await req("/academic", null, ac)).json();
    const reader = await req("/login", {
      role: "admin",
      identifier: "lector",
      password: "reader-password-123",
    });
    assert.equal((await reader.clone().json()).role, "consulta");
    const rc = reader.headers.get("set-cookie").split(";")[0];
    const r = await (await req("/academic", null, rc)).json();
    assert.equal(r.ofertas.length, data.ofertas.length);
    assert.equal(r.profesores.length, data.profesores.length);
    assert.equal(r.participaciones.length, data.participaciones.length);
    assert.equal(r.admins.length, 0);
    assert.equal(r.auditoria.length, 0);
    assert.equal(JSON.stringify(r).includes("hash"), false);
    for (const route of [
      "/academic/save",
      "/academic/delete",
      "/academic/publish",
      "/academic/approve",
      "/academic/admin",
      "/academic/restore",
      "/academic/import",
      "/academic/respond",
      "/notify/L001",
    ])
      assert.equal(
        (await req(route, { revision: r.revision }, rc)).status,
        403,
        route,
      );
    for (const route of [
      "/academic/export",
      "/academic/backups",
      "/academic/backup",
    ])
      assert.equal((await req(route, null, rc)).status, 403, route);
    assert.equal(
      (
        await req(
          "/academic/admin",
          {
            id: "admin.uno",
            nombre: "Administrador",
            role: "consulta",
            revision: data.revision,
          },
          ac,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await req(
          "/academic/admin",
          {
            id: "lector",
            nombre: "Lector",
            role: "admin",
            revision: data.revision,
          },
          ac,
        )
      ).status,
      200,
    );
    assert.equal((await req("/academic", null, rc)).status, 401);
  } finally {
    await new Promise((r) => server.close(r));
    await runtime.close();
    await rm(dir, { recursive: true, force: true });
  }
});
