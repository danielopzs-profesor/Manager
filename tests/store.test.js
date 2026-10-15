import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store, demo, decode, encode, validate } from "../server/store.js";
test("Excel conserva las tres pestañas y sus relaciones", async () => {
  const db = await decode(await encode(structuredClone(demo)));
  assert.deepEqual(db, demo);
});
test("rechaza referencias, duplicados y horarios inválidos", () => {
  for (const change of [
    (d) => (d.Clases_Asignadas[0].nomina_profesor = "inexistente"),
    (d) => d.Profesores.push({ ...d.Profesores[0] }),
    (d) => (d.Clases_Asignadas[0].horario = "25:00-26:00"),
  ]) {
    const db = structuredClone(demo);
    change(db);
    assert.throws(() => validate(db));
  }
});
test("serializa respuestas concurrentes y persiste tras reabrir", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "arte-"));
  try {
    const s = new Store(path.join(dir, "test.xlsx"));
    await s.init();
    await Promise.all([
      s.mutate((d) => {
        d.Clases_Asignadas[0].estatus = "Aceptada";
      }),
      s.mutate((d) => {
        d.Clases_Asignadas[1].estatus = "Cambio Solicitado";
        d.Clases_Asignadas[1].comentarios = "Mover al martes";
      }),
    ]);
    const reopened = new Store(s.file);
    await reopened.init();
    const db = await reopened.read();
    assert.equal(db.Clases_Asignadas[0].estatus, "Aceptada");
    assert.equal(db.Clases_Asignadas[1].comentarios, "Mover al martes");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
