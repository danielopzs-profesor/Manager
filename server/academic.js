import {isAdmin} from "./permissions.js";
import {historyCategory} from "./history.js";
import { randomUUID, createHash } from "node:crypto";
export const SEGMENTS = ["P1", "I1", "P2", "I2", "P3"];
export const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const STATUS = ["Pendiente", "Aceptada", "Cambio Solicitado"];
export const round = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;
const fail = (message) => {
  throw Error(message);
};
const has = (xs, id) => xs.find((x) => x.id === id);
const nonempty = (v) => typeof v === "string" && v.trim().length > 0;
const number = (v, min = 0) => Number.isFinite(v) && v >= min;
function deliveryDefaults(a) {
 for(const u of a.ufs) u.atributos ??= "PMT3";
 for(const s of a.semestres){s.identificador ??= s.id === "FJ27" ? "202713" : "";s.escuela ??= "AD-Arquitectura, Arte y Diseño";}
 for(const p of a.profesores)p.nomina ??= /^L\d+$/i.test(p.id) ? p.id : "";
 return a;
}
export function migrateAcademic(db) {
  if (db.academic) { db.academic.salones ||= []; db.academic.prestamos ||= []; return deliveryDefaults(db.academic); }
  const a = {
    version: 2,
    revision: 1,
    profesores: db.Profesores.map((p) => ({
      id: String(p.nomina),
      nombre: p.nombre,
      correo: p.correo,
      tipo: "Por clasificar",
    })),
    ufs: db.Materias.map((m) => ({
      id: String(m.id_materia),
      nombre: m.nombre_materia,
      tipo: "Materia",
      udc: Number(m.udc),
    })),
    semestres: [{ id: "FJ27", nombre: "Febrero–junio 2027", inicio: "" }],
    ofertas: [],
    participaciones: [],
    sesiones: [],
    salones: [],
    prestamos: [],
    coordinaciones: [],
    sobrecargas: [],
    admins: [],
    auditoria: [],
  };
  for (const c of db.Clases_Asignadas) {
    const id = "legacy-" + c.id_clase;
    a.ofertas.push({
      id,
      clave: String(c.id_clase),
      grupo: "",
      semestre: "FJ27",
      uf: String(c.id_materia),
      modalidad: "Ordinaria",
      duracion: 15,
      periodos: "P1,P2,P3",
      udc: Number(
        db.Materias.find((m) => String(m.id_materia) === String(c.id_materia))
          ?.udc || 0,
      ),
      estado: "Borrador",
    });
    a.participaciones.push({
      id: "part-" + c.id_clase,
      oferta: id,
      profesor: String(c.nomina_profesor),
      porcentaje: 100,
      estatus: c.estatus,
      comentarios: c.comentarios || "",
    });
    a.sesiones.push({
      id: "ses-" + c.id_clase,
      oferta: id,
      profesores: String(c.nomina_profesor),
      dias: c.dias,
      horario: c.horario,
      aula: c.aula,
      segmentos: "P1,P2,P3",
    });
  }
  a.auditoria.push({
    id: randomUUID(),
    fecha: new Date().toISOString(),
    actor: "Sistema",
    accion: "Migración v2",
    detalle:
      "Se conservaron clases previas como borradores. Clasificar docentes, verificar grupos, periodos y fechas antes de publicar.",
  });
  db.academic = a;
  return deliveryDefaults(a);
}
export function list(value) {
  return String(value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
export function segments(o) {
  return list(o.periodos);
}
export function limit(p) {
  return p.tipo === "Cátedra" ? 10 : p.tipo === "Planta" ? 14 : ["Cátedra interna","Préstamo"].includes(p.tipo) && Number(p.udc_maximas)>0 ? Number(p.udc_maximas) : null;
}
export function workload(a, profesor, semestre) {
  const offers = a.ofertas.filter((o) => o.semestre === semestre);
  const ids = new Set(offers.map((o) => o.id));
  let docencia = 0,
    intensivas = 0,
    coordinacion = 0;
  for (const p of a.participaciones.filter(
    (p) => p.profesor === profesor && ids.has(p.oferta),
  )) {
    const o = has(offers, p.oferta);
    const amount = (o.udc * p.porcentaje) / 100;
    if (o.modalidad === "Intensiva") intensivas += amount;
    else docencia += amount;
  }
  for (const c of a.coordinaciones.filter(
    (c) => c.profesor === profesor && ids.has(c.oferta),
  ))
    coordinacion += c.udc;
  const prestamos = round((a.prestamos || []).filter((p) => p.profesor === profesor && p.semestre === semestre).reduce((sum,p) => sum + p.udc,0));
  const cargaLocal = round(docencia + intensivas + coordinacion);
  const total = round(cargaLocal + prestamos);
  const max = limit(has(a.profesores, profesor) || {});
  const fingerprint = loadFingerprint(a, profesor, semestre);
  const approval = a.sobrecargas.find(
    (s) =>
      s.profesor === profesor &&
      s.semestre === semestre &&
      s.firma === fingerprint &&
      s.total >= total,
  );
  return {
    docencia: round(docencia),
    intensivas: round(intensivas),
    coordinacion: round(coordinacion),
    total,
    cargaLocal,
    prestamos,
    disponible: max === null ? null : round(Math.max(0,max-total)),
    max,
    estado:
      max === null
        ? "Por clasificar"
        : total <= max
          ? "Óptima"
          : approval
            ? "Sobrecarga aprobada"
            : "Sobrecarga pendiente",
    aprobacion: approval || null,
  };
}
export function loadFingerprint(a, profesor, semestre) {
  const ids = new Set(
    a.ofertas.filter((o) => o.semestre === semestre).map((o) => o.id),
  );
  const data = {
    tipo: has(a.profesores, profesor)?.tipo,
    prestamos: (a.prestamos || []).filter((p) => p.profesor === profesor && p.semestre === semestre).map((p)=>[p.id,p.udc]).sort(),
    ofertas: a.ofertas
      .filter((o) => ids.has(o.id))
      .filter(
        (o) =>
          a.participaciones.some(
            (p) => p.oferta === o.id && p.profesor === profesor,
          ) ||
          a.coordinaciones.some(
            (c) => c.oferta === o.id && c.profesor === profesor,
          ),
      )
      .map((o) => [o.id, o.udc, o.periodos, o.duracion])
      .sort(),
    participaciones: a.participaciones
      .filter((p) => ids.has(p.oferta) && p.profesor === profesor)
      .map((p) => [p.oferta, p.porcentaje])
      .sort(),
    coordinaciones: a.coordinaciones
      .filter((c) => ids.has(c.oferta) && c.profesor === profesor)
      .map((c) => [c.oferta, c.udc])
      .sort(),
  };
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}
const dateAdd = (start, days) =>
  new Date(Date.parse(start + "T00:00:00Z") + days * 86400000)
    .toISOString()
    .slice(0, 10);
export function calendar(semester) {
  if (!semester) return [];
  return SEGMENTS.map((id, i) => {
    const start = [0, 35, 42, 77, 84][i];
    return {
      id,
      inicio: semester[id+"_inicio"] || (semester.inicio ? dateAdd(semester.inicio, start) : ""),
      fin: semester[id+"_fin"] || (semester.inicio ? dateAdd(semester.inicio, start + ([1, 3].includes(i) ? 4 : 34)) : ""),
    };
  });
}
export function distribution(a, profesor, semestre) {
  const ids = new Set(
    a.ofertas.filter((o) => o.semestre === semestre).map((o) => o.id),
  );
  return SEGMENTS.map((segmento) => {
    const ss = a.sesiones.filter(
      (s) =>
        ids.has(s.oferta) &&
        list(s.profesores).includes(profesor) &&
        list(s.segmentos).includes(segmento),
    );
    const weekly = ss.reduce((n, s) => {
      if (!validSessionTime(s)) return n;
      const [start, end] = s.horario.split("-");
      const minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
      return n + ((minutes(end) - minutes(start)) / 60) * list(s.dias).length;
    }, 0);
    return {
      segmento,
      horasSemanales: round(weekly),
      horasTotales: round(weekly * (segmento.startsWith("P") ? 5 : 1)),
      grupos: new Set(ss.map((s) => s.oferta)).size,
    };
  });
}
export function contract(a, profesor, semestre) {
  const ids = new Set([
    ...a.participaciones
      .filter((p) => p.profesor === profesor)
      .map((p) => p.oferta),
    ...a.coordinaciones
      .filter((c) => c.profesor === profesor)
      .map((c) => c.oferta),
  ]);
  const active = new Set(
    a.ofertas
      .filter((o) => o.semestre === semestre && ids.has(o.id))
      .flatMap(segments),
  );
  const dates = calendar(has(a.semestres, semestre)).filter((s) =>
    active.has(s.id),
  );
  return dates.length
    ? { inicio: dates[0].inicio, fin: dates.at(-1).fin, segmentos: [...active] }
    : null;
}
export function conflicts(a, semestre) {
  const sessions = a.sesiones.filter(
    (s) => has(a.ofertas, s.oferta)?.semestre === semestre && validSessionTime(s),
  );
  const out = [];
  for (let i = 0; i < sessions.length; i++)
    for (let j = i + 1; j < sessions.length; j++) {
      const x = sessions[i],
        y = sessions[j];
      if (
        !list(x.segmentos).some((v) => list(y.segmentos).includes(v)) ||
        !list(x.dias).some((v) => list(y.dias).includes(v)) ||
        x.horario.slice(0, 5) >= y.horario.slice(6) ||
        y.horario.slice(0, 5) >= x.horario.slice(6)
      )
        continue;
      const ps = list(x.profesores).filter((p) =>
        list(y.profesores).includes(p),
      );
      const aula = x.aula.trim().toLowerCase() === y.aula.trim().toLowerCase();
      if (ps.length || aula)
        out.push({
          sesion1: x.id,
          sesion2: y.id,
          oferta1: x.oferta,
          oferta2: y.oferta,
          profesores: ps,
          aula: aula ? x.aula : null,
        });
    }
  return out;
}
export function groupBase(o) {
  if (o.modalidad !== "Ordinaria") return null;
  return (
    { P1: 100, P2: 200, P3: 300, "P1,P2": 300, "P2,P3": 500 }[o.periodos] ??
    null
  );
}
export function validSessionTime(s) {return /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(s.horario) && s.horario.slice(0,5)<s.horario.slice(6);}
export function sessionIssues(a,s) {
 const o=has(a.ofertas,s.oferta), issues=[];
 if(!o)return ["Selecciona el grupo de esta sesión."];
 if(!nonempty(s.aula))issues.push("Falta seleccionar el salón de la sesión.");
 if(!validSessionTime(s))issues.push("Completa las horas de inicio y fin; la salida debe ser posterior a la entrada.");
 if(!list(s.dias).length||list(s.dias).some(d=>!DAYS.includes(d)))issues.push("Selecciona los días de la sesión.");
 if(!list(s.segmentos).length||list(s.segmentos).some(seg=>!segments(o).includes(seg)))issues.push(`Revisa los periodos de la sesión: deben pertenecer a ${o.periodos || 'los periodos pendientes del grupo'}. Puedes corregirlos en Sesiones y horarios.`);
 if(!list(s.profesores).length||list(s.profesores).some(p=>!a.participaciones.some(x=>x.oferta===o.id&&x.profesor===p)))issues.push("Selecciona docentes con responsabilidad asignada en este grupo.");
 if(o.modalidad==='Intensiva'&&list(s.dias).some(d=>['Sáb','Dom'].includes(d)))issues.push("Las intensivas se programan de lunes a viernes.");
 return issues;
}
export function roomIssues(a, session) {
  const room = (a.salones || []).find((r) => r.id === session.aula);
  if (!room) return [];
  const o = a.ofertas.find((o) => o.id === session.oferta);
  const issues = [];
  if (list(session.dias).some((d) => !list(room.dias).includes(d)) ||
      (validSessionTime(session) && (session.horario.slice(0,5) < room.horario.slice(0,5) ||
      session.horario.slice(6) > room.horario.slice(6)))) issues.push(`La sesión está fuera del horario de trabajo de ${room.nombre}: ${room.dias}, ${room.horario}. Elige uno de esos días y horas dentro de ese rango.`);
  if (Number(o?.alumnos || 0) > room.capacidad) issues.push(`El grupo tiene ${o?.alumnos} alumnos y ${room.nombre} tiene capacidad para ${room.capacidad}. Selecciona un salón más grande o corrige el número de alumnos.`);
  return issues;
}
export function publishIssues(a, o) {
  const errors = [];
  const parts = a.participaciones.filter((p) => p.oferta === o.id);
  if (Math.abs(parts.reduce((n, p) => n + p.porcentaje, 0) - 100) > 0.00001)
    errors.push("La responsabilidad debe sumar 100 %.");
  if (!o.clave.trim()) errors.push("Falta la clave única del grupo.");
  if (!segments(o).length) errors.push("Selecciona los periodos del grupo.");
  if (!o.grupo.trim()) errors.push("Falta el número de grupo.");
  const base = groupBase(o);
  if (
    o.grupo.trim() &&
    base !== null &&
    (!/^\d+$/.test(o.grupo) ||
      Number(o.grupo) <= base ||
      Number(o.grupo) >= base + 100)
  )
    errors.push(
      `El grupo de ${o.periodos} debe usar base ${base}, por ejemplo ${base + 1}. La clave única sigue siendo independiente.`,
    );
  if (!has(a.semestres, o.semestre)?.inicio)
    errors.push("Falta el lunes de inicio del semestre.");
  if (
    has(a.ufs, o.uf)?.tipo === "Bloque" &&
    !a.coordinaciones.some((c) => c.oferta === o.id)
  )
    errors.push("El bloque requiere coordinador y UDC de coordinación.");
  const ps = new Set([
    ...parts.map((p) => p.profesor),
    ...a.coordinaciones.filter((c) => c.oferta === o.id).map((c) => c.profesor),
  ]);
  for (const p of ps) {
    const l = workload(a, p, o.semestre);
    if (l.max === null) errors.push(["Cátedra interna","Préstamo"].includes(has(a.profesores,p)?.tipo) ? `Define el tope semestral de UDC del profesor ${p}.` : `Clasifica al profesor ${p}.`);
    else if (l.estado === "Sobrecarga pendiente")
      errors.push(`Falta aprobación de sobrecarga para ${p}.`);
  }
  if (!a.sesiones.some((s) => s.oferta === o.id))
    errors.push("Falta programar las sesiones.");
  for (const seg of segments(o)) {
    const ss = a.sesiones.filter(
      (s) => s.oferta === o.id && list(s.segmentos).includes(seg),
    );
    if (!ss.length) errors.push(`Faltan sesiones en ${seg}.`);
  }
  for (const p of parts)
    if (
      !a.sesiones.some(
        (s) => s.oferta === o.id && list(s.profesores).includes(p.profesor),
      )
    )
      errors.push(`Faltan sesiones para ${p.profesor}.`);
  if (
    conflicts(a, o.semestre).some(
      (c) => c.oferta1 === o.id || c.oferta2 === o.id,
    )
  )
    errors.push("Hay conflictos de profesor o aula.");
  for (const session of a.sesiones.filter((s) => s.oferta === o.id)) {
    errors.push(...sessionIssues(a, session).map(message=>`Sesión ${session.id}: ${message}`));
    errors.push(...roomIssues(a, session));
    if ((a.salones || []).some((r) => r.id === session.aula) && !(Number(o.alumnos) > 0)) errors.push("Captura el número de alumnos del grupo para verificar el aforo.");
  }
  return [...new Set(errors)];
}
export function validateAcademic(a) {
  a.salones ||= [];
  a.prestamos ||= [];
  for (const account of a.admins || [])
    if (
      account.role !== undefined &&
      !["admin", "superadmin", "profesor", "consulta"].includes(account.role)
    )
      fail("Rol de cuenta inválido");
  for (const key of [
    "profesores",
    "ufs",
    "semestres",
    "ofertas",
    "participaciones",
    "sesiones",
    "coordinaciones",
    "salones",
    "prestamos",
    "sobrecargas",
    "admins",
    "auditoria",
  ]) {
    if (!Array.isArray(a[key])) fail(`Falta ${key}`);
    const ids = new Set();
    for (const r of a[key]) {
      if (!nonempty(r.id) || ids.has(r.id))
        fail(`Identificador vacío o duplicado en ${key}`);
      ids.add(r.id);
    }
  }
  for (const p of a.prestamos) {
    if (!has(a.profesores,p.profesor) || !has(a.semestres,p.semestre) || !nonempty(p.departamento) || !number(p.udc,0.01)) fail("Préstamo inválido. Selecciona profesor y semestre, indica departamento y UDC mayores a cero.");
  }
  const roomPairs = new Set();
  for (const r of a.salones) {
    if (r.edificio || r.numero) {
      if (!nonempty(r.edificio) || !nonempty(r.numero)) fail("Completa el edificio y el número de salón; por ejemplo CEDES y 319.");
      const key = r.edificio.trim().toLowerCase()+"|"+r.numero.trim().toLowerCase();
      if (roomPairs.has(key)) fail("Ya existe un salón en ese edificio con ese número. Edita el existente o elige otro número.");
      roomPairs.add(key);
    }
  }
  const roomIds = new Set();
  for (const r of a.salones || []) {
    if (!nonempty(r.id) || roomIds.has(r.id.trim().toLowerCase()) || !nonempty(r.nombre) || !Number.isInteger(r.capacidad) || r.capacidad < 1 ||
        !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(r.horario) || r.horario.slice(0,5) >= r.horario.slice(6) ||
        !list(r.dias).length || list(r.dias).some((d) => !DAYS.includes(d))) fail("Salón inválido: revisa clave, capacidad, días y horario");
    roomIds.add(r.id.trim().toLowerCase());
  }
  for (const o of a.ofertas) if (o.alumnos !== undefined && o.alumnos !== "" && (!Number.isInteger(Number(o.alumnos)) || Number(o.alumnos) < 0)) fail("Número de alumnos inválido");
  const linked = new Set();
  for (const account of a.admins || []) {
    if (!account.profesor) continue;
    if (!(["admin","superadmin","profesor"].includes(account.role || "consulta")) || !a.profesores.some((p) => p.id === account.profesor) || linked.has(account.profesor)) fail("Vinculación de profesor inválida o duplicada");
    linked.add(account.profesor);
  }
  for (const p of a.profesores) {
    if (
      !nonempty(p.nombre) ||
      !nonempty(p.correo) ||
      !["Planta", "Cátedra", "Cátedra interna", "Préstamo", "Por clasificar"].includes(p.tipo)
    )
      fail("Profesor inválido");
  }
  for(const p of a.profesores){
    if(p.tipo==="Préstamo"&&!nonempty(p.area))fail("Indica el área de origen del profesor de préstamo.");
    if(p.udc_maximas && (!number(Number(p.udc_maximas),0.01)))fail("Tope de carga inválido.");
  }
  for (const u of a.ufs)
    if (
      !nonempty(u.nombre) ||
      !["Materia", "Bloque"].includes(u.tipo) ||
      !number(u.udc)
    )
      fail("Unidad de formación inválida");
  for (const s of a.semestres) {
    if (!nonempty(s.nombre)) fail("Nombre de semestre obligatorio");
    for(const id of SEGMENTS){
      for(const suffix of ["inicio","fin"]){const v=s[id+"_"+suffix];if(v && (!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+"T00:00:00Z"))||dateAdd(v,0)!==v))fail(`Fecha inválida en ${id}: selecciona una fecha del calendario.`);}
      const range=calendar(s).find(r=>r.id===id);if(range.inicio&&range.fin&&range.fin<range.inicio)fail(`En ${id}, la fecha final debe ser igual o posterior a la inicial.`);
    }
    const ranges=calendar(s);for(let i=1;i<ranges.length;i++)if(ranges[i-1].fin&&ranges[i].inicio&&ranges[i].inicio<=ranges[i-1].fin)fail(`Las fechas de ${ranges[i].id} se empalman con ${ranges[i-1].id}. Ajusta el calendario del semestre.`);
    if (
      s.inicio &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(s.inicio) ||
        !Number.isFinite(Date.parse(s.inicio + "T00:00:00Z")) ||
        dateAdd(s.inicio, 0) !== s.inicio ||
        new Date(s.inicio + "T00:00:00Z").getUTCDay() !== 1)
    )
      fail("El semestre debe comenzar un lunes válido. Elige un lunes en el calendario; el sistema guardará la fecha automáticamente.");
  }
  const keys = new Set();
  for (const o of a.ofertas) {
    if (
      !has(a.ufs, o.uf) ||
      !has(a.semestres, o.semestre) ||
      typeof o.clave !== "string" ||
      typeof o.grupo !== "string" ||
      !number(o.udc) ||
      !["Borrador", "Publicada"].includes(o.estado)
    )
      fail("Oferta inválida");
    const key = JSON.stringify([o.semestre, o.clave]);
    if (o.clave && keys.has(key)) fail("La clave única ya existe en ese semestre");
    if (o.clave) keys.add(key);
    const ps = segments(o).join(",");
    if (!ps && o.estado === "Borrador") continue;
    if (o.modalidad === "Intensiva") {
      if (
        o.duracion !== 1 ||
        !["I1", "I2"].includes(ps) ||
        has(a.ufs, o.uf).tipo !== "Materia"
      )
        fail("Las intensivas son materias de una semana en I1 o I2");
    } else if (
      o.modalidad !== "Ordinaria" ||
      !(
        { 5: ["P1", "P2", "P3"], 10: ["P1,P2", "P2,P3"], 15: ["P1,P2,P3"] }[
          o.duracion
        ] || []
      ).includes(ps)
    )
      fail(
        "Duración o periodos inválidos: las UF de 10 semanas deben ser consecutivas",
      );
  }
  const pairs = new Set();
  for (const p of a.participaciones) {
    if (
      !has(a.ofertas, p.oferta) ||
      !has(a.profesores, p.profesor) ||
      !number(p.porcentaje) ||
      p.porcentaje <= 0 ||
      p.porcentaje > 100 ||
      Math.abs(p.porcentaje * 100 - Math.round(p.porcentaje * 100)) >
        0.000001 ||
      !STATUS.includes(p.estatus) ||
      typeof p.comentarios !== "string" ||
      p.comentarios.length > 2000
    )
      fail("Participación inválida; porcentaje con máximo dos decimales");
    const k = p.oferta + "|" + p.profesor;
    if (pairs.has(k)) fail("Profesor duplicado en el grupo");
    pairs.add(k);
  }
  for (const o of a.ofertas)
    if (
      a.participaciones
        .filter((p) => p.oferta === o.id)
        .reduce((n, p) => n + Math.round(p.porcentaje * 100), 0) > 10000
    )
      fail("La responsabilidad supera 100 %");
  const cs = new Set();
  for (const c of a.coordinaciones) {
    const o = has(a.ofertas, c.oferta);
    if (
      !o ||
      has(a.ufs, o.uf)?.tipo !== "Bloque" ||
      !has(a.profesores, c.profesor) ||
      !number(c.udc) ||
      cs.has(c.oferta)
    )
      fail("Coordinación inválida: solo una por bloque");
    cs.add(c.oferta);
  }
  for (const s of a.sesiones) {
    const o=has(a.ofertas,s.oferta);
    if(!o) fail("Selecciona un grupo existente para guardar la sesión.");
    if(roomIssues(a,s).length) fail(roomIssues(a,s).join(" "));
    if(o.estado === "Publicada" && sessionIssues(a,s).length) fail(sessionIssues(a,s).join(" "));
  }
  for (const sem of a.semestres) {
    for (const c of conflicts(a, sem.id)) if (c.aula && (a.salones || []).some((r) => r.id.toLowerCase() === c.aula.trim().toLowerCase())) fail(`Empalme en ${a.salones.find((r)=>r.id.toLowerCase()===c.aula.trim().toLowerCase())?.nombre || c.aula}: grupos ${a.ofertas.find((o)=>o.id===c.oferta1)?.grupo || c.oferta1} y ${a.ofertas.find((o)=>o.id===c.oferta2)?.grupo || c.oferta2}. Cambia el salón, el día, la hora o el periodo de una de las sesiones.`);
  }
  return a;
}
export function audit(a, actor, accion, detalle, cambios = []) {
  a.auditoria.push({
    id: randomUUID(),
    fecha: new Date().toISOString(),
    actor,
    accion,
    categoria: historyCategory(accion),
    detalle,
    cambios,
  });
  if(a.auditoria.length>10000)a.auditoria=a.auditoria.slice(-10000);
  a.revision++;
}
export function diffAcademic(before, after) {
  const result = [];
  for (const k of [
    "profesores",
    "ufs",
    "semestres",
    "ofertas",
    "participaciones",
    "sesiones",
    "coordinaciones",
    "salones",
    "prestamos",
    "sobrecargas",
    "admins",
  ]) {
    const ids = new Set([
      ...(before[k] || []).map((r) => r.id),
      ...(after[k] || []).map((r) => r.id),
    ]);
    for (const id of ids) {
      const old = (before[k] || []).find((r) => r.id === id),
        next = (after[k] || []).find((r) => r.id === id);
      if (JSON.stringify(old) === JSON.stringify(next)) continue;
      const clean = (r) =>
        r
          ? k === "admins"
            ? { id: r.id, nombre: r.nombre, role: r.role || "admin", profesor: r.profesor || "" }
            : k === "profesores"
              ? Object.fromEntries(
                  Object.entries(r).filter(([key]) => key !== "passwordHash"),
                )
              : r
          : null;
      result.push({
        coleccion: k,
        id,
        antes: clean(old),
        despues: clean(next),
        ...(k === "admins"
          ? { credencial_modificada: old?.hash !== next?.hash }
          : {}),
      });
    }
  }
  return result;
}

