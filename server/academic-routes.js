import { randomUUID } from "node:crypto";
import multer from "multer";
import {
  migrateAcademic,
  validateAcademic,
  publicAcademic,
  workload,
  calendar,
  contract,
  distribution,
  conflicts,
  publishIssues,
  loadFingerprint,
  audit,
  invalidate,
  diffAcademic,
} from "./academic.js";
import { passwordHash } from "./accounts.js";
import { sheets, exportAcademic, importAcademic } from "./academic-excel.js";
export function academicRoutes(app, { store, auth, admin }) {
  const load = async () => {
    let db = await store.read();
    if (!db.academic) {
      await store.mutate((d) => {
        migrateAcademic(d);
      });
      db = await store.read();
    }
    return db.academic;
  };
  const change = async (req, fn) =>
    store.mutate(async (db) => {
      const a = migrateAcademic(db);
      if (req.body.revision !== a.revision) {
        const e = Error(
          "La programación cambió. Recarga antes de guardar para no sobrescribir cambios de otro administrador.",
        );
        e.status = 409;
        throw e;
      }
      const before = structuredClone(a);
      await fn(a);
      validateAcademic(a);
      invalidate(a, before);
      validateAcademic(a);
      audit(
        a,
        req.session.adminId || req.session.nomina || "Configuración inicial",
        req.body.action || "Actualización",
        req.body.detail || "Datos académicos actualizados",
        diffAcademic(before, a),
      );
    });
  app.get("/api/academic", auth, async (req, res) => {
    const all = await load();
    const a = publicAcademic(all, req.session);
    const semestre = String(req.query.semestre || a.semestres[0]?.id || "");
    res.json({
      ...a,
      calendario: calendar(a.semestres.find((s) => s.id === semestre)),
      cargas: a.profesores.map((p) => ({
        profesor: p.id,
        ...workload(a, p.id, semestre),
        contrato: contract(a, p.id, semestre),
        distribucion: distribution(a, p.id, semestre),
      })),
      conflictos: req.session.role === "admin" ? conflicts(all, semestre) : [],
      avisos:
        req.session.role === "admin"
          ? all.ofertas
              .filter((o) => o.semestre === semestre)
              .map((o) => ({ oferta: o.id, errores: publishIssues(all, o) }))
          : [],
    });
  });
  app.post("/api/academic/save", auth, admin, async (req, res) => {
    const { collection, item } = req.body;
    if (!Object.hasOwn(sheets, collection) || !item || typeof item !== "object")
      throw Error("Colección inválida");
    const clean = Object.fromEntries(
      sheets[collection].map((key) => [key, item[key] ?? ""]),
    );
    clean.id = String(clean.id || randomUUID());
    for (const key of ["udc", "duracion", "porcentaje"])
      if (key in clean) clean[key] = Number(clean[key]);
    if (collection === "ofertas") clean.estado = "Borrador";
    if (collection === "participaciones") {
      clean.estatus = "Pendiente";
      clean.comentarios = "";
    }
    req.body.action = "Guardar " + collection;
    req.body.detail = `Registro ${clean.id}`;
    await change(req, (a) => {
      const old = a[collection].find((r) => r.id === clean.id);
      if (
        collection === "participaciones" &&
        old?.oferta !== undefined &&
        old.oferta !== clean.oferta
      )
        throw Error("No puedes mover una participación a otro grupo");
      if (old && collection === "participaciones") {
        clean.estatus = old.estatus;
        clean.comentarios = old.comentarios;
      }
      if (old) Object.assign(old, clean);
      else a[collection].push(clean);
    });
    res.json({ ok: true, id: clean.id });
  });
  app.post("/api/academic/delete", auth, admin, async (req, res) => {
    const { collection, id } = req.body;
    if (!Object.hasOwn(sheets, collection)) throw Error("Colección inválida");
    req.body.action = "Eliminar " + collection;
    req.body.detail = `Registro ${id}`;
    await change(req, (a) => {
      if (collection === "ofertas") {
        if (!a.ofertas.some((o) => o.id === id))
          throw Error("Oferta inexistente");
        for (const k of ["participaciones", "coordinaciones", "sesiones"])
          a[k] = a[k].filter((r) => r.oferta !== id);
      }
      a[collection] = a[collection].filter((r) => r.id !== id);
    });
    res.json({ ok: true });
  });
  app.post("/api/academic/publish", auth, admin, async (req, res) => {
    req.body.action = "Publicar oferta";
    req.body.detail = String(req.body.id);
    await change(req, (a) => {
      const o = a.ofertas.find((o) => o.id === req.body.id);
      if (!o) throw Error("Oferta inexistente");
      const issues = publishIssues(a, o);
      if (issues.length) throw Error(issues.join(" "));
      o.estado = "Publicada";
    });
    res.json({ ok: true });
  });
  app.post("/api/academic/approve", auth, admin, async (req, res) => {
    const { profesor, semestre, motivo } = req.body;
    if (typeof motivo !== "string" || !motivo.trim() || motivo.length > 2000)
      throw Error(
        "Escribe la justificación de la sobrecarga (máximo 2000 caracteres)",
      );
    req.body.action = "Aprobar sobrecarga";
    req.body.detail = `${profesor} · ${semestre} · ${motivo}`;
    await change(req, (a) => {
      const w = workload(a, profesor, semestre);
      if (w.max === null || w.total <= w.max)
        throw Error("No hay sobrecarga para aprobar");
      a.sobrecargas = a.sobrecargas.filter(
        (s) => s.profesor !== profesor || s.semestre !== semestre,
      );
      a.sobrecargas.push({
        id: randomUUID(),
        profesor,
        semestre,
        total: w.total,
        firma: loadFingerprint(a, profesor, semestre),
        motivo: motivo.trim(),
        administrador: req.session.adminId || "Configuración inicial",
        fecha: new Date().toISOString(),
      });
    });
    res.json({ ok: true });
  });
  app.post("/api/academic/respond", auth, async (req, res) => {
    if (req.session.role !== "profesor")
      return res
        .status(403)
        .json({ error: "La aceptación corresponde al profesor" });
    const { ids, estatus, comentarios = "" } = req.body;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      !["Aceptada", "Cambio Solicitado"].includes(estatus) ||
      typeof comentarios !== "string" ||
      comentarios.length > 2000 ||
      (estatus === "Cambio Solicitado" && !comentarios.trim())
    )
      throw Error(
        "Selecciona asignaciones y escribe comentarios si solicitas cambio",
      );
    req.body.action = "Respuesta docente";
    req.body.detail = `${estatus}: ${ids.join(", ")}`;
    await change(req, (a) => {
      for (const id of new Set(ids)) {
        const p = a.participaciones.find(
          (p) => p.id === id && p.profesor === req.session.nomina,
        );
        if (
          !p ||
          a.ofertas.find((o) => o.id === p.oferta)?.estado !== "Publicada"
        )
          throw Error("Asignación no autorizada o todavía en borrador");
        p.estatus = estatus;
        p.comentarios = estatus === "Aceptada" ? "" : comentarios.trim();
      }
    });
    res.json({ ok: true });
  });
  app.post("/api/academic/admin", auth, admin, async (req, res) => {
    const { id, nombre, password, remove } = req.body;
    const target = String(id || "")
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9._@-]{3,100}$/.test(target))
      throw Error("Usuario inválido: usa letras, números, punto, guion o @");
    const hash = password ? await passwordHash(password) : null;
    req.body.action = remove
      ? "Eliminar administrador"
      : "Guardar administrador";
    req.body.detail = target;
    let first = false;
    await change(req, (a) => {
      first = a.admins.length === 0;
      if (remove) {
        if (target === req.session.adminId || a.admins.length <= 1)
          throw Error(
            "No puedes eliminar tu cuenta actual ni el último administrador",
          );
        a.admins = a.admins.filter((x) => x.id !== target);
        return;
      }
      if (typeof nombre !== "string" || !nombre.trim())
        throw Error("Nombre obligatorio");
      const old = a.admins.find((x) => x.id === target);
      if (!old && !hash)
        throw Error("Contraseña obligatoria para una cuenta nueva");
      if (old)
        Object.assign(old, {
          nombre: nombre.trim(),
          ...(hash ? { hash } : {}),
        });
      else a.admins.push({ id: target, nombre: nombre.trim(), hash });
    });
    if ((first || req.session.adminId === target) && !remove) {
      req.session.adminId = target;
      req.session.adminVersion = (await store.read()).academic.admins.find(
        (x) => x.id === target,
      ).hash;
    }
    res.json({ ok: true });
  });
  app.get("/api/academic/export", auth, admin, async (req, res) => {
    res.attachment("Programacion_Academica.xlsx");
    res.send(Buffer.from(await exportAcademic(await load())));
  });
  app.get("/api/academic/backups", auth, admin, async (req, res) =>
    res.json(await store.listBackups()),
  );
  app.post("/api/academic/restore", auth, admin, async (req, res) => {
    const snapshot = await store.getBackup(req.body.id);
    const previous = migrateAcademic(snapshot);
    req.body.action = "Restaurar respaldo";
    req.body.detail = String(req.body.id);
    await change(req, (a) => {
      for (const key of Object.keys(sheets))
        a[key] = structuredClone(previous[key]);
      a.sobrecargas = [];
      a.ofertas.forEach((o) => (o.estado = "Borrador"));
      a.participaciones.forEach((p) => {
        p.estatus = "Pendiente";
        p.comentarios = "";
      });
    });
    res.json({ ok: true });
  });
  app.get("/api/academic/backup", auth, admin, async (req, res) => {
    const a = publicAcademic(await load(), req.session);
    res.attachment("Respaldo_Academico.json");
    res.json(a);
  });
  app.post(
    "/api/academic/import",
    auth,
    admin,
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }).single("file"),
    async (req, res) => {
      if (!req.file) throw Error("Selecciona un Excel");
      req.body.revision = Number(req.body.revision);
      req.body.action = "Importación Excel";
      req.body.detail =
        "Reemplazo académico: todas las ofertas quedan en borrador para revisión";
      await change(req, async (a) => {
        const next = await importAcademic(req.file.buffer, a);
        Object.assign(a, next);
      });
      res.json({ ok: true });
    },
  );
}
