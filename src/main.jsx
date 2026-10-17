import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource-variable/sora";
import "./style.css";
import "./theme.css";
import { Brand, Icon, SemesterIllustration, navIcons } from "./visual.jsx";
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
    [role, setRole] = useState("profesor"),
    [sem, setSem] = useState(""),
    [tab, setTab] = useState("Inicio"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [acceptance, setAcceptance] = useState(""),
    [type, setType] = useState(""),
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
      setError(e.message);
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
      .catch((e) => setError(e.message));
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
    if (tab === "Datos" && me?.role === "admin")
      api("/academic/backups")
        .then(setBackups)
        .catch((e) => setError(e.message));
  }, [tab, db?.revision]);
  const admin = me?.role === "admin";
  const readAll = admin || me?.role === "consulta";
  const find = (collection, id) => db?.[collection]?.find((x) => x.id === id);
  const u = (o) => find("ufs", o.uf);
  const offers = db?.ofertas.filter((o) => o.semestre === sem) || [];
  const parts =
    db?.participaciones.filter((p) => offers.some((o) => o.id === p.oferta)) ||
    [];
  const sessions =
    db?.sesiones.filter((s) => offers.some((o) => o.id === s.oferta)) || [];
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
          role,
          token: new URLSearchParams(location.search).get("token") || "",
        }),
      );
      history.replaceState({}, "", location.pathname);
    });
  };
  const menu = admin
    ? [
        "Inicio",
        "Profesores",
        "Unidades de formación",
        "Ofertas",
        "Solicitudes",
        "Usuarios y permisos",
        "Historial",
        "Datos",
      ]
    : me?.role === "consulta"
      ? ["Inicio", "Profesores", "Unidades de formación", "Ofertas"]
      : ["Inicio", "Mi horario", "Mis respuestas"];
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
              setTab(readAll ? "Ofertas" : "Mis respuestas");
            }}
          >
            Ver asignación →
          </button>
          {admin && (
            <button className="plain" onClick={() => open("ofertas", o)}>
              Editar
            </button>
          )}
        </div>
      </article>
    );
  }
  function offerDetail(o) {
    const ps = db.participaciones.filter((p) => p.oferta === o.id);
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
          {admin && (
            <button
              className="secondary"
              onClick={() => open("participaciones", { oferta: o.id })}
            >
              + Profesor
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
                {(admin || me.role === "profesor") &&
                  (admin ? (
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
          </span>
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
          <div className="buttons">
            <button className="secondary" onClick={() => open("profesores", p)}>
              Editar
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => notify(p)}
            >
              Compartir oferta
            </button>
            {w.estado === "Sobrecarga pendiente" && (
              <button
                onClick={() =>
                  setModal({
                    kind: "approve",
                    profesor: p.id,
                    revision: db.revision,
                  })
                }
              >
                Aprobar sobrecarga
              </button>
            )}
            <button className="plain" onClick={() => remove("profesores", p)}>
              Eliminar
            </button>
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
            <h2>{readAll ? "Distribución de horarios" : "Mi horario"}</h2>
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
                          setTab(readAll ? "Ofertas" : "Mis respuestas");
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
              <p className="login-card__intro">
                Selecciona tu perfil para continuar.
              </p>
              <div className="tabs">
                {["profesor", "admin", "consulta"].map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={role === r ? "active" : ""}
                    onClick={() => setRole(r)}
                  >
                    {r === "admin"
                      ? "Administrador"
                      : r === "consulta"
                        ? "Consulta"
                        : "Profesor"}
                  </button>
                ))}
              </div>
              <label>
                {role !== "profesor"
                  ? "Usuario"
                  : "Nómina o correo institucional"}
                <input
                  name="identifier"
                  defaultValue={
                    role === "profesor"
                      ? new URLSearchParams(location.search).get("nomina") || ""
                      : ""
                  }
                  key={role}
                  required={role !== "admin"}
                  autoComplete="username"
                  placeholder={
                    role === "admin"
                      ? "Vacío solo para configuración inicial"
                      : "Tu nómina o correo"
                  }
                />
              </label>
              {role !== "profesor" && (
                <label>
                  Contraseña
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                  />
                </label>
              )}
              <button
                className="primary"
                disabled={busy || !online || me === null}
              >
                {busy ? "Ingresando…" : "Ingresar →"}
              </button>
              <p className="muted">
                {role === "profesor"
                  ? "Abre el enlace privado que compartió tu administrador. Si venció o ya lo utilizaste, solicita uno nuevo."
                  : "Usa tu cuenta individual. El acceso inicial se configura con el responsable del sistema."}
              </p>
              {!config.production && (
                <p className="muted">
                  Demostración local: L001, L002 o L003. Contraseña inicial de
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
                            sub="Incluye coordinación e intensivas"
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
                            sub="La coordinación está incluida"
                          />
                        </>
                      )}
                    </div>
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
                        placeholder="Buscar nombre o nómina"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <select
                        aria-label="Tipo de profesor"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        <option value="">Todos los tipos</option>
                        {["Cátedra", "Planta", "Por clasificar"].map((t) => (
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
                        {["Pendiente", "Aceptada", "Cambio Solicitado"].map(
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
                              parts.some(
                                (x) =>
                                  x.profesor === p.id &&
                                  x.estatus === acceptance,
                              )) &&
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
                            <h3>{u.nombre}</h3>
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
                {["Ofertas", "Mis respuestas"].includes(tab) && (
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
                          {filteredOffers.map(offerCard)}
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
                            {(a.role || "admin") === "consulta"
                              ? "Consulta · Solo lectura"
                              : "Administrador"}
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
                    <h2>Registro de cambios</h2>
                    {db.auditoria
                      .slice()
                      .reverse()
                      .map((a) => (
                        <div className="record" key={a.id}>
                          <div>
                            <b>{a.accion}</b>
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
                    <div className="buttons bulk">
                      <a className="button" href="/api/academic/export">
                        Descargar Excel / plantilla
                      </a>
                      <a
                        className="button secondary"
                        href="/api/academic/backup"
                      >
                        Exportar respaldo JSON
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
                      preview: "Oferta y enlace privado",
                      delete: "Confirmar eliminación",
                      admin: "Cuenta de acceso",
                      adminDelete: "Eliminar administrador",
                      import: "Reemplazar programación",
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
                {modal.kind === "admin" && (
                  <>
                    <label>
                      Usuario
                      <input
                        name="id"
                        required
                        defaultValue={modal.item?.id}
                        readOnly={!!modal.item}
                      />
                    </label>
                    <label>
                      Nombre
                      <input
                        name="nombre"
                        required
                        defaultValue={modal.item?.nombre}
                      />
                    </label>
                    <label>
                      Rol
                      <select
                        name="role"
                        defaultValue={modal.item?.role || "admin"}
                      >
                        <option value="admin">
                          Administrador · gestión completa
                        </option>
                        <option value="consulta">
                          Consulta · solo lectura
                        </option>
                      </select>
                    </label>
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
function Editor({ modal, db, busy, onSave }) {
  const { collection, item } = modal;
  const [values, setValues] = useState({ ...item });
  const change = (key, v) => setValues((x) => ({ ...x, [key]: v }));
  const field = (
    key,
    label,
    {
      type = "text",
      options,
      required = true,
      readOnly = false,
      hint,
      defaultValue = "",
    } = {},
  ) => (
    <label key={key}>
      {label}
      {options ? (
        <select
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
          required={required}
          readOnly={readOnly}
          type={type}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "0.01" : undefined}
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
        const defaults = {};
        if (collection === "profesores") defaults.tipo = "Cátedra";
        if (collection === "ufs") {
          defaults.tipo = "Materia";
          defaults.udc = 0;
        }
        if (collection === "ofertas") {
          defaults.modalidad = "Ordinaria";
          defaults.duracion = 5;
          defaults.periodos = "P1";
          defaults.udc = db.ufs.find((u) => u.id === values.uf)?.udc ?? 0;
        }
        if (collection === "participaciones") defaults.porcentaje = 100;
        if (collection === "coordinaciones") defaults.udc = 0;
        onSave({ ...defaults, ...values, id: item.id || values.id });
      }}
    >
      {["profesores", "ufs", "semestres"].includes(collection) &&
        field(
          "id",
          collection === "profesores"
            ? "Nómina"
            : collection === "ufs"
              ? "Clave UF"
              : "Identificador del semestre",
          { readOnly: !!item.id },
        )}
      {["profesores", "ufs", "semestres"].includes(collection) &&
        field("nombre", "Nombre")}
      {collection === "profesores" && (
        <>
          {field("correo", "Correo institucional", { type: "email" })}
          {field("tipo", "Tipo de contrato", {
            options: ["Cátedra", "Planta"],
            defaultValue: "Cátedra",
            hint: "Cátedra: 10 UDC. Planta: 14 UDC. Topes semestrales incluyendo coordinación.",
          })}
        </>
      )}
      {collection === "ufs" && (
        <>
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
      {collection === "semestres" &&
        field("inicio", "Lunes de inicio del semestre", {
          type: "date",
          hint: "Se generan tres periodos de 5 semanas y dos semanas intermedias. Duración calendario: 17 semanas.",
        })}
      {collection === "ofertas" && (
        <>
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
          options: options("ofertas"),
          readOnly: !!item.id,
        })}
      {["participaciones", "coordinaciones"].includes(collection) &&
        field("profesor", "Profesor", { options: options("profesores") })}
      {collection === "participaciones" &&
        field("porcentaje", "Responsabilidad (%)", {
          type: "number",
          defaultValue: 100,
          hint: "Hasta dos decimales. Debe sumar 100 % por grupo antes de publicar.",
        })}
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
          {field("aula", "Aula")}
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
