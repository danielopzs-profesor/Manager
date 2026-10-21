import roomCodes from "../shared/room-codes.json";
import {downloadCard} from "./downloads.js";
import { SemesterDatePicker, TimeRangePicker, explainError } from "./date-time.jsx";
import { acceptanceMetrics, roomUtilization } from "../shared/metrics.js";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource-variable/sora";
import "./style.css";
import "./theme.css";
import { Brand, Icon, IconAction, SemesterIllustration, navIcons } from "./visual.jsx";
const segments = ["P1", "I1", "P2", "I2", "P3"];
const labels = {
  P1: "Periodo 1",
  I1: "Intensiva 1",
  P2: "Periodo 2",
  I2: "Intensiva 2",
  P3: "Periodo 3",
};
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const names = {
  prestamos: "Préstamo a otro departamento",
  salones: "Salón",
  profesores: "Profesor",
  ufs: "Unidad de formación",
  semestres: "Semestre",
  ofertas: "Oferta / grupo",
  participaciones: "Participación docente",
  coordinaciones: "Coordinación",
  sesiones: "Sesión",
};
const split = (s) =>
  String(s || "")
    .split(",")
    .filter(Boolean);
const fmt = (n) =>
  Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 4 });
async function api(url, body) {
  const res = await fetch("/api" + url, {
    method: body ? "POST" : "GET",
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get("content-type") || "";
  const d = type.includes("json")
    ? await res.json()
    : { error: "El servidor no respondió correctamente. Intenta de nuevo." };
  if (!res.ok) throw Error(d.error || "No fue posible completar la operación");
  return d;
}
function Badge({ value }) {
  return (
    <span
      className={
        "badge " +
        (String(value).includes("pendiente") || value === "Cambio Solicitado"
          ? "warning"
          : value === "Aceptada" || value === "Publicada" || value === "Óptima"
            ? "success"
            : "")
      }
    >
      {value}
    </span>
  );
}
function Stat({ label, value, sub }) {
  return (
    <article className="stat">
      <div className="stat-head">
        <span>{label}</span>
        <span className="stat-icon">
          <Icon
            name={
              label.includes("Profesor")
                ? "users"
                : label.includes("carga")
                  ? "shield"
                  : label.includes("aceptad")
                    ? "check"
                    : "calendar"
            }
          />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}
function App() {
  const [me, setMe] = useState(null),
    [db, setDb] = useState(null),
    [config, setConfig] = useState({ production: true }),
    [sem, setSem] = useState(""),
    [tab, setTab] = useState("Inicio"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [acceptance, setAcceptance] = useState(""),
    [type, setType] = useState(""),
    [historyCategory, setHistoryCategory] = useState(""),
    [roomFilter, setRoomFilter] = useState(""),
    [segment, setSegment] = useState("P1"),
    [view, setView] = useState("Semana"),
    [detail, setDetail] = useState(""),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [backups, setBackups] = useState([]);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(explainError(e.message));
    } finally {
      setBusy(false);
    }
  };
  const refresh = async (s = sem) => {
    const d = await api(
      "/academic" + (s ? "?semestre=" + encodeURIComponent(s) : ""),
    );
    setDb(d);
    if (!s) setSem(d.semestres[0]?.id || "");
  };
  useEffect(() => {
    Promise.all([api("/me"), api("/config")])
      .then(([m, c]) => {
        setMe(m);
        setConfig(c);
      })
      .catch((e) => {
        setMe({ role: null });
        setError(explainError(e.message));
      });
    const cb = () => setOnline(navigator.onLine);
    window.addEventListener("online", cb);
    window.addEventListener("offline", cb);
    return () => {
      window.removeEventListener("online", cb);
      window.removeEventListener("offline", cb);
    };
  }, []);
  useEffect(() => {
    if (me?.role) run(() => refresh());
  }, [me?.role, sem]);
  useEffect(() => {
    if (!me?.role || modal) return;
    const id = setInterval(() => refresh().catch(() => {}), 30000);
    return () => clearInterval(id);
  }, [me?.role, sem, modal]);
  useEffect(() => {
    if (!modal) return;
    const key = (e) => {
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll(
            '[role="dialog"] button:not(:disabled),[role="dialog"] input:not(:disabled),[role="dialog"] textarea,[role="dialog"] select,[role="dialog"] a',
          ),
        ].filter((n) => n.offsetParent !== null);
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    setTimeout(
      () =>
        document
          .querySelector(
            '[role="dialog"] input,[role="dialog"] textarea,[role="dialog"] button',
          )
          ?.focus(),
      0,
    );
    return () => window.removeEventListener("keydown", key);
  }, [modal, busy]);
  useEffect(() => {
    if (tab === "Datos" && ["admin","superadmin"].includes(me?.role))
      api("/academic/backups")
        .then(setBackups)
        .catch((e) => setError(e.message));
  }, [tab, db?.revision]);
  const admin = ["admin","superadmin"].includes(me?.role);
  const superAdmin = me?.role === "superadmin";
  const coordinatedIds = db?.ofertasCoordinadas || [];
  const canManageOffer = o => admin || (tab === "Coordinación" && coordinatedIds.includes(o.id));
  const readAll = admin || me?.role === "consulta";
  const find = (collection, id) => db?.[collection]?.find((x) => x.id === id);
  const u = (o) => find("ufs", o.uf);
  const personal = tab === "Mi carga académica";
  const myProfessor = db ? db.miProfesor : me?.nomina;
  const offers = db?.ofertas.filter((o) => o.semestre === sem && (!personal ||
    db.participaciones.some((p) => p.oferta === o.id && p.profesor === myProfessor) ||
    db.coordinaciones.some((c) => c.oferta === o.id && c.profesor === myProfessor))) || [];
  const parts =
    db?.participaciones.filter((p) => offers.some((o) => o.id === p.oferta)) ||
    [];
  const sessions =
    db?.sesiones.filter((s) => offers.some((o) => o.id === s.oferta) && (!personal || split(s.profesores).includes(myProfessor))) || [];
  const open = (collection, item = {}) =>
    setModal({ kind: "edit", collection, item, revision: db.revision });
  const act = async (url, data, revision = db.revision) => {
    await api(url, { ...data, revision });
    await refresh();
    setNotice("Cambios guardados.");
  };
  const remove = (collection, item) =>
    setModal({ kind: "delete", collection, item, revision: db.revision });
  const notify = (p) =>
    run(async () => {
      const r = await api("/notify/" + encodeURIComponent(p.id), {
        semestre: sem,
      });
      if (r.preview) setModal({ kind: "preview", text: r.preview });
      else setNotice("Oferta enviada por correo.");
    });
  const response = (ids, estatus) =>
    setModal({ kind: "respond", ids, estatus, revision: db.revision });
  const login = (e) => {
    e.preventDefault();
    const values = Object.fromEntries(new FormData(e.target));
    run(async () => {
      setMe(
        await api("/login", {
          ...values,
        }),
      );
      history.replaceState({}, "", location.pathname);
    });
  };
  const menu = admin
    ? [
        "Inicio",
        ...(myProfessor ? ["Mi carga académica"] : []),
        "Profesores",
        "Unidades de formación",
        "Ofertas",
        "Salones",
        "Préstamos",
        "Solicitudes",
        "Usuarios y permisos",
        "Historial",
        "Datos",
      ]
    : me?.role === "consulta"
      ? ["Inicio", "Profesores", "Unidades de formación", "Ofertas", "Salones"]
      : ["Inicio", "Mi horario", "Mis respuestas", ...(coordinatedIds.length ? ["Coordinación"] : [])];
  const changeTab = (t) => {
    setTab(t);
    setDetail("");
    setQuery("");
    setStatus("");
    setAcceptance("");
    setType("");
  };
  const filteredOffers = offers.filter(
    (o) =>
      [o.clave, o.grupo, u(o)?.nombre]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!status || o.estado === status) &&
      (!type || u(o)?.tipo === type),
  );
  const acceptanceSummary = db ? acceptanceMetrics(db,sem) : {ids:[],accepted:[],pending:[],percent:0};
  const occupancy = db ? roomUtilization(db,sem,segment) : [];
  const freeHours = occupancy.reduce((n,r)=>n+r.freeHours,0);
  const availableHours = occupancy.reduce((n,r)=>n+r.totalHours,0);
  const loanRows = db?.prestamos?.filter((p)=>p.semestre===sem) || [];
  function offerCard(o) {
    const ps = db.participaciones.filter((p) => p.oferta === o.id);
    const total = ps.reduce((n, p) => n + p.porcentaje, 0);
    return (
      <article className="offer" key={o.id}>
        <div className="row">
          <span className="eyebrow">
            {u(o)?.tipo} · {o.modalidad}
          </span>
          <Badge value={o.estado} />
        </div>
        <h3>{u(o)?.nombre}</h3>
        <p>
          Grupo <b>{o.grupo || "Por definir"}</b> · Clave <b>{o.clave}</b>
        </p>
        <div className="chips">
          <span>
            {o.duracion} {o.duracion === 1 ? "semana" : "semanas"}
          </span>
          <span>{o.periodos}</span>
          <span>{fmt(o.udc)} UDC base</span>
        </div>
        {admin && (
          <>
            <div className="progress">
              <i style={{ width: Math.min(100, total) + "%" }} />
            </div>
            <small>Responsabilidad: {fmt(total)} % / 100 %</small>
          </>
        )}
        <div className="buttons">
          <button
            className="secondary"
            onClick={() => {
              setDetail(o.id);
              setTab(tab === "Coordinación" ? "Coordinación" : readAll ? "Ofertas" : "Mis respuestas");
            }}
          >
            Ver asignación →
          </button>
          {canManageOffer(o) && (
            <>
              <button className="secondary" onClick={() => open("participaciones", { oferta: o.id })}>
                Asignar profesor
              </button>
              {admin && <button className="plain" onClick={() => open("ofertas", o)}>Editar</button>}
              {admin && <button className="secondary" onClick={()=>downloadCard(u(o)?.nombre||"Asignación",["Grupo "+o.grupo+" · Clave "+o.clave,o.periodos+" · "+o.duracion+" semanas · "+o.udc+" UDC",...ps.map(p=>(find("profesores",p.profesor)?.nombre||p.profesor)+" · "+p.porcentaje+" %")])}>Descargar ficha JPEG</button>}
            </>
          )}
        </div>
      </article>
    );
  }
  function offerDetail(o) {
    const ps = db.participaciones.filter((p) => p.oferta === o.id && (readAll || tab === "Coordinación" || p.profesor === myProfessor));
    const coord = db.coordinaciones.find((c) => c.oferta === o.id);
    const issues = db.avisos.find((x) => x.oferta === o.id)?.errores || [];
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              GRUPO {o.grupo || "SIN DEFINIR"} · CLAVE {o.clave}
            </span>
            <h2>{u(o)?.nombre}</h2>
            <p>
              {o.duracion} semanas · {o.periodos} · {fmt(o.udc)} UDC ·{" "}
              <Badge value={o.estado} />
            </p>
          </div>
          <button className="secondary" onClick={() => setDetail("")}>
            Cerrar detalle
          </button>
        </div>
        {admin && (
          <>
            <div className="buttons">
              <button
                onClick={() =>
                  run(async () => {
                    await act("/academic/publish", { id: o.id });
                    setNotice("Oferta publicada. Ya puedes compartirla.");
                  })
                }
                disabled={busy || o.estado === "Publicada"}
              >
                Publicar oferta
              </button>
              <button className="secondary" onClick={() => open("ofertas", o)}>
                Editar grupo
              </button>
              <button className="danger" onClick={() => remove("ofertas", o)}>
                Eliminar grupo y asignaciones
              </button>
            </div>
            {issues.length > 0 && (
              <div className="requirements">
                <b>Para publicar</b>
                <ul>
                  {issues.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        <div className="section-heading">
          <h3>Responsabilidad docente</h3>
          {canManageOffer(o) && (
            <button
              className="secondary"
              onClick={() => open("participaciones", { oferta: o.id })}
            >
              Asignar profesor
            </button>
          )}
        </div>
        {ps.length ? (
          ps.map((p) => (
            <div className="record" key={p.id}>
              <div>
                <b>{find("profesores", p.profesor)?.nombre || p.profesor}</b>
                <p>
                  {fmt(p.porcentaje)} % · {fmt((o.udc * p.porcentaje) / 100)}{" "}
                  UDC
                </p>
                <Badge value={p.estatus} />
                {p.comentarios && <blockquote>{p.comentarios}</blockquote>}
              </div>
              <div className="buttons">
                {(canManageOffer(o) || p.profesor === myProfessor) &&
                  (canManageOffer(o) ? (
                    <>
                      <button
                        className="secondary"
                        onClick={() => open("participaciones", p)}
                      >
                        Editar
                      </button>
                      <button
                        className="plain"
                        onClick={() => remove("participaciones", p)}
                      >
                        Quitar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        disabled={busy || !online}
                        onClick={() => response([p.id], "Aceptada")}
                      >
                        Aceptar
                      </button>
                      <button
                        className="secondary"
                        onClick={() => response([p.id], "Cambio Solicitado")}
                      >
                        Solicitar cambio
                      </button>
                    </>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <p className="empty">
            Agrega los profesores y distribuye el 100 % de responsabilidad.
          </p>
        )}
        {u(o)?.tipo === "Bloque" && (
          <>
            <div className="section-heading">
              <h3>Coordinación del bloque</h3>
              {admin && (
                <button
                  className="secondary"
                  onClick={() =>
                    open("coordinaciones", coord || { oferta: o.id })
                  }
                >
                  {coord ? "Editar" : "Asignar coordinador"}
                </button>
              )}
            </div>
            {coord ? (
              <div className="record">
                <div>
                  <b>
                    {find("profesores", coord.profesor)?.nombre ||
                      coord.profesor}
                  </b>
                  <p>
                    {fmt(coord.udc)} UDC adicionales, incluidas en el total
                    semestral.
                  </p>
                </div>
                {admin && (
                  <button
                    className="plain"
                    onClick={() => remove("coordinaciones", coord)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            ) : (
              <p>Coordinación pendiente de asignación.</p>
            )}
          </>
        )}
        <div className="section-heading">
          <h3>Sesiones y horarios</h3>
          {admin && (
            <button
              className="secondary"
              onClick={() => open("sesiones", { oferta: o.id })}
            >
              + Sesión
            </button>
          )}
        </div>
        {db.sesiones
          .filter((s) => s.oferta === o.id)
          .map((s) => (
            <div className="record" key={s.id}>
              <div>
                <b>
                  {s.dias} · {s.horario}
                </b>
                <p>
                  {s.aula} · {s.segmentos}
                </p>
                <small>
                  {split(s.profesores)
                    .map((id) => find("profesores", id)?.nombre || id)
                    .join(" / ")}
                </small>
              </div>
              {admin && (
                <div className="buttons">
                  <button
                    className="secondary"
                    onClick={() => open("sesiones", s)}
                  >
                    Editar
                  </button>
                  <button
                    className="plain"
                    onClick={() => remove("sesiones", s)}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))}
      </section>
    );
  }
  function professor(p) {
    const w = db.cargas.find((w) => w.profesor === p.id);
    const assigned = offers.filter(
      (o) =>
        db.participaciones.some(
          (x) => x.oferta === o.id && x.profesor === p.id,
        ) ||
        db.coordinaciones.some((x) => x.oferta === o.id && x.profesor === p.id),
    );
    return (
      <article className="panel professor" key={p.id}>
        <div className="row">
          <span className="avatar">
            {p.nombre
              .split(" ")
              .slice(0, 2)
              .map((x) => x[0])
              .join("")}
          </span>
          <Badge value={p.tipo} />
        </div>
        <h3>{p.nombre}</h3>
        <p>
          {p.id} · {p.correo}
        </p>
        <div className="load">
          <strong>{fmt(w.total)}</strong>
          <span>/ {w.max ?? "—"} UDC semestrales</span>
        </div>
        <Badge value={w.estado} />
        <div className="breakdown">
          <span>
            Docencia <b>{fmt(w.docencia)}</b>
          </span>
          <span>
            Intensivas <b>{fmt(w.intensivas)}</b>
          </span>
          <span>
            Coordinación <b>{fmt(w.coordinacion)}</b>
          </span><span>Préstamos <b>{fmt(w.prestamos)}</b></span><span>Disponible aquí <b>{w.disponible === null ? "Por clasificar" : fmt(w.disponible)} UDC</b></span>
        </div>
        {p.tipo === "Cátedra" && (
          <p className="muted">
            Vigencia académica sugerida:{" "}
            {w.contrato
              ? `${w.contrato.inicio} → ${w.contrato.fin}`
              : "Define fechas y asignaciones"}
            . El contrato debe formalizarse por la institución.
          </p>
        )}
        <details>
          <summary>Ver distribución y grupos ({assigned.length})</summary>
          {segments.map((seg) => (
            <p key={seg}>
              {labels[seg]}:{" "}
              {fmt(
                w.distribucion?.find((d) => d.segmento === seg)?.horasSemanales,
              )}{" "}
              h/semana ·{" "}
              {assigned
                .filter((o) => split(o.periodos).includes(seg))
                .map((o) => o.clave)
                .join(", ") || "Sin grupos"}
            </p>
          ))}
          {assigned.map((o) => (
            <button
              className="link"
              key={o.id}
              onClick={() => {
                setTab("Ofertas");
                setDetail(o.id);
              }}
            >
              {u(o)?.nombre} · Grupo {o.grupo || "—"} · {o.clave}
            </button>
          ))}
        </details>
        {w.aprobacion && (
          <p className="muted">
            Aprobó {w.aprobacion.administrador}: {w.aprobacion.motivo}
          </p>
        )}
        {admin && (
          <div className="professor-controls">
            <div className="professor-icon-actions" role="group" aria-label={`Acciones de ${p.nombre}`}>
              <IconAction icon="add" label="Asignar unidad de formación" onClick={()=>open("participaciones",{profesor:p.id})}/>
              <IconAction icon="download" label="Descargar ficha JPEG" onClick={()=>downloadCard(p.nombre,[p.correo,"Contrato: "+p.tipo,...(p.area?["Área de origen: "+p.area]:[]),"Carga total: "+fmt(w.total)+" UDC","Disponible: "+fmt(w.disponible)+" UDC",...assigned.map(o=>(u(o)?.nombre||o.uf)+" · Grupo "+o.grupo)])}/>
              <IconAction icon="edit" label="Editar" onClick={()=>open("profesores",p)}/>
              <IconAction icon="share" label="Compartir oferta" disabled={busy} onClick={()=>notify(p)}/>
              <IconAction icon="delete" label="Eliminar" danger disabled={p.protectedAccess || db.admins.some(a=>a.profesor===p.id && a.role==="superadmin")} tooltip={p.protectedAccess?"Este perfil de superadministrador está protegido":"Eliminar profesor"} onClick={()=>remove("profesores",p)}/>
            </div>
            <button className="secondary professor-password" onClick={()=>setModal({kind:"professorPassword",profesor:p.id,revision:db.revision})}>{p.hasPassword?"Restablecer contraseña":"Configurar acceso"}</button>
            {w.estado === "Sobrecarga pendiente" && p.id !== myProfessor && <button onClick={()=>setModal({kind:"approve",profesor:p.id,revision:db.revision})}>Aprobar sobrecarga</button>}
            {superAdmin && (()=>{const account=db.admins.find(a=>a.profesor===p.id||a.id===p.correo.toLowerCase());return <label className="role-check professor-role-check"><input type="checkbox" checked={["admin","superadmin"].includes(account?.role || p.accessRole)} disabled={busy||p.protectedAccess||account?.protegido||account?.role==="superadmin"} onChange={e=>run(()=>act("/academic/professor-role",{profesor:p.id,enabled:e.target.checked}))}/>Administrador{account?.role==="superadmin"||p.protectedAccess?" (superadministrador permanente)":""}</label>})()}
          </div>
        )}
      </article>
    );
  }
  function calendarView() {
    return (
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>{readAll && !personal ? "Distribución de horarios" : "Mi horario"}</h2>
            <p>
              Horas de sesión por segmento; las UDC se cuentan una sola vez en
              el semestre.
            </p>
          </div>
          <div className="tabs">
            {["Semana", "Lista"].map((v) => (
              <button
                key={v}
                className={v === view ? "active" : ""}
                onClick={() => setView(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="segment-tabs">
          {segments.map((s) => (
            <button
              key={s}
              className={segment === s ? "active" : ""}
              onClick={() => setSegment(s)}
            >
              {labels[s]}
            </button>
          ))}
        </div>
        <p>
          {db.calendario.find((s) => s.id === segment)?.inicio ||
            "Fechas por configurar"}{" "}
          — {db.calendario.find((s) => s.id === segment)?.fin || ""}
        </p>
        {view === "Semana" ? (
          <div className="week">
            {days.map((d) => (
              <div className="day" key={d}>
                <h3>{d}</h3>
                {sessions
                  .filter(
                    (s) =>
                      split(s.segmentos).includes(segment) &&
                      split(s.dias).includes(d),
                  )
                  .sort((a, b) => a.horario.localeCompare(b.horario))
                  .map((s) => {
                    const o = find("ofertas", s.oferta);
                    return (
                      <button
                        className="event"
                        key={s.id}
                        onClick={() => {
                          setDetail(o.id);
                          setTab(tab === "Coordinación" ? "Coordinación" : readAll ? "Ofertas" : "Mis respuestas");
                        }}
                      >
                        <span>{s.horario}</span>
                        <b>{u(o)?.nombre}</b>
                        <span>
                          Grupo {o.grupo} · {s.aula}
                        </span>
                        {admin && <small>{o.estado}</small>}
                      </button>
                    );
                  })}
              </div>
            ))}
          </div>
        ) : (
          sessions
            .filter((s) => split(s.segmentos).includes(segment))
            .map((s) => (
              <div className="record" key={s.id}>
                <div>
                  <b>{u(find("ofertas", s.oferta))?.nombre}</b>
                  <p>
                    {s.dias} · {s.horario} · {s.aula}
                  </p>
                </div>
              </div>
            ))
        )}
        {!sessions.filter((s) => split(s.segmentos).includes(segment))
          .length && (
          <p className="empty">No hay sesiones programadas en este segmento.</p>
        )}
      </section>
    );
  }
  return (
    <>
      <header
        className={
          me?.role
            ? "site-header site-header--app"
            : "site-header site-header--login"
        }
      >
        <Brand />
        {me?.role && (
          <div className="header-context">
            <span className="eyebrow">COORDINACIÓN ACADÉMICA</span>
            <span className="header-identity">
              <Icon name="user" size={16} />
              {me.adminId || me.nomina || "Configuración inicial"}
            </span>
          </div>
        )}
        {!me?.role && (
          <span className="status-pill">
            <i /> Portal académico
          </span>
        )}
        {me?.role && (
          <button
            className="header-button"
            onClick={() =>
              run(async () => {
                await api("/logout", {});
                setMe({ role: null });
                setDb(null);
                setTab("Inicio");
              })
            }
          >
            Cerrar sesión
          </button>
        )}
      </header>
      {!online && (
        <div className="offline">
          Sin conexión. Para consultar o guardar cambios necesitas internet.
        </div>
      )}
      {!me?.role ? (
        <main className="login-page">
          <div className="login-intro">
            <span className="eyebrow">
              <Icon name="spark" size={16} /> DOCENCIA · ORGANIZACIÓN ·
              ENCUENTRO
            </span>
            <h1>
              Tu semestre,
              <br />
              <em>en orden.</em>
            </h1>
            <p>
              Consulta materias, horarios y espacios asignados. Todo lo que
              necesitas para enseñar y coordinar, en un solo lugar.
            </p>
            <SemesterIllustration />
          </div>
          <div className="login-panel-wrap">
            <div className="orbit-card orbit-card--top">
              <Icon name="calendar" size={16} /> Periodos e intensivas
            </div>
            <div className="orbit-card orbit-card--bottom">
              <Icon name="users" size={16} /> Un espacio compartido
            </div>
            <form className="login-card" onSubmit={login}>
              <div className="login-card__icon">
                <Icon name="user" size={26} />
              </div>
              <span className="eyebrow">BIENVENIDO</span>
              <h2>Ingresa a tu espacio</h2>
              <label>
                Usuario
                <input
                  name="identifier"
                  type="text"
                  defaultValue={new URLSearchParams(location.search).get("correo") || ""}
                  autoComplete="username"
                  placeholder="Tu usuario"
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  name="password"
                  required={config.production}
                  autoComplete="current-password"
                />
              </label>
              <button
                className="primary"
                disabled={busy || !online || me === null}
              >
                {busy ? "Ingresando…" : "Ingresar →"}
              </button>
              {!config.production && (
                <p className="muted">
                  Demostración local: mariana@example.edu. Contraseña inicial de
                  administrador: admin-demo.
                </p>
              )}
              {error && (
                <div className="alert error" role="alert">
                  {error}
                </div>
              )}
            </form>
          </div>
        </main>
      ) : (
        <div className="app-shell">
          <nav className="sidebar" aria-label="Navegación principal">
            <Brand light />
            <small>MI ESPACIO</small>
            {menu.map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => changeTab(t)}
                aria-current={tab === t ? "page" : undefined}
              >
                <Icon name={navIcons[t]} />
                <span>{t}</span>
              </button>
            ))}
            <div className="sidebar-foot">
              {admin
                ? "Administración"
                : me.role === "consulta"
                  ? "Consulta · Solo lectura"
                  : "Profesor"}
              <br />
              {me.adminId || me.nomina || "Configuración inicial"}
            </div>
          </nav>
          <main className="workspace">
            {error && (
              <div className="alert error" role="alert">
                {error}
                <button
                  className="plain"
                  onClick={() => {
                    setError("");
                    run(() => refresh());
                  }}
                >
                  Recargar
                </button>
              </div>
            )}
            {notice && (
              <div className="alert" role="status">
                {notice}
                <button className="plain" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}
            {!db ? (
              <p>Cargando programación…</p>
            ) : (
              <>
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">GESTIÓN DEL SEMESTRE</span>
                    <h1>
                      {tab === "Inicio"
                        ? readAll
                          ? "Una mirada al semestre."
                          : "Tu próximo semestre."
                        : tab}
                    </h1>
                    <p>
                      {readAll
                        ? "Organiza el talento. Da espacio a la creatividad."
                        : "Consulta tus grupos y confirma tu participación."}
                    </p>
                  </div>
                  <div className="semester">
                    <label>
                      Semestre
                      <select
                        value={sem}
                        onChange={(e) => {
                          setSem(e.target.value);
                          setDetail("");
                        }}
                      >
                        {db.semestres.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                    {admin && (
                      <div className="buttons">
                        <button
                          className="plain"
                          onClick={() =>
                            open("semestres", find("semestres", sem))
                          }
                        >
                          Editar fechas
                        </button>
                        <button
                          className="plain"
                          onClick={() => open("semestres")}
                        >
                          + Semestre
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {admin && config.accessPolicyActive === false && <div className="alert">La política de identidades de web-deploy aún no está activada en este entorno. Activa ENFORCE_NAMED_ROLES=1 o usa el arranque start:web para aplicar la lista verificada.</div>}
                {tab === "Inicio" && (
                  <>
                    <div className="stats">
                      {readAll ? (
                        <>
                          <Stat
                            label="Profesores"
                            value={db.profesores.length}
                            sub="Cátedra y planta"
                          />
                          <Stat
                            label="Grupos del semestre"
                            value={offers.length}
                            sub={`${offers.filter((o) => o.estado === "Publicada").length} publicados`}
                          />
                          <Stat
                            label="Responsabilidades aceptadas"
                            value={`${Math.round((parts.filter((p) => p.estatus === "Aceptada").length / (parts.length || 1)) * 100)} %`}
                            sub={`${parts.filter((p) => p.estatus === "Pendiente").length} pendientes`}
                          />
                          <Stat
                            label="Sobrecargas por revisar"
                            value={
                              db.cargas.filter(
                                (c) => c.estado === "Sobrecarga pendiente",
                              ).length
                            }
                            sub="Incluye coordinación, intensivas y préstamos"
                          />
                        </>
                      ) : (
                        <>
                          <Stat
                            label="UDC semestrales"
                            value={fmt(db.cargas[0]?.total)}
                            sub={`Tope: ${db.cargas[0]?.max ?? "Por clasificar"} UDC`}
                          />
                          <Stat
                            label="Grupos"
                            value={offers.length}
                            sub={`${new Set(offers.map((o) => o.uf)).size} UF distintas`}
                          />
                          <Stat
                            label="Mi carga"
                            value={db.cargas[0]?.estado || "Sin asignaciones"}
                            sub="Incluye coordinación y préstamos"
                          />
                        </>
                      )}
                    </div>
                    {readAll && <div className="dashboard-grid">
                      <section className="panel"><h2>Confirmación de carga docente</h2>
                        <div className="dashboard-ring" style={{"--progress":acceptanceSummary.percent+'%'}}><strong>{acceptanceSummary.percent}%</strong></div>
                        <p>{acceptanceSummary.accepted.length} de {acceptanceSummary.ids.length} profesores con todas sus asignaciones publicadas aceptadas.</p>
                        <p className="muted">Solo se consideran ofertas publicadas. Los borradores y profesores sin oferta publicada no entran en el porcentaje.</p>
                        <div className="buttons"><button onClick={()=>{changeTab("Profesores");setAcceptance("Carga aceptada");}}>Ver cargas aceptadas</button><button className="secondary" onClick={()=>{changeTab("Profesores");setAcceptance("Carga pendiente");}}>Ver pendientes ({acceptanceSummary.pending.length})</button></div>
                      </section>
                      <section className="panel"><h2>Distribución de profesores</h2>
                        {["Cátedra","Planta","Cátedra interna","Préstamo","Por clasificar"].map(t=>{const n=db.profesores.filter(p=>p.tipo===t).length,pct=db.profesores.length?Math.round(n/db.profesores.length*100):0;return <button className="metric-row" key={t} onClick={()=>{changeTab("Profesores");setType(t);}}><span>{t === "Por clasificar" ? "No definido" : t} · {n} ({pct}%)</span><progress max="100" value={pct}/><span>Revisar →</span></button>})}
                      </section>
                      <section className="panel"><h2>Disponibilidad de salones</h2>
                        <label>Periodo<select aria-label="Periodo de disponibilidad" value={segment} onChange={e=>setSegment(e.target.value)}>{segments.map(s=><option key={s} value={s}>{labels[s]}</option>)}</select></label>
                        <strong className="metric-number">{fmt(freeHours)} h libres / semana</strong>
                        <progress max={availableHours||1} value={freeHours}/>
                        <p>{fmt(availableHours)} h semanales configuradas. Incluye reservas en borrador; no representa lugares de alumnos.</p>
                        <button onClick={()=>changeTab("Salones")}>Ver ocupación de salones</button>
                      </section>
                      <section className="panel"><h2>Préstamos a otros departamentos</h2>
                        <strong className="metric-number">{fmt(loanRows.reduce((n,p)=>n+p.udc,0))} UDC</strong>
                        <p>{new Set(loanRows.map(p=>p.profesor)).size} profesores. Estas UDC consumen el tope semestral y reducen la carga disponible aquí.</p>
                        {admin && <button onClick={()=>changeTab("Préstamos")}>Gestionar préstamos</button>}
                      </section>
                    </div>}
                    {admin &&
                      db.profesores.some(
                        (p) => p.tipo === "Por clasificar",
                      ) && (
                        <div className="alert">
                          Hay profesores pendientes de clasificar. Las
                          asignaciones migradas permanecen como borradores hasta
                          revisar sus datos.
                        </div>
                      )}
                    {admin && db.conflictos.length > 0 && (
                      <section className="panel">
                        <h2>Conflictos de horario ({db.conflictos.length})</h2>
                        {db.conflictos.map((c, i) => (
                          <p key={i}>
                            {find("ofertas", c.oferta1)?.clave} ↔{" "}
                            {find("ofertas", c.oferta2)?.clave} ·{" "}
                            {c.aula ? "Aula " + c.aula : ""}{" "}
                            {c.profesores.length
                              ? "Docentes: " + c.profesores.join(", ")
                              : ""}
                          </p>
                        ))}
                      </section>
                    )}
                    {calendarView()}
                    {!admin && db.profesores.map(professor)}
                    <section>
                      <div className="section-heading">
                        <h2>{readAll ? "Ofertas recientes" : "Mis grupos"}</h2>
                        <button
                          className="secondary"
                          onClick={() =>
                            changeTab(readAll ? "Ofertas" : "Mis respuestas")
                          }
                        >
                          Ver todas →
                        </button>
                      </div>
                      <div className="cards">
                        {offers.slice(0, 6).map(offerCard)}
                      </div>
                    </section>
                  </>
                )}
                {tab === "Profesores" && (
                  <>
                    <div className="toolbar">
                      <input
                        aria-label="Buscar profesor"
                        placeholder="Buscar nombre o usuario"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <select
                        aria-label="Tipo de profesor"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        <option value="">Todos los tipos</option>
                        {["Cátedra", "Planta", "Cátedra interna", "Préstamo", "Por clasificar"].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Estado de carga"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                      >
                        <option value="">Todas las cargas</option>
                        {[
                          "Óptima",
                          "Sobrecarga pendiente",
                          "Sobrecarga aprobada",
                          "Por clasificar",
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Estatus de aceptación"
                        value={acceptance}
                        onChange={(e) => setAcceptance(e.target.value)}
                      >
                        <option value="">Todas las respuestas</option>
                        {["Pendiente", "Aceptada", "Cambio Solicitado", "Carga aceptada", "Carga pendiente"].map(
                          (s) => (
                            <option key={s}>{s}</option>
                          ),
                        )}
                      </select>
                      {admin && (
                        <button onClick={() => open("profesores")}>
                          + Profesor
                        </button>
                      )}
                    </div>
                    <div className="cards">
                      {db.profesores
                        .filter(
                          (p) =>
                            (p.nombre + " " + p.id)
                              .toLowerCase()
                              .includes(query.toLowerCase()) &&
                            (!type || p.tipo === type) &&
                            (!acceptance ||
                              (acceptance === "Carga aceptada" ? acceptanceSummary.accepted.includes(p.id) :
                              acceptance === "Carga pendiente" ? acceptanceSummary.pending.includes(p.id) : parts.some(
                                (x) =>
                                  x.profesor === p.id &&
                                  x.estatus === acceptance,
                              ))) &&
                            (!status ||
                              db.cargas.find((c) => c.profesor === p.id)
                                ?.estado === status),
                        )
                        .map(professor)}
                    </div>
                  </>
                )}
                {tab === "Unidades de formación" && (
                  <>
                    <div className="toolbar">
                      <input
                        aria-label="Buscar UF"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar unidad de formación"
                      />
                      {admin && (
                        <button onClick={() => open("ufs")}>
                          + Unidad de formación
                        </button>
                      )}
                    </div>
                    <div className="cards">
                      {db.ufs
                        .filter((u) =>
                          (u.id + " " + u.nombre)
                            .toLowerCase()
                            .includes(query.toLowerCase()),
                        )
                        .map((u) => (
                          <article className="panel" key={u.id}>
                            <Badge value={u.tipo} />
                            <h3>{u.nombre}</h3>{admin && <button className="secondary" onClick={()=>downloadCard(u.nombre,["Clave UF: "+u.id,"Tipo: "+u.tipo,"UDC base: "+u.udc])}>Descargar ficha JPEG</button>}
                            <p>
                              {u.id} · {fmt(u.udc)} UDC base
                            </p>
                            {admin && (
                              <div className="buttons">
                                <button
                                  className="secondary"
                                  onClick={() => open("ufs", u)}
                                >
                                  Editar
                                </button>
                                <button
                                  className="plain"
                                  onClick={() => remove("ufs", u)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </article>
                        ))}
                    </div>
                  </>
                )}
                {["Ofertas", "Mis respuestas", "Coordinación"].includes(tab) && (
                  <>
                    {detail && find("ofertas", detail) ? (
                      offerDetail(find("ofertas", detail))
                    ) : (
                      <>
                        <div className="toolbar">
                          <input
                            aria-label="Buscar oferta"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar UF, grupo o clave única"
                          />
                          {admin && (
                            <>
                              <select
                                aria-label="Estado"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                              >
                                <option value="">Todos los estados</option>
                                <option>Borrador</option>
                                <option>Publicada</option>
                              </select>
                              <select
                                aria-label="Tipo de UF"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                              >
                                <option value="">Materias y bloques</option>
                                <option>Materia</option>
                                <option>Bloque</option>
                              </select>
                              <button
                                onClick={() =>
                                  open("ofertas", { semestre: sem })
                                }
                              >
                                + Oferta / grupo
                              </button>
                            </>
                          )}
                        </div>
                        {me.role === "profesor" && parts.length > 0 && (
                          <div className="buttons bulk">
                            <button
                              onClick={() =>
                                response(
                                  parts.map((p) => p.id),
                                  "Aceptada",
                                )
                              }
                            >
                              Aceptar todas mis asignaciones
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                response(
                                  parts.map((p) => p.id),
                                  "Cambio Solicitado",
                                )
                              }
                            >
                              Solicitar cambio de todas
                            </button>
                          </div>
                        )}
                        <div className="cards">
                          {filteredOffers.filter(o=>tab!=="Coordinación"||coordinatedIds.includes(o.id)).map(offerCard)}
                        </div>
                        {!filteredOffers.length && (
                          <p className="empty">
                            No hay ofertas que coincidan con la búsqueda.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
                {tab === "Mi carga académica" && admin && myProfessor && (
                  <>
                    <section className="panel">
                      <h2>Mi carga académica</h2>
                      <p>{find("profesores", myProfessor)?.nombre}</p>
                      <p>{fmt(db.cargas.find((c) => c.profesor === myProfessor)?.total)} UDC semestrales, incluida coordinación y préstamos.</p>
                      {!offers.length && <p>No tienes grupos asignados en este semestre.</p>}
                    </section>
                    {calendarView()}
                    {offers.map((o) => (
                      <section className="panel" key={o.id}>
                        <h3>{u(o)?.nombre} · Grupo {o.grupo || "—"}</h3>
                        <p>Clave {o.clave} · {o.periodos} · <Badge value={o.estado} /></p>
                        {db.participaciones.filter((p) => p.oferta === o.id && p.profesor === myProfessor).map((p) => (
                          <div key={p.id}>
                            <p>{fmt(p.porcentaje)} % de responsabilidad · {fmt(o.udc * p.porcentaje / 100)} UDC · <Badge value={p.estatus} /></p>
                            {o.estado === "Publicada" ? <div className="buttons">
                              <button disabled={busy || !online} onClick={() => response([p.id], "Aceptada")}>Aceptar clases</button>
                              <button className="secondary" disabled={busy || !online} onClick={() => response([p.id], "Cambio Solicitado")}>Solicitar cambio</button>
                            </div> : <p>Podrás responder cuando la oferta esté publicada.</p>}
                          </div>
                        ))}
                        {db.coordinaciones.filter((c) => c.oferta === o.id && c.profesor === myProfessor).map((c) => <p key={c.id}>Coordinación: {fmt(c.udc)} UDC adicionales.</p>)}
                      </section>
                    ))}
                  </>
                )}
                {tab === "Préstamos" && admin && <section className="panel">
                  <div className="section-heading"><div><h2>Préstamos a otros departamentos</h2><p>Se suman a la carga total del semestre, no crean grupos locales ni descuentan dos veces una asignación.</p></div><button onClick={()=>open("prestamos",{semestre:sem})}>+ Préstamo</button></div>
                  {!loanRows.length && <p>No hay préstamos en este semestre.</p>}
                  {loanRows.map(p=><div className="record" key={p.id}><div><b>{find("profesores",p.profesor)?.nombre}</b><p>{p.departamento} · {fmt(p.udc)} UDC</p>{p.comentarios&&<p>{p.comentarios}</p>}</div><div className="buttons"><button className="secondary" onClick={()=>open("prestamos",p)}>Editar préstamo</button><button className="plain" onClick={()=>remove("prestamos",p)}>Eliminar préstamo</button></div></div>)}
                </section>}
                {tab === "Salones" && readAll && (
                  <>
                    <div className="toolbar">
                      <select aria-label="Filtrar salón" value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}>
                        <option value="">Todos los salones</option>
                        {db.salones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                      </select>
                      <select aria-label="Periodo del mapa" value={segment} onChange={(e) => setSegment(e.target.value)}>
                        {segments.map((s) => <option key={s} value={s}>{labels[s]}</option>)}
                      </select>
                      {admin && <button onClick={() => open("salones")}>+ Salón</button>}
                    </div>
                    <p>Mapa de ocupación del semestre: selecciona un periodo. Los borradores también reservan espacio.</p>
                    {!db.salones.length && <p>Registra los salones con su capacidad y disponibilidad para controlar el aforo.</p>}
                    {db.salones.filter((r) => !roomFilter || r.id === roomFilter).map((r) => (
                      <section className="panel" key={r.id}>
                        <h2>{r.nombre}</h2>
                        <p>{fmt(occupancy.find(x=>x.id===r.id)?.freeHours)} h libres por semana en {segment}</p>
                        <p>Capacidad: {r.capacidad} alumnos · {r.dias} · {r.horario}</p>
                        {admin && <div className="buttons">
                          <button className="secondary" onClick={() => open("salones", r)}>Editar salón</button>
                          <button className="secondary" onClick={() => open("sesiones", { aula: r.id })}>Asignar clase</button>
                          <button className="danger" onClick={() => remove("salones", r)}>Eliminar salón</button>
                        </div>}
                        <div className="week">
                          {days.map((day) => <div className="day" key={day}>
                            <h3>{day}</h3>
                            {sessions.filter((s) => s.aula === r.id && split(s.segmentos).includes(segment) && split(s.dias).includes(day)).sort((a,b) => a.horario.localeCompare(b.horario)).map((s) => {
                              const o = find("ofertas", s.oferta);
                              return <article className="record" key={s.id}><div><b>{s.horario} · {u(o)?.nombre}</b><p>Grupo {o.grupo} · {o.alumnos || "Sin aforo capturado"} alumnos · {o.estado}</p><small>{split(s.profesores).map((id) => find("profesores", id)?.nombre || id).join(" / ")}</small></div></article>;
                            })}
                          </div>)}
                        </div>
                      </section>
                    ))}
                  </>
                )}
                {tab === "Mi horario" && calendarView()}
                {tab === "Solicitudes" && (
                  <section className="panel">
                    <h2>Solicitudes de cambio</h2>
                    {parts
                      .filter((p) => p.estatus === "Cambio Solicitado")
                      .map((p) => (
                        <div className="record" key={p.id}>
                          <div>
                            <b>{find("profesores", p.profesor)?.nombre}</b>
                            <p>
                              {u(find("ofertas", p.oferta))?.nombre} ·{" "}
                              {find("ofertas", p.oferta)?.clave}
                            </p>
                            <blockquote>{p.comentarios}</blockquote>
                          </div>
                          <button
                            className="secondary"
                            onClick={() => {
                              setDetail(p.oferta);
                              setTab("Ofertas");
                            }}
                          >
                            Revisar oferta
                          </button>
                        </div>
                      ))}
                    {!parts.some((p) => p.estatus === "Cambio Solicitado") && (
                      <p className="empty">No hay solicitudes pendientes.</p>
                    )}
                  </section>
                )}
                {tab === "Usuarios y permisos" && (
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <h2>Cuentas y permisos</h2>
                        <p>
                          Al crear la primera cuenta, se desactiva el acceso
                          compartido inicial.
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setModal({ kind: "admin", revision: db.revision })
                        }
                      >
                        + Usuario
                      </button>
                    </div>
                    {db.admins.map((a) => (
                      <div className="record" key={a.id}>
                        <div>
                          <b>{a.nombre}</b>
                          <p>
                            {a.id} ·{" "}
                            {({superadmin:"Superadministrador",admin:"Administrador",profesor:"Profesor",consulta:"Consulta · Solo lectura"})[a.role||"consulta"]}
                            {a.profesor && ` · Docente: ${find("profesores", a.profesor)?.nombre || a.profesor}`}
                          </p>
                        </div>
                        <div className="buttons">
                          <button
                            className="secondary"
                            onClick={() =>
                              setModal({
                                kind: "admin",
                                item: a,
                                revision: db.revision,
                              })
                            }
                          >
                            Editar / contraseña
                          </button>
                          <button
                            className="plain"
                            onClick={() =>
                              setModal({
                                kind: "adminDelete",
                                item: a,
                                revision: db.revision,
                              })
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </section>
                )}
                {tab === "Historial" && (
                  <section className="panel">
                    <h2>Historial de la plataforma</h2>
                    <div className="toolbar"><select aria-label="Categoría de historial" value={historyCategory} onChange={e=>setHistoryCategory(e.target.value)}><option value="">Todas las categorías</option>{["accesos","errores","cambios","respuestas","aprobaciones","datos","seguridad"].map(c=><option key={c}>{c}</option>)}</select>
                    <a className="button secondary" href={"/api/academic/history.txt?categoria="+historyCategory}>Descargar TXT</a>
                    <button className="danger" onClick={()=>setModal({kind:"clearHistory",revision:db.revision,categoria:historyCategory})}>Borrar historial</button></div>
                    <p>Hasta 10 000 eventos recientes. La limpieza conserva un registro de quién la realizó; los respaldos previos pueden contener eventos anteriores.</p>
                    {db.auditoria.filter(a=>!historyCategory||(a.categoria||"cambios")===historyCategory)
                      .slice()
                      .reverse()
                      .map((a) => (
                        <div className="record" key={a.id}>
                          <div>
                            <b>{a.accion}</b> <Badge value={a.categoria||"cambios"}/>
                            <p>{a.detalle}</p>
                            <small>
                              {a.actor} ·{" "}
                              {new Date(a.fecha).toLocaleString("es-MX")}
                            </small>
                            {a.cambios?.length > 0 && (
                              <details>
                                <summary>
                                  Ver cambios ({a.cambios.length})
                                </summary>
                                <pre className="audit-diff">
                                  {JSON.stringify(a.cambios, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      ))}
                  </section>
                )}
                {tab === "Datos" && (
                  <section className="panel">
                    <h2>Datos y respaldos</h2>
                    <p>
                      La base de datos conserva la programación. Excel sirve
                      para importar y exportar; no sincroniza archivos de tu
                      computadora.
                    </p>
                    <p className="muted">El formato de entrega incluye ofertas publicadas y en borrador del semestre seleccionado. Completa sus datos de entrega; descargar no publica ni confirma las ofertas.</p>
                    <div className="buttons bulk">
                      <a className="button" href="/api/academic/export">
                        Descargar Excel / plantilla
                      </a>
                      <button className="secondary" disabled={busy} onClick={()=>run(async()=>{const response=await fetch("/api/academic/delivery.xlsx?semestre="+encodeURIComponent(sem));if(!response.ok){const result=await response.json();throw Error(result.error||"No se pudo generar el formato de entrega.");}const url=URL.createObjectURL(await response.blob()),link=document.createElement("a");link.href=url;link.download="Formato_Entrega.xlsx";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>Descargar formato de entrega</button>
                      <a
                        className="button secondary"
                        href={"/api/academic/report.pdf?semestre="+encodeURIComponent(sem)}
                      >
                        Descargar reporte PDF
                      </a>
                      <label className="button secondary">
                        Importar Excel
                        <input
                          hidden
                          type="file"
                          accept=".xlsx"
                          onChange={(e) => {
                            if (e.target.files[0])
                              setModal({
                                kind: "import",
                                file: e.target.files[0],
                                revision: db.revision,
                              });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                    <p>
                      La importación reemplaza los datos académicos, conserva
                      cuentas e historial y deja los grupos como borradores. Usa
                      exclusivamente la plantilla nueva. Exporta un respaldo
                      antes de importar.
                    </p>
                    <p>
                      Se conservan automáticamente las últimas 30 versiones
                      antes de cada cambio. Estos respaldos están en el mismo
                      almacenamiento; conserva también una copia externa
                      periódica.
                    </p>
                    <h3>Versiones anteriores</h3>
                    {backups.map((b) => (
                      <div className="record" key={b.id}>
                        <div>
                          <b>
                            {new Date(b.created_at).toLocaleString("es-MX")}
                          </b>
                          <p>
                            Revisión{" "}
                            {b.revision || "previa al modelo académico"}
                          </p>
                        </div>
                        <button
                          className="secondary"
                          onClick={() =>
                            setModal({
                              kind: "restore",
                              backup: b,
                              revision: db.revision,
                            })
                          }
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      )}
      {modal && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="section-heading">
              <h2 id="modal-title">
                {modal.kind === "edit"
                  ? names[modal.collection]
                  : {
                      approve: "Aprobar sobrecarga",
                      respond: modal.estatus,
                      preview: "Oferta para compartir",
                      delete: "Confirmar eliminación",
                      professorPassword: "Contraseña del profesor",
                      admin: "Cuenta de acceso",
                      adminDelete: "Eliminar administrador",
                      import: "Reemplazar programación",
                      clearHistory: "Borrar historial",
                      restore: "Restaurar respaldo",
                    }[modal.kind]}
              </h2>
              <button
                className="plain"
                aria-label="Cerrar"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                ✕
              </button>
            </div>
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            {modal.kind === "edit" ? (
              <Editor
                modal={modal}
                semestre={sem}
                allowedOfferIds={admin ? null : coordinatedIds}
                db={db}
                busy={busy || !online}
                onSave={(item) =>
                  run(async () => {
                    await act(
                      "/academic/save",
                      { collection: modal.collection, item },
                      modal.revision,
                    );
                    setModal(null);
                  })
                }
              />
            ) : modal.kind === "preview" ? (
              <>
                <pre>{modal.text}</pre>
                <button
                  onClick={() =>
                    run(async () => {
                      await navigator.clipboard.writeText(modal.text);
                      setNotice("Oferta copiada.");
                    })
                  }
                >
                  Copiar oferta
                </button>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = Object.fromEntries(new FormData(e.target));
                  run(async () => {
                    if (modal.kind === "clearHistory") await act("/academic/history/clear",{categoria:modal.categoria,confirmacion:values.confirmacion},modal.revision);
                    if (modal.kind === "approve")
                      await act(
                        "/academic/approve",
                        {
                          profesor: modal.profesor,
                          semestre: sem,
                          motivo: values.motivo,
                        },
                        modal.revision,
                      );
                    if (modal.kind === "respond")
                      await act(
                        "/academic/respond",
                        {
                          ids: modal.ids,
                          estatus: modal.estatus,
                          comentarios: values.comentarios || "",
                        },
                        modal.revision,
                      );
                    if (modal.kind === "delete")
                      await act(
                        "/academic/delete",
                        { collection: modal.collection, id: modal.item.id },
                        modal.revision,
                      );
                    if (modal.kind === "professorPassword")
                      await act(
                        "/academic/professor-password",
                        { profesor: modal.profesor, password: values.password },
                        modal.revision,
                      );
                    if (modal.kind === "admin") {
                      await act("/academic/admin", values, modal.revision);
                      setMe(await api("/me"));
                    }
                    if (modal.kind === "adminDelete")
                      await act(
                        "/academic/admin",
                        { id: modal.item.id, remove: true },
                        modal.revision,
                      );
                    if (modal.kind === "restore")
                      await act(
                        "/academic/restore",
                        { id: modal.backup.id },
                        modal.revision,
                      );
                    if (modal.kind === "import") {
                      const f = new FormData();
                      f.append("file", modal.file);
                      f.append("revision", String(modal.revision));
                      await api("/academic/import", f);
                      await refresh();
                      setNotice(
                        "Importación validada. Revisa los borradores antes de publicar.",
                      );
                    }
                    setModal(null);
                  });
                }}
              >
                {modal.kind === "clearHistory" && <label>Descarga antes el TXT. Escribe BORRAR HISTORIAL para eliminar {modal.categoria||"todas las categorías"}.<input name="confirmacion" required autoComplete="off"/></label>}
                {modal.kind === "approve" && (
                  <label>
                    Justificación obligatoria
                    <textarea
                      name="motivo"
                      required
                      maxLength={2000}
                      rows={4}
                    />
                  </label>
                )}
                {modal.kind === "respond" && (
                  <>
                    <p>
                      La respuesta se aplicará a {modal.ids.length}{" "}
                      asignación(es).
                    </p>
                    {modal.estatus === "Cambio Solicitado" && (
                      <label>
                        Observaciones o conflicto de horario
                        <textarea
                          name="comentarios"
                          required
                          maxLength={2000}
                          rows={5}
                        />
                      </label>
                    )}
                  </>
                )}
                {modal.kind === "delete" && (
                  <p>
                    ¿Eliminar{" "}
                    {modal.item.nombre || modal.item.clave || modal.item.id}? Si
                    es una oferta, también se eliminarán sus participaciones,
                    coordinación y sesiones. Los registros con otras
                    dependencias no se pueden eliminar.
                  </p>
                )}
                {modal.kind === "adminDelete" && (
                  <p>
                    ¿Eliminar el acceso de {modal.item.nombre}? No puedes
                    eliminar tu cuenta actual ni la última cuenta.
                  </p>
                )}
                {modal.kind === "professorPassword" && (
                  <>
                    <p>
                      Usuario: <b>{find("profesores", modal.profesor)?.correo}</b>. Comparte la contraseña personalmente; no
                      aparecerá en exportaciones ni en el historial.
                    </p>
                    <label>
                      Nueva contraseña
                      <input
                        type="password"
                        name="password"
                        required
                        minLength={12}
                        maxLength={200}
                        autoComplete="new-password"
                      />
                    </label>
                    <p>
                      Las sesiones anteriores del profesor dejarán de funcionar
                      al restablecerla.
                    </p>
                  </>
                )}
                {modal.kind === "admin" && (
                  <>
                    {modal.item && <input type="hidden" name="combinar" value="1"/>}
                    <label>
                      Usuario
                      <input
                        name="id"
                        required
                        defaultValue={modal.item?.id || modal.suggestedId}
                        readOnly={!!modal.item}
                      />
                    </label>
                    <label>
                      Nombre
                      <input
                        name="nombre"
                        required
                        defaultValue={modal.item?.nombre || modal.suggestedNombre}
                      />
                    </label>
                    <label htmlFor="account-role">
                      Rol
                      {modal.item?.role === "superadmin" && <input type="hidden" name="role" value="superadmin"/>}
                      <select
                        id="account-role"
                        aria-label="Rol"
                        name={modal.item?.role === "superadmin" ? undefined : "role"}
                        disabled={modal.item?.role === "superadmin"}
                        defaultValue={modal.item?.role || "consulta"}
                      >
                        <option value="superadmin" disabled>Superadministrador permanente</option>
                        <option value="profesor">Profesor</option>
                        <option value="admin" disabled={!superAdmin && !!db.admins.length}>
                          Administrador · gestión completa
                        </option>
                        <option value="consulta">
                          Consulta · solo lectura
                        </option>
                      </select>
                    </label>
                    <label>
                      Combinar con perfil de profesor (opcional)
                      <select name="profesor" defaultValue={modal.item?.profesor || modal.profesor || ""}>
                        <option value="">Sin vinculación docente</option>
                        {db.profesores.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.id}</option>)}
                      </select>
                    </label>
                    {modal.item?.role === "superadmin" && <p className="muted">La vinculación docente conserva tu rol y todos tus permisos de superadministrador. Solo tú puedes editar esta cuenta.</p>}
                    <p className="muted">Selecciona el profesor que corresponde a esta cuenta. Se reutilizan su perfil y asignaciones, sin crear otro docente. La cuenta administrativa conserva su contraseña; también podrá entrar con el correo del perfil vinculado.</p>
                    <label>
                      Contraseña{" "}
                      {modal.item ? "(vacía para conservar la actual)" : ""}
                      <input
                        type="password"
                        name="password"
                        minLength={12}
                        maxLength={200}
                        required={!modal.item}
                        autoComplete="new-password"
                      />
                    </label>
                    <p>
                      Si cambias tu propia contraseña tendrás que iniciar sesión
                      nuevamente.
                    </p>
                  </>
                )}
                {modal.kind === "restore" && (
                  <p>
                    Se recuperarán los datos del{" "}
                    {new Date(modal.backup.created_at).toLocaleString("es-MX")}.
                    Se conservarán las cuentas y el historial actuales. Las
                    ofertas volverán a borrador para revisión y nueva
                    aprobación.
                  </p>
                )}
                {modal.kind === "import" && (
                  <p>
                    Se reemplazará la programación con <b>{modal.file.name}</b>.
                    Las ofertas quedarán como borradores y las aprobaciones de
                    sobrecarga se reiniciarán. Exporta primero un respaldo.
                  </p>
                )}
                <button className="primary" disabled={busy || !online}>
                  {busy
                    ? "Guardando…"
                    : modal.kind === "respond"
                      ? "Confirmar respuesta"
                      : "Confirmar"}
                </button>
              </form>
            )}
          </section>
        </div>
      )}
      <footer>
        COORDINACIÓN ACADÉMICA <span>Docencia, coordinación y comunidad.</span>
      </footer>
    </>
  );
}
function Editor({ modal, db, semestre, allowedOfferIds, busy, onSave }) {
  const { collection, item } = modal;
  const [values, setValues] = useState({ ...item });
  const [formError,setFormError] = useState("");
  const partial = ["ofertas","sesiones"].includes(collection);
  const change = (key, v) => setValues((x) => ({ ...x, [key]: v, ...(collection === "ofertas" && ["duracion","modalidad"].includes(key) ? {periodos:"",...(key === "modalidad" ? {duracion:v === "Intensiva" ? 1 : 5} : {})} : {}) }));
  const field = (
    key,
    label,
    {
      type = "text",
      options,
      required = !partial || ["oferta","uf","semestre"].includes(key),
      readOnly = false,
      hint,
      defaultValue = "",
    } = {},
  ) => key === "horario" ? <TimeRangePicker key={key} label={label} required={!partial} value={values[key] || ""} onChange={(v)=>change(key,v)}/> : (
    <label key={key}>
      {label}
      {options ? (
        <select
          aria-label={label}
          required={required}
          value={values[key] ?? defaultValue}
          onChange={(e) => change(key, e.target.value)}
        >
          <option value="">Selecciona…</option>
          {options.map((o) => (
            <option
              key={typeof o === "string" ? o : o.value}
              value={typeof o === "string" ? o : o.value}
            >
              {typeof o === "string" ? o : o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label={label}
          required={required}
          readOnly={readOnly}
          type={type}
          min={type === "number" ? (key === "capacidad" ? 1 : ["porcentaje","udc_maximas"].includes(key) || (key === "udc" && collection === "prestamos") ? 0.01 : 0) : undefined}
          step={type === "number" ? (["capacidad","alumnos"].includes(key) ? "1" : "0.01") : undefined}
          max={key === "porcentaje" ? 100 : undefined}
          value={values[key] ?? defaultValue}
          onChange={(e) => change(key, e.target.value)}
        />
      )}{" "}
      {hint && <small>{hint}</small>}
    </label>
  );
  const options = (k) =>
    db[k].map((x) => ({
      value: x.id,
      label: (x.nombre || x.clave) + " · " + x.id,
    }));
  const selected = db.ofertas.find((o) => o.id === values.oferta);
  const participants = db.participaciones.filter(
    (p) => p.oferta === values.oferta,
  );
  const remaining = Math.max(0, 100 - participants
    .filter((p) => p.id !== item.id)
    .reduce((sum, p) => sum + Number(p.porcentaje), 0));
  const assignmentOffers = db.ofertas.filter((o) => (o.semestre === semestre || o.id === values.oferta) && (!allowedOfferIds || allowedOfferIds.includes(o.id)));
  const multi = (key, label, opts) => (
    <fieldset>
      <legend>{label}</legend>
      <div className="checks">
        {opts.map((x) => {
          const value = typeof x === "string" ? x : x.value;
          const label = typeof x === "string" ? x : x.label;
          return (
            <label key={value}>
              <input
                type="checkbox"
                checked={split(values[key]).includes(value)}
                onChange={(e) => {
                  const set = new Set(split(values[key]));
                  e.target.checked ? set.add(value) : set.delete(value);
                  change(key, [...set].join(","));
                }}
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFormError("");
        if (collection === "semestres" && !values.inicio) { setFormError("Elige un lunes en el calendario para definir el inicio del semestre."); return; }
        if (!partial && values.horario && values.horario.slice(0,5) >= values.horario.slice(6)) { setFormError("La hora de fin debe ser posterior al inicio. Corrige el horario antes de guardar."); return; }
        const defaults = {};
        if (collection === "profesores") defaults.tipo = "Cátedra";
        if (collection === "semestres") {defaults.escuela="AD-Arquitectura, Arte y Diseño";defaults.identificador=item.id==="FJ27"?"202711":"";}
        if (collection === "ufs") {
          defaults.atributos = "PMT3";
          defaults.tipo = "Materia";
          defaults.udc = 0;
        }
        if (collection === "ofertas") {
          defaults.modalidad = "Ordinaria";
          defaults.duracion = 5;
          defaults.periodos = "P1";
          defaults.udc = db.ufs.find((u) => u.id === values.uf)?.udc ?? 0;
        }
        if (collection === "participaciones") defaults.porcentaje = remaining;
        if (collection === "coordinaciones") defaults.udc = 0;
        onSave({ ...defaults, ...values, id: item.id || values.id });
      }}
    >
      {partial && <p className="alert">Puedes guardar datos parciales como borrador. Completa y revisa las sesiones antes de publicar; no se borrarán al cambiar los periodos del grupo.</p>}
      {formError && <p className="alert error" role="alert">{formError}</p>}
      {["profesores", "ufs", "semestres"].includes(collection) &&
        field(
          "id",
          collection === "profesores"
            ? "Usuario"
            : collection === "ufs"
              ? "Clave UF"
              : collection === "salones" ? "Clave del salón" : "Identificador del semestre",
          { readOnly: !!item.id },
        )}
      {["profesores", "ufs", "semestres"].includes(collection) &&
        field("nombre", "Nombre")}
      {collection === "profesores" && (
        <>
          {field("correo", "Correo institucional", { type: "email" })}
          {field("nomina", "Nómina para formato de entrega", {required:false,hint:"Independiente del usuario y correo de acceso."})}
          {field("tipo", "Tipo de contrato", {
            options: ["Cátedra", "Planta", "Cátedra interna", "Préstamo", "Por clasificar"],
            defaultValue: "Cátedra",
            hint: "Cátedra: 10 UDC. Planta: 14 UDC. Topes semestrales incluyendo coordinación.",
          })}
          {values.tipo==="Préstamo" && field("area","Área de origen")}
          {["Cátedra interna","Préstamo"].includes(values.tipo) && field("udc_maximas","Tope semestral de UDC",{type:"number",hint:"Indica el tope autorizado para este profesor. No se asume un valor por defecto."})}
        </>
      )}
      {collection === "ufs" && (
        <>
          {field("atributos", "Atributos de la UF", {defaultValue:"PMT3",required:false,hint:"Puedes editar o agregar atributos separados por coma; ejemplo PMT3,INGL."})}
          {field("tipo", "Tipo de UF", {
            options: ["Materia", "Bloque"],
            defaultValue: "Materia",
          })}
          {field("udc", "UDC base de la UF", {
            type: "number",
            defaultValue: 0,
          })}
        </>
      )}
      {collection === "salones" && <>
        {field("edificio", "Edificio", { hint: "Ejemplo: CEDES o Aulas 6." })}
        <label>Código de salón para entrega<input aria-label="Código de salón para entrega" list="official-room-codes" value={values.codigo||""} onChange={e=>change("codigo",e.target.value)}/><small>Conserva espacios y guiones: por ejemplo A-A6- 206. Puedes buscar en el catálogo de referencia o capturar un código oficial actualizado.</small></label>
        <datalist id="official-room-codes">{roomCodes.map(r=><option key={r.codigo} value={r.codigo}>{r.descripcion}</option>)}</datalist>
        {values.codigo && !roomCodes.some(r=>r.codigo===values.codigo) && <p className="muted">Este código no aparece en el catálogo de referencia. Verifícalo con Escolar; el catálogo puede no incluir salones nuevos.</p>}
        {field("numero", "Número de salón", { hint: "Ejemplo: 319 o 206; también admite letras." })}
        <p>Salón: <b>{values.edificio || "Edificio"}-{values.numero || "Número"}</b>. Su referencia interna se conserva al editar.</p>
        {field("capacidad", "Capacidad de alumnos", { type: "number", hint: "Número entero mayor a cero." })}
        {multi("dias", "Días de trabajo", days)}
        {field("horario", "Horario de trabajo", { hint: "Formato de 24 horas: 07:00-22:00. Un rango por día seleccionado." })}
      </>}
      {collection === "semestres" && <>
        {field("identificador","Identificador del periodo para entrega",{defaultValue:item.id==="FJ27"?"202711":"",required:false,hint:"Manual: FJ 2027 = 202711; AD 2027 = 202713. Verifica cuál corresponde antes de entregar; no cambia la clave interna del semestre."})}
        {field("escuela","Escuela TEC",{defaultValue:"AD-Arquitectura, Arte y Diseño",required:false})}
        <SemesterDatePicker value={values.inicio || ""} onChange={(v)=>change("inicio",v)}/>
        <p>Fechas de los periodos para calendario y formato de entrega. Si dejas un campo vacío se calcula desde el inicio del semestre; las fechas capturadas tienen prioridad.</p>
        {segments.map((id,i)=>{const date=(suffix)=>{if(values[id+"_"+suffix])return values[id+"_"+suffix];if(!values.inicio)return "";const d=new Date(values.inicio+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+[0,35,42,77,84][i]+(suffix==="fin"?([1,3].includes(i)?4:34):0));return d.toISOString().slice(0,10);};return <fieldset key={id}><legend>{labels[id]}</legend><div className="time-fields">{["inicio","fin"].map(suffix=><label key={suffix}>{suffix==="inicio"?"Fecha inicio":"Fecha fin"} · {id}<input type="date" value={date(suffix)} onChange={e=>change(id+"_"+suffix,e.target.value)}/></label>)}</div></fieldset>})}
      </>}
      {collection === "prestamos" && <>
        {field("profesor","Profesor",{options:options("profesores")})}
        {field("semestre","Semestre",{options:options("semestres")})}
        {field("departamento","Departamento de destino")}
        {field("udc","UDC de préstamo",{type:"number",hint:"Consumen el tope de 10/14 UDC del semestre. No captures aquí carga que ya esté contabilizada en un grupo local."})}
        {field("comentarios","Observaciones",{required:false})}
      </>}
      {collection === "ofertas" && (
        <>
          {field("alumnos", "Número de alumnos del grupo", { type: "number", defaultValue: 0, hint: "Requerido antes de publicar clases en salones registrados." })}
          {field("clave", "Clave única de la oferta", {
            hint: "Independiente del grupo. Debe ser única dentro del semestre.",
          })}
          {field("grupo", "Número de grupo", {
            hint: "Ejemplo: 102. Bases: P1=100, P2=200, P3=300, P1–P2=300, P2–P3=500. Independiente de la clave.",
          })}
          {field("semestre", "Semestre", { options: options("semestres") })}
          {field("uf", "Unidad de formación", { options: options("ufs") })}
          {field("modalidad", "Modalidad", {
            options: ["Ordinaria", "Intensiva"],
            defaultValue: "Ordinaria",
          })}
          {field("duracion", "Duración en semanas", {
            options: (values.modalidad === "Intensiva" ? [1] : [5, 10, 15]).map(
              (n) => ({ value: n, label: n + " semana(s)" }),
            ),
            defaultValue: 5,
          })}
          {field("periodos", "Periodos de impartición", {
            options:
              values.modalidad === "Intensiva"
                ? ["I1", "I2"]
                : Number(values.duracion || 5) === 10
                  ? ["P1,P2", "P2,P3"]
                  : Number(values.duracion || 5) === 15
                    ? ["P1,P2,P3"]
                    : ["P1", "P2", "P3"],
            defaultValue: "P1",
          })}
          {field("udc", "UDC base de este grupo", {
            type: "number",
            defaultValue: db.ufs.find((u) => u.id === values.uf)?.udc ?? 0,
            hint: "No se multiplican por el número de periodos.",
          })}
          <p>
            Los códigos de grupo se capturan manualmente, incluso para 15
            semanas e intensivas. Guardar cambios vuelve la oferta a borrador.
          </p>
        </>
      )}
      {["participaciones", "coordinaciones", "sesiones"].includes(collection) &&
        field("oferta", "Oferta / grupo", {
          options: assignmentOffers.map((o) => ({
            value: o.id,
            label: `${db.ufs.find((u) => u.id === o.uf)?.nombre || o.uf} · Grupo ${o.grupo || "—"} · Clave ${o.clave} · ${o.periodos}`,
          })),
          readOnly: !!item.id,
        })}
      {["participaciones", "coordinaciones"].includes(collection) &&
        field("profesor", "Profesor", { options: options("profesores") })}
      {collection === "participaciones" && (
        <>
          {!assignmentOffers.length && <p role="status">Primero crea una oferta / grupo en Ofertas para este semestre.</p>}
          {field("porcentaje", "Responsabilidad (%)", {
            type: "number",
            defaultValue: remaining,
            hint: "El total debe sumar 100 % por grupo antes de publicar. La responsabilidad se mantiene durante toda la UF.",
          })}
          {selected && <p className="muted">
            Disponible: {fmt(remaining)} % · Carga de esta asignación: {fmt(Number(selected.udc) * Number(values.porcentaje ?? remaining) / 100)} UDC.
            Guardar deja la oferta en borrador para revisión.
          </p>}
        </>
      )}
      {collection === "coordinaciones" &&
        field("udc", "UDC adicionales de coordinación", {
          type: "number",
          defaultValue: 0,
          hint: "Solo bloques. El coordinador puede participar también como docente.",
        })}
      {collection === "sesiones" && (
        <>
          {multi(
            "profesores",
            "Profesores de esta sesión",
            participants.map((p) => ({
              value: p.profesor,
              label:
                db.profesores.find((x) => x.id === p.profesor)?.nombre ||
                p.profesor,
            })),
          )}
          {multi(
            "segmentos",
            "Segmentos de impartición",
            split(selected?.periodos),
          )}
          {multi(
            "dias",
            "Días",
            selected?.modalidad === "Intensiva" ? days.slice(0, 5) : days,
          )}
          {field("horario", "Horario", {
            hint: "Formato de 24 horas: 09:00-13:00",
          })}
          {field("aula", "Aula", db.salones.length ? { options: [
            ...db.salones.map((r) => ({ value:r.id, label:`${r.nombre} · ${r.capacidad} alumnos · ${r.dias} ${r.horario}` })),
            ...(values.aula && !db.salones.some((r) => r.id === values.aula) ? [{value:values.aula, label:values.aula + " (pendiente de registrar)"}] : []),
          ] } : { hint: "Registra el salón en Salones para controlar capacidad y disponibilidad." })}
        </>
      )}
      <button className="primary" disabled={busy}>
        {busy ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js").then((reg) => {
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker?.addEventListener("statechange", () => {
        if (
          worker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          const n = document.createElement("button");
          n.textContent = "Nueva versión disponible. Recargar";
          n.className = "update-banner";
          n.onclick = () => location.reload();
          document.body.append(n);
        }
      });
    });
  });
}
