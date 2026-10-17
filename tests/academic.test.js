import { test } from "node:test";
import assert from "node:assert/strict";
import {
  migrateAcademic,
  validateAcademic,
  workload,
  publishIssues,
  loadFingerprint,
  calendar,
  conflicts,
  contract,
  invalidate,
} from "../server/academic.js";
import { encode, decode, demo } from "../server/store.js";
import { fixture } from "./fixtures.js";
import { exportAcademic, importAcademic } from "../server/academic-excel.js";
test("migración conserva claves, asignaciones y respuestas sin inventar tipo de contrato ni grupo", () => {
  const db = structuredClone(demo),
    old = structuredClone(db);
  const a = migrateAcademic(db);
  assert.deepEqual(db.Clases_Asignadas, old.Clases_Asignadas);
  assert.equal(a.profesores[0].tipo, "Por clasificar");
  assert.equal(a.ofertas[0].grupo, "");
  assert.equal(a.participaciones[1].estatus, "Aceptada");
  assert.equal(migrateAcademic(db), a);
  validateAcademic(a);
});
test("UDC proporcionales semestrales, coordinación adicional e intensivas incluidas", () => {
  const a = fixture().academic;
  assert.equal(workload(a, "L001", "FJ27").total, 1.5);
  a.ofertas.push({
    id: "I",
    clave: "I",
    grupo: "001",
    semestre: "FJ27",
    uf: "UF2",
    modalidad: "Intensiva",
    duracion: 1,
    periodos: "I1",
    udc: 2,
    estado: "Borrador",
  });
  a.participaciones.push({
    id: "RI",
    oferta: "I",
    profesor: "L001",
    porcentaje: 100,
    estatus: "Pendiente",
    comentarios: "",
  });
  assert.equal(workload(a, "L001", "FJ27").total, 3.5);
  assert.equal(workload(a, "L001", "FJ27").intensivas, 2);
  a.ofertas[0].duracion = 15;
  a.ofertas[0].periodos = "P1,P2,P3";
  assert.equal(workload(a, "L001", "FJ27").total, 3.5);
});
test("100% por grupo, claves independientes, consecutividad y coordinación solo bloques", () => {
  const a = fixture().academic;
  validateAcademic(a);
  assert.equal(publishIssues(a, a.ofertas[0]).length, 0);
  a.participaciones[0].porcentaje = 40;
  validateAcademic(a);
  assert.match(publishIssues(a, a.ofertas[0]).join(" "), /100/);
  a.participaciones[0].porcentaje = 60;
  assert.throws(() => validateAcademic(a), /100/);
  a.participaciones[0].porcentaje = 50;
  a.ofertas[0].periodos = "P1,P3";
  assert.throws(() => validateAcademic(a), /consecutivas/);
  a.ofertas[0].periodos = "P1,P2";
  a.ufs[0].tipo = "Materia";
  assert.throws(() => validateAcademic(a), /Coordinación/);
});
test("calendario de 17 semanas y contrato por participación real, sin tope por periodo", () => {
  const a = fixture().academic;
  const c = calendar(a.semestres[0]);
  assert.equal(c[1].inicio, "2027-03-08");
  assert.equal(c[2].inicio, "2027-03-15");
  assert.equal(c[3].inicio, "2027-04-19");
  assert.equal(c[4].inicio, "2027-04-26");
  assert.equal(contract(a, "L002", "FJ27").fin, c[2].fin);
  a.semestres[0].inicio = "2027-02-02";
  assert.throws(() => validateAcademic(a), /lunes/);
});
test("topes por contrato y aprobación se invalidan al cambiar la asignación", () => {
  const a = fixture().academic;
  a.ofertas[0].udc = 24;
  assert.equal(workload(a, "L002", "FJ27").estado, "Sobrecarga pendiente");
  a.sobrecargas.push({
    id: "AP",
    profesor: "L002",
    semestre: "FJ27",
    total: 12,
    firma: loadFingerprint(a, "L002", "FJ27"),
  });
  assert.equal(workload(a, "L002", "FJ27").estado, "Sobrecarga aprobada");
  a.ofertas[0].udc = 25;
  assert.equal(workload(a, "L002", "FJ27").estado, "Sobrecarga pendiente");
  assert.equal(workload(a, "L001", "FJ27").max, 14);
});
test("conflictos solo cuando coinciden día, segmento y horas; extremos contiguos no colisionan", () => {
  const a = fixture().academic;
  a.sesiones.push({ ...a.sesiones[0], id: "S2", segmentos: "P3" });
  assert.equal(conflicts(a, "FJ27").length, 0);
  a.sesiones[1].segmentos = "P1";
  assert.equal(conflicts(a, "FJ27").length, 1);
  a.sesiones[1].horario = "13:00-15:00";
  assert.equal(conflicts(a, "FJ27").length, 0);
});
test("publicar no invalida publicación, editar horario reinicia aceptación", () => {
  const a = fixture().academic;
  const before = structuredClone(a);
  a.ofertas[0].estado = "Publicada";
  invalidate(a, before);
  assert.equal(a.ofertas[0].estado, "Publicada");
  a.participaciones[0].estatus = "Aceptada";
  const before2 = structuredClone(a);
  a.sesiones[0].horario = "10:00-14:00";
  invalidate(a, before2);
  assert.equal(a.ofertas[0].estado, "Borrador");
  assert.equal(a.participaciones[0].estatus, "Pendiente");
});
test("Excel local conserva estado y exportación pública omite contraseñas; importar conserva cuentas", async () => {
  const db = fixture();
  db.academic.admins.push({
    id: "admin",
    nombre: "Admin",
    hash: "NO_EXPORTAR",
  });
  const roundtrip = await decode(await encode(db));
  assert.deepEqual(roundtrip, db);
  const xlsx = await exportAcademic(db.academic);
  const imported = await importAcademic(xlsx, db.academic);
  assert.deepEqual(imported.admins, db.academic.admins);
  assert.equal(imported.ofertas[0].grupo, "302");
  assert.equal(imported.ofertas[0].clave, "123");
  validateAcademic(imported);
});

test("códigos de grupo siguen los periodos y no se confunden con la clave única", () => {
  const a = fixture().academic;
  assert.equal(a.ofertas[0].grupo, "302");
  assert.equal(a.ofertas[0].clave, "123");
  a.ofertas[0].grupo = "102";
  assert.match(publishIssues(a, a.ofertas[0]).join(" "), /base 300/);
  a.ofertas[0].duracion = 5;
  a.ofertas[0].periodos = "P1";
  a.sesiones[0].segmentos = "P1";
  assert.equal(publishIssues(a, a.ofertas[0]).length, 0);
  a.ofertas.push({ ...a.ofertas[0], id: "O2" });
  assert.throws(() => validateAcademic(a), /clave única/);
});
