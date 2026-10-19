import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../server/app.js";
import { fixture } from "./fixtures.js";
import { Store } from "../server/store.js";
test("API académica: cuentas individuales, revisiones, publicación, permisos, respuesta e historial", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arte-api-"));
  const file = path.join(dir, "book.xlsx");
  const store = new Store(file);
  await store.init();
  await store.mutate(() => fixture());
  const runtime = await createApp({
    env: {
      NODE_ENV: "test",
      EXCEL_PATH: file,
      ADMIN_PASSWORD: "test-password",
    },
  });
  const server = runtime.app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const url = "http://127.0.0.1:" + server.address().port;
  const request = async (route, body, cookie) =>
    fetch(url + "/api" + route, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  let cookie;
  try {
    assert.equal((await request("/academic")).status, 401);
    const login = await request("/login", {
      role: "admin",
      password: "test-password",
    });
    cookie = login.headers.get("set-cookie").split(";")[0];
    let a = await (await request("/academic", null, cookie)).json();
    assert.equal(a.cargas[0].total, 1.5);
    const revision = a.revision;
    let r = await request("/academic/publish", { id: "O1", revision }, cookie);
    assert.equal(r.status, 200, await r.text());
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(a.ofertas[0].estado, "Publicada");
    assert.equal(
      (
        await request(
          "/academic/save",
          {
            revision,
            collection: "ufs",
            item: { id: "UF1", nombre: "Stale", tipo: "Bloque", udc: 2 },
          },
          cookie,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          "/academic/respond",
          { ids: ["R1"], estatus: "Aceptada", revision: a.revision },
          cookie,
        )
      ).status,
      403,
    );
    const teacher = await request("/login", {
      role: "profesor",
      identifier: "mariana@example.edu",
    });
    const tc = teacher.headers.get("set-cookie").split(";")[0];
    let t = await (await request("/academic", null, tc)).json();
    assert.equal(t.profesores.length, 1);
    assert.equal(t.admins.length, 0);
    assert.equal(t.participaciones.length, 1);
    assert.equal(
      (
        await request(
          "/academic/save",
          { collection: "ufs", item: {}, revision: t.revision },
          tc,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          "/academic/respond",
          { ids: ["R2"], estatus: "Aceptada", revision: t.revision },
          tc,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          "/academic/respond",
          {
            ids: ["R1"],
            estatus: "Cambio Solicitado",
            comentarios: "Mover al martes",
            revision: t.revision,
          },
          tc,
        )
      ).status,
      200,
    );
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(a.participaciones[0].comentarios, "Mover al martes");
    let updated = await request(
      "/academic/save",
      {
        collection: "ofertas",
        item: { ...a.ofertas[0], udc: 24 },
        revision: a.revision,
      },
      cookie,
    );
    assert.equal(updated.status, 200, await updated.text());
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(
      a.cargas.find((c) => c.profesor === "L002").estado,
      "Sobrecarga pendiente",
    );
    updated = await request(
      "/academic/approve",
      {
        profesor: "L002",
        semestre: "FJ27",
        motivo: "Cobertura semestral autorizada",
        revision: a.revision,
      },
      cookie,
    );
    assert.equal(updated.status, 200, await updated.text());
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(
      a.cargas.find((c) => c.profesor === "L002").estado,
      "Sobrecarga aprobada",
    );
    await request(
      "/academic/save",
      {
        collection: "ofertas",
        item: { ...a.ofertas[0], udc: 26 },
        revision: a.revision,
      },
      cookie,
    );
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(
      a.cargas.find((c) => c.profesor === "L002").estado,
      "Sobrecarga pendiente",
    );
    r = await request(
      "/academic/admin",
      {
        id: "admin.uno",
        nombre: "Admin Uno",
        password: "individual-password-123",
        revision: a.revision,
      },
      cookie,
    );
    assert.equal(r.status, 200, await r.text());
    a = await (await request("/academic", null, cookie)).json();
    assert.equal(a.admins.length, 1);
    assert.equal("hash" in a.admins[0], false);
    assert.equal(
      (await request("/login", { role: "admin", password: "test-password" }))
        .status,
      401,
    );
    const personal = await request("/login", {
      identifier: "admin.uno",
      password: "individual-password-123",
    });
    assert.equal(personal.status, 200);
    assert.equal((await personal.clone().json()).role, "admin");
    const pc = personal.headers.get("set-cookie").split(";")[0];
    assert.equal(
      (
        await request(
          "/academic/admin",
          { id: "admin.uno", remove: true, revision: a.revision },
          pc,
        )
      ).status,
      400,
    );
    assert.equal((await request("/academic/export", null, pc)).status, 200);
    const backup = await (await request("/academic/backup", null, pc)).text();
    assert.equal(backup.includes("hash"), false);
    assert.match(backup, /Respuesta docente/);
    const snapshots = await (
      await request("/academic/backups", null, pc)
    ).json();
    assert.ok(snapshots.length > 0);
    const restored = await request(
      "/academic/restore",
      { id: snapshots[0].id, revision: a.revision },
      pc,
    );
    assert.equal(restored.status, 200, await restored.text());
    const afterRestore = await (await request("/academic", null, pc)).json();
    assert.equal(afterRestore.admins.length, 1);
    assert.equal(afterRestore.ofertas[0].estado, "Borrador");
    assert.equal(afterRestore.participaciones[0].estatus, "Pendiente");
    assert.ok(
      afterRestore.auditoria.some((x) => x.accion === "Restaurar respaldo"),
    );
    await readFile(file + ".pre-v2.xlsx");
  } finally {
    await new Promise((r) => server.close(r));
    await runtime.close();
    await rm(dir, { recursive: true, force: true });
  }
});