export function invalidate(a, before) {
  for (const o of a.ofertas) {
    const prev = before.ofertas.find((x) => x.id === o.id);
    const relevant = (x) =>
      JSON.stringify({
        o: (({ estado, ...rest }) => rest)(
          x.ofertas.find((z) => z.id === o.id) || {},
        ),
        parts: x.participaciones
          .filter((z) => z.oferta === o.id)
          .map(({ estatus, comentarios, ...z }) => z),
        sesiones: x.sesiones.filter((z) => z.oferta === o.id),
        coord: x.coordinaciones.filter((z) => z.oferta === o.id),
        sem: x.semestres.find((s) => s.id === o.semestre),
      });
    if (prev && relevant(a) !== relevant(before)) {
      o.estado = "Borrador";
      for (const p of a.participaciones.filter((p) => p.oferta === o.id)) {
        p.estatus = "Pendiente";
        p.comentarios = "";
      }
    }
  }
  for (const o of a.ofertas)
    if (o.estado === "Publicada" && publishIssues(a, o).length)
      o.estado = "Borrador";
}
export function publicAcademic(a, session) {
  const copy = structuredClone(a);
  copy.salones ||= [];
  copy.prestamos ||= [];
  copy.auditoria=copy.auditoria.map(r=>({...r,categoria:r.categoria||historyCategory(r.accion)}));
  copy.profesores = copy.profesores.map(({ passwordHash, ...p }) => ({
    ...p,
    hasPassword: !!passwordHash,
  }));
  copy.admins = copy.admins.map(({ hash, ...p }) => p);
  if (isAdmin(session.role)) return copy;
  if (session.role === "consulta") {
    copy.admins = [];
    copy.auditoria = [];
    copy.sobrecargas = [];
    copy.participaciones = copy.participaciones.map((p) => ({
      ...p,
      comentarios: "",
    }));
    return copy;
  }
  const id = session.nomina;
  const coordinated = new Set(copy.coordinaciones.filter(c=>c.profesor===id).map(c=>c.oferta));
  copy.prestamos = copy.prestamos.filter((p) => p.profesor === id);
  if (!coordinated.size) copy.profesores = copy.profesores.filter((p) => p.id === id);
  const ids = new Set([
    ...copy.participaciones
      .filter((p) => p.profesor === id)
      .map((p) => p.oferta),
    ...copy.coordinaciones
      .filter((c) => c.profesor === id)
      .map((c) => c.oferta),
  ]);
  copy.ofertas = copy.ofertas.filter(
    (o) => (ids.has(o.id) && o.estado === "Publicada") || coordinated.has(o.id),
  );
  const visible = new Set(copy.ofertas.map((o) => o.id));
  copy.participaciones = copy.participaciones.filter(
    (p) => (p.profesor === id || coordinated.has(p.oferta)) && visible.has(p.oferta),
  );
  copy.coordinaciones = copy.coordinaciones.filter(
    (c) => c.profesor === id && visible.has(c.oferta),
  );
  copy.sesiones = copy.sesiones
    .filter((s) => visible.has(s.oferta) && (coordinated.has(s.oferta) || list(s.profesores).includes(id)))
    .map((s) => coordinated.has(s.oferta) ? s : ({ ...s, profesores: id }));
  copy.ufs = copy.ufs.filter((u) => copy.ofertas.some((o) => o.uf === u.id));
  copy.sobrecargas = copy.sobrecargas.filter((s) => s.profesor === id);
  copy.admins = [];
  copy.auditoria = [];
  return copy;
}
