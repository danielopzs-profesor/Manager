import {isArtBuilding,artRoomCode} from "../shared/art-rooms.js";
import {concurrentCollections,canRebase,queueEdit,pendingOffer} from "./concurrent-edits.js";
import {exportDelivery} from "./delivery-excel.js";
import {reportPDF} from "./report.js";
import {isAdmin,accountRole,assignmentPermission,protectIdentities} from "./permissions.js";
import {historyCategory,historyText} from "./history.js";
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
export function academicRoutes(app, { store, auth, admin, env = {} }) {
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
  const change = async (req, fn, edit = null) =>
    store.mutate(async (db) => {
      const a = migrateAcademic(db);
      const stale=req.body.revision!==a.revision;
      const supportsPending=edit && concurrentCollections.includes(edit.collection) && Object.hasOwn(req.body,'baseItem');
      const preserve=()=>{
        edit.pendingId=queueEdit(a,req,edit.collection,edit.item);
        audit(a,req.session.adminId||req.session.nomina,"Guardar edición pendiente",`Edición simultánea de ${edit.collection}; versión conservada para revisión, sin sobrescribir datos.`);
      };
      if(stale && !supportsPending){const e=Error("La programación cambió. Recarga antes de guardar para no sobrescribir cambios de otro administrador.");e.status=409;throw e;}
      if(stale && !canRebase(a,req,edit.collection,edit.item)){preserve();return;}
      const before = structuredClone(a);
      await fn(a);
      protectIdentities(before,a);
      invalidate(a, before);
      try{validateAcademic(a);}catch(error){
        if(!stale||!supportsPending)throw error;
        Object.assign(a,before);preserve();return;
      }
      audit(
        a,
        req.session.adminId || req.session.nomina || "Configuración inicial",
        req.body.action || "Actualización",
        req.body.detail || "Datos académicos actualizados",
        diffAcademic(before, a),
      );
    });
  app.get("/api/academic/report.pdf",auth,admin,async(req,res)=>{
    const a=await load();const semestre=String(req.query.semestre||a.semestres[0]?.id||"");res.attachment(`Reporte_${semestre.replace(/[^a-z0-9_-]/gi,"")}.pdf`).type("application/pdf").send(reportPDF(a,semestre));
  });
  app.post("/api/academic/professor-role",auth,admin,async(req,res)=>{
    if(req.session.role!=="superadmin")return res.status(403).json({error:"Solo el superadministrador puede cambiar roles"});
    if(typeof req.body.enabled!=="boolean")throw Error("Marca o desmarca el permiso de administrador");
    await change(req,a=>{
      const p=a.profesores.find(p=>p.id===req.body.profesor);if(!p)throw Error("Profesor inexistente");
      let account=a.admins.find(x=>x.profesor===p.id||x.id===p.correo.toLowerCase());
      if(p.protectedAccess||p.accessRole==="superadmin"||account?.protegido||account?.role==="superadmin")throw Error("El superadministrador conserva permanentemente su rol");
      if(!account){if(!p.passwordHash)throw Error("Configura primero el acceso del profesor; después podrás otorgar el rol sin crear otra contraseña");account={id:p.correo.toLowerCase(),nombre:p.nombre,profesor:p.id,hash:p.passwordHash,mustChangePassword:!!p.mustChangePassword};a.admins.push(account);}
      if(account.profesor&&account.profesor!==p.id)throw Error("La cuenta está vinculada a otro profesor");account.profesor=p.id;account.role=req.body.enabled?"admin":"profesor";p.accessRole="profesor";req.body.action="Cambiar rol";req.body.detail=p.id;
    });res.json({ok:true});
  });
  app.get("/api/academic/history.txt",auth,admin,async(req,res)=>{
    const a=await load();const category=String(req.query.categoria||"");
    res.attachment("Historial_Academico.txt").type("text/plain; charset=utf-8").send(historyText(a.auditoria.filter(r=>!category||(r.categoria||historyCategory(r.accion))===category)));
  });
  app.post("/api/academic/history/clear",auth,admin,async(req,res)=>{
    if(req.body.confirmacion!=="BORRAR HISTORIAL")throw Error("Escribe BORRAR HISTORIAL para confirmar. Descarga primero el TXT.");
    await change(req,a=>{const category=String(req.body.categoria||"");const allowed=["","accesos","errores","cambios","respuestas","aprobaciones","datos","seguridad"];if(!allowed.includes(category))throw Error("Categoría inválida");a.auditoria=category?a.auditoria.filter(r=>(r.categoria||historyCategory(r.accion))!==category):[];req.body.action="Limpieza de historial";req.body.detail=`Categoría: ${category||"todas"}`;});
    // The record of this deletion remains. Previous retained backups may still contain older events.
    res.json({ok:true});
  });
  app.get("/api/academic", auth, async (req, res) => {
    const all = await load();
    const a = publicAcademic(all, req.session);
    const semestre = String(req.query.semestre || a.semestres[0]?.id || "");
    res.json({
      ...a,
      miProfesor: req.session.nomina || null,
      ofertasCoordinadas: all.coordinaciones.filter(c=>c.profesor===req.session.nomina).map(c=>c.oferta),
      calendario: calendar(a.semestres.find((s) => s.id === semestre)),
      cargas: a.profesores.map((p) => ({
        profesor: p.id,
        ...(req.session.role === "consulta"
          ? { ...workload(all, p.id, semestre), aprobacion: null }
          : workload(a, p.id, semestre)),
        contrato: contract(a, p.id, semestre),
        distribucion: distribution(a, p.id, semestre),
      })),
      conflictos: isAdmin(req.session.role) ? conflicts(all, semestre) : [],
      avisos:
        isAdmin(req.session.role)
          ? all.ofertas
              .filter((o) => o.semestre === semestre)
              .map((o) => ({ oferta: o.id, errores: publishIssues(all, o) }))
          : [],
    });
  });
  const allocationAccess = (req,res,next) => {
    if (isAdmin(req.session.role)) return next();
    if(req.session.nomina && req.body.collection === "participaciones") return next();
    res.status(403).json({error:"Solo administración o coordinación del grupo pueden modificar asignaciones"});
  };
  app.post("/api/academic/save", auth, allocationAccess, async (req, res) => {
    const { collection, item } = req.body;
    if (!Object.hasOwn(sheets, collection) || !item || typeof item !== "object")
      throw Error("Colección inválida");
    const clean = Object.fromEntries(
      sheets[collection].map((key) => [key, item[key] ?? ""]),
    );
    clean.id = String(clean.id || randomUUID());
    if (collection === "salones" && (clean.edificio || clean.numero)) {
      clean.edificio = String(clean.edificio).trim(); clean.numero = String(clean.numero).trim();
      clean.nombre = `${clean.edificio}-${clean.numero}`;
      if(isArtBuilding(clean.edificio))clean.codigo=artRoomCode(clean.numero);
    }
    for (const key of ["udc", "duracion", "porcentaje", "capacidad", "alumnos", "udc_maximas"])
      if (key in clean) clean[key] = Number(clean[key]);
    if (collection === "profesores" && clean.tipo !== "Préstamo") clean.area = "";
    if (collection === "ofertas") clean.estado = "Borrador";
    if (collection === "participaciones") {
      clean.estatus = "Pendiente";
      clean.comentarios = "";
    }
    req.body.action = "Guardar " + collection;
    req.body.detail = `Registro ${clean.id}`;
    const edit={collection,item:clean};
    await change(req, (a) => {
      const old = a[collection].find((r) => r.id === clean.id);
      assignmentPermission(a,req.session,collection,clean,old);
      if(collection === "profesores") {
        const username=old?.nomina||old?.id||clean.id;
        if(old && clean.nomina && clean.nomina!==username)throw Error("El usuario (nómina) no se puede modificar; se utiliza en el Excel.");
        if(!old && clean.nomina && clean.nomina!==clean.id)throw Error("El usuario debe ser la nómina del profesor.");
        clean.nomina=username;
        if(a.profesores.some(p=>p.id!==clean.id && String(p.nomina||p.id).trim().toLowerCase()===String(username).trim().toLowerCase()))throw Error("Ya existe un profesor con esa nómina.");
      }
      if (collection === "sesiones" && a.salones.length && clean.aula && (!old || old.aula !== clean.aula) && !a.salones.some((r) => r.id === clean.aula)) throw Error("Selecciona un salón registrado");
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
      if(req.body.pendingId && isAdmin(req.session.role))a.pendingEdits=(a.pendingEdits||[]).filter(p=>!(p.id===req.body.pendingId&&p.collection===collection&&p.item.id===clean.id));
    },edit);
    res.json({ ok: true, id: clean.id, pending:!!edit.pendingId, pendingId:edit.pendingId });
  });
  app.post("/api/academic/pending/discard",auth,admin,async(req,res)=>{
    await change(req,a=>{a.pendingEdits=(a.pendingEdits||[]).filter(p=>p.id!==req.body.id);});res.json({ok:true});
  });
  app.post("/api/academic/delete", auth, allocationAccess, async (req, res) => {
    const { collection, id } = req.body;
    if (!Object.hasOwn(sheets, collection)) throw Error("Colección inválida");
    req.body.action = "Eliminar " + collection;
    req.body.detail = `Registro ${id}`;
    await change(req, (a) => {
      const record=a[collection].find(r=>r.id===id);
      assignmentPermission(a,req.session,collection,record,record);
      if (collection === "ofertas") {
        if (!a.ofertas.some((o) => o.id === id))
          throw Error("Oferta inexistente");
        for (const k of ["participaciones", "coordinaciones", "sesiones"])
          a[k] = a[k].filter((r) => r.oferta !== id);
      }
      if (collection === "salones" && a.sesiones.some((s) => s.aula === id)) throw Error("El salón tiene sesiones asignadas; reasígnalas antes de eliminarlo");
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
      if((a.pendingEdits||[]).some(p=>pendingOffer(p)===o.id))throw Error("Hay ediciones pendientes de revisión para este grupo. Revísalas o descártalas antes de publicar.");
      const issues = publishIssues(a, o);
      if (issues.length) throw Error(issues.join(" "));
      o.estado = "Publicada";
    });
    res.json({ ok: true });
  });
  app.post("/api/academic/approve", auth, admin, async (req, res) => {
    const { profesor, semestre, motivo } = req.body;
    if (req.session.nomina === profesor)
      return res.status(403).json({ error: "Otro administrador debe aprobar tu sobrecarga" });
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
    if (req.session.role !== "profesor" && !(isAdmin(req.session.role) && req.session.nomina))
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
    let role = req.body.role;
    if (role && !["admin", "superadmin", "profesor", "consulta"].includes(role)) throw Error("Rol inválido");
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
      const existing = a.admins.find((x) => x.id === target);
      role ||= accountRole(existing) === "superadmin" ? "superadmin" : "admin";
      if (existing?.protegido || existing?.role === "superadmin") {
        if (remove || role !== "superadmin") throw Error("El rol y los permisos del superadministrador son permanentes.");
        if(req.session.adminId!==target)throw Error("Solo ese superadministrador puede modificar sus propias credenciales.");
      }
      if(role === "superadmin" && existing?.role !== "superadmin")throw Error("Los superadministradores solo se establecen mediante identidades verificadas en la configuración del servidor.");
      if(req.session.role!=="superadmin" && a.admins.length && ((role==="admin" && (!existing || accountRole(existing)!==role)) || (existing && accountRole(existing)!==role) || (remove&&isAdmin(accountRole(existing))))) {const e=Error("Solo un superadministrador puede otorgar o retirar roles.");e.status=403;throw e;}

      const admins = a.admins.filter(
        (x) => (x.role || "admin") === "admin",
      ).length;
      if (first && role !== "admin")
        throw Error("La primera cuenta debe ser administradora");
      if (
        !remove &&
        existing &&
        (existing.role || "admin") === "admin" &&
        role !== "admin" &&
        (target === req.session.adminId || admins <= 1)
      )
        throw Error(
          "No puedes quitar el rol a tu cuenta actual ni al último administrador",
        );
      if (remove) {
        if (
          target === req.session.adminId ||
          ((existing?.role || "admin") === "admin" && admins <= 1)
        )
          throw Error(
            "No puedes eliminar tu cuenta actual ni el último administrador",
          );
        a.admins = a.admins.filter((x) => x.id !== target);
        return;
      }
      if (typeof nombre !== "string" || !nombre.trim())
        throw Error("Nombre obligatorio");
      const old = a.admins.find((x) => x.id === target);
      const profesor = role !== "consulta" ? String(req.body.profesor ?? old?.profesor ?? "") : "";
      if (profesor && !a.profesores.some((p) => p.id === profesor)) throw Error("Profesor inexistente");
      const profile=a.profesores.find(p=>p.id===profesor);
      if(profile?.protectedAccess && old?.profesor!==profesor)throw Error("Ese perfil de superadministrador ya tiene una identidad protegida y no se puede combinar con otra cuenta.");
      const duplicate=profesor ? a.admins.find(x=>x.id!==target&&x.profesor===profesor) : null;
      if(duplicate){
        if(isAdmin(accountRole(duplicate))||duplicate.protegido)throw Error("Ese profesor está vinculado a otra cuenta administrativa. Revisa cuál es la cuenta correcta antes de combinar.");
        a.admins=a.admins.filter(x=>x.id!==duplicate.id);
      }
      if(profesor && a.profesores.some(p=>p.id!==profesor&&p.correo.toLowerCase()===profile.correo.toLowerCase()))throw Error("Hay profesores con el mismo correo. Corrige el correo antes de combinar las cuentas.");
      if (!old && !hash)
        throw Error("Contraseña obligatoria para una cuenta nueva");
      if (old)
        Object.assign(old, {
          nombre: nombre.trim(),
          role,
          profesor,
          emailLogin: !!profesor && (req.body.combinar === true || req.body.combinar === "1" || !!old.emailLogin),
          ...(hash ? { hash } : {}),
        });
      else a.admins.push({ id: target, nombre: nombre.trim(), hash, role, profesor });
    });
    if ((first || req.session.adminId === target) && !remove) {
      req.session.adminId = target;
      req.session.adminVersion = (await store.read()).academic.admins.find(
        (x) => x.id === target,
      ).hash;
    }
    res.json({ ok: true });
  });
  app.post("/api/academic/temporary-passwords",auth,admin,async(req,res)=>{
    if(req.body.confirmacion!=="ACTIVAR PRUEBA")throw Error("Confirma la activación de contraseñas de prueba.");
    req.body.action="Activar contraseñas temporales de prueba";
    let updated=0,skipped=0;
    await change(req,async a=>{
      for(const p of a.profesores){
        const account=a.admins.find(x=>x.profesor===p.id);
        if(p.protectedAccess||isAdmin(p.accessRole)||isAdmin(accountRole(account))||account?.protegido){skipped++;continue;}
        const hash=await passwordHash("temporal123",{temporary:true});
        p.passwordHash=hash;p.mustChangePassword=true;
        if(account){account.hash=hash;account.mustChangePassword=true;}
        updated++;
      }
      req.body.detail=`${updated} accesos docentes actualizados; ${skipped} perfiles administrativos protegidos sin cambios.`;
    });
    res.json({ok:true,updated,skipped});
  });
  app.post(
    "/api/academic/professor-password",
    auth,
    admin,
    async (req, res) => {
      const hash = await passwordHash(req.body.password);
      req.body.action = "Configurar acceso de profesor";
      req.body.detail = String(req.body.profesor);
      await change(req, (a) => {
        const p = a.profesores.find((p) => p.id === req.body.profesor);
        if (!p) throw Error("Profesor no encontrado");
        if (p.protectedAccess && req.session.nomina !== p.id && (p.passwordHash || req.session.role !== "superadmin")) {const e=Error("Solo ese superadministrador puede cambiar su contraseña docente");e.status=403;throw e;}
        const linked=a.admins.find(account=>account.profesor===p.id);
        if(linked && (linked.protegido || linked.role === "superadmin") && req.session.adminId!==linked.id){const e=Error("Solo ese superadministrador puede cambiar su contraseña");e.status=403;throw e;}
        p.passwordHash = hash;p.mustChangePassword=false;
        if(linked){linked.hash=hash;linked.mustChangePassword=false;}
      });
      res.json({ ok: true });
    },
  );
  app.get("/api/academic/delivery.xlsx",auth,admin,async(req,res)=>{
    const buffer=await exportDelivery(await load(),String(req.query.semestre||""));
    res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition",'attachment; filename="Formato_Entrega.xlsx"');
    res.send(Buffer.from(buffer));
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
      const credentials = new Map(
        a.profesores.map((p) => [p.id, {hash:p.passwordHash,accessRole:p.accessRole,protectedAccess:p.protectedAccess,nomina:p.nomina||p.id,mustChangePassword:!!p.mustChangePassword}]),
      );
      for (const key of Object.keys(sheets))
        a[key] = structuredClone(previous[key]);
      a.profesores.forEach((p) => {
        delete p.passwordHash;
        if (credentials.get(p.id)) {const saved=credentials.get(p.id);p.passwordHash=saved.hash;p.accessRole=saved.accessRole;p.protectedAccess=saved.protectedAccess;p.nomina=saved.nomina;p.mustChangePassword=saved.mustChangePassword;}
      });
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
