import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
async function api(url, body) {
  const r = await fetch("/api" + url, {
    method: body ? "POST" : "GET",
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || "No se pudo completar la operación");
  return data;
}
const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function App() {
  const [me, setMe] = useState(null),
    [db, setDb] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [role, setRole] = useState("profesor"),
    [search, setSearch] = useState(""),
    [load, setLoad] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState(""),
    [view, setView] = useState("semana"),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const refresh = async () => setDb(await api("/data"));
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
  useEffect(() => {
    api("/me")
      .then(setMe)
      .catch((e) => setError(e.message));
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (me?.role) run(refresh);
  }, [me?.role]);
  useEffect(() => {
    if (!me?.role) return;
    const id = setInterval(
      () =>
        api("/data")
          .then(setDb)
          .catch(() => {}),
      15000,
    );
    return () => clearInterval(id);
  }, [me?.role]);
  const login = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    run(async () => {
      setMe(
        await api("/login", {
          ...data,
          role,
          token: new URLSearchParams(location.search).get("token") || "",
        }),
      );
      history.replaceState({}, "", location.pathname);
    });
  };
  const matter = (id) => db.Materias.find((m) => m.id_materia === id);
  const classes = (p) =>
    db.Clases_Asignadas.filter((c) => c.nomina_profesor === p.nomina);
  const udc = (p) =>
    classes(p).reduce((n, c) => n + (matter(c.id_materia)?.udc || 0), 0);
  const tag = (s) => (
    <span
      className={
        "tag " +
        (s === "Aceptada"
          ? "good"
          : s === "Cambio Solicitado"
            ? "warn"
            : "pending")
      }
    >
      {s}
    </span>
  );
  const respond = (ids, estatus) =>
    estatus === "Cambio Solicitado"
      ? setModal({ type: "change", ids })
      : run(async () => {
          await api("/respond", { ids, estatus });
          await refresh();
          setNotice("Respuesta guardada en el Excel.");
        });
  function classList(list, actions = false) {
    return (
      <div className="class-list">
        {!list.length && <p className="empty">No hay clases asignadas.</p>}
        {list.map((c) => (
          <article className="class-card" key={c.id_clase}>
            <div>
              <small>
                {c.id_clase} · {matter(c.id_materia)?.udc} UDC
              </small>
              <h3>{matter(c.id_materia)?.nombre_materia}</h3>
              <p>
                {c.dias.replaceAll(",", " · ")} / {c.horario}
              </p>
              <p>
                {c.aula}{" "}
                {me.role === "admin" &&
                  " · " +
                    db.Profesores.find((p) => p.nomina === c.nomina_profesor)
                      ?.nombre}
              </p>
              {c.comentarios && <blockquote>{c.comentarios}</blockquote>}
            </div>
            <div className="class-actions">
              {tag(c.estatus)}
              {actions && (
                <>
                  <button
                    disabled={busy || !online}
                    onClick={() => respond([c.id_clase], "Aceptada")}
                  >
                    Aceptar
                  </button>
                  <button
                    className="ghost"
                    disabled={busy || !online}
                    onClick={() => respond([c.id_clase], "Cambio Solicitado")}
                  >
                    Solicitar cambio
                  </button>
                </>
              )}
              {me.role === "admin" && (
                <button
                  className="ghost"
                  onClick={() => setModal({ type: "class", item: c })}
                >
                  Editar
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    );
  }
  return (
    <>
      <header>
        <a className="brand" href="/">
          A
          <span>
            ARTE <b>/ FJ27</b>
          </span>
        </a>
        <div className="header-right">
          <span className="term">FEBRERO — JUNIO 2027</span>
          {me?.role && (
            <button
              className="light"
              onClick={() =>
                run(async () => {
                  await api("/logout", {});
                  setMe({ role: null });
                  setDb(null);
                  setSelected("");
                })
              }
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </header>
      {!online && (
        <div className="offline">
          Sin conexión. Las consultas y respuestas requieren internet.
        </div>
      )}
      <main>
        {error && (
          <div role="alert" className="alert error">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {notice && (
          <div role="status" className="alert">
            {notice}
            <button onClick={() => setNotice("")}>×</button>
          </div>
        )}
        {!me ? (
          <p>Cargando…</p>
        ) : !me.role ? (
          <section className="login">
            <div>
              <span className="eyebrow">ESCUELA DE ARTE Y DISEÑO</span>
              <h1>
                El próximo semestre
                <br />
                <em>empieza aquí.</em>
              </h1>
              <p>
                Tu programación académica, en un solo lugar.
                <br />
                Consulta, revisa y confirma tus clases para FJ27.
              </p>
              <div className="art">
                <span>
                  FJ
                  <br />
                  27
                </span>
                <i>CREAR · CONECTAR · ENSEÑAR</i>
              </div>
            </div>
            <form onSubmit={login} className="login-card">
              <span className="eyebrow">BIENVENIDO</span>
              <h2>Accede a tu espacio</h2>
              <div className="tabs">
                {["profesor", "admin"].map((r) => (
                  <button
                    type="button"
                    className={role === r ? "active" : ""}
                    onClick={() => setRole(r)}
                    key={r}
                  >
                    {r === "admin" ? "Administrador" : "Profesor"}
                  </button>
                ))}
              </div>
              {role === "profesor" ? (
                <label>
                  Nómina o correo institucional
                  <input
                    name="identifier"
                    required
                    defaultValue={
                      new URLSearchParams(location.search).get("nomina") || ""
                    }
                    placeholder="L001 / nombre@institucion.edu"
                  />
                </label>
              ) : (
                <label>
                  Contraseña de administrador
                  <input
                    type="password"
                    name="password"
                    required
                    autoComplete="current-password"
                  />
                </label>
              )}
              <button disabled={busy || !online} className="primary">
                {busy ? "Entrando…" : "Ingresar →"}
              </button>
              <p className="hint">
                Demostración: profesor L001, L002 o L003. Administrador:
                admin-demo. En producción usa el enlace de tu correo.
              </p>
            </form>
          </section>
        ) : !db ? (
          <p>Cargando programación…</p>
        ) : (
          <>
            <div className="page-title">
              <div>
                <span className="eyebrow">PROGRAMACIÓN ACADÉMICA / FJ27</span>
                <h1>
                  {me.role === "admin"
                    ? "Una mirada al semestre."
                    : `Hola, ${db.Profesores[0]?.nombre.split(" ")[0]}.`}
                </h1>
                <p>
                  {me.role === "admin"
                    ? "Organiza el talento. Da espacio a la creatividad."
                    : "Estas son tus clases. Revisemos el próximo semestre."}
                </p>
              </div>
              <span className="pill">
                ● {me.role === "admin" ? "Administración" : "Mi programación"}
              </span>
            </div>
            {me.role === "admin" ? (
              <>
                <section className="stats">
                  <Stat
                    name="Profesores"
                    value={db.Profesores.length}
                    sub="Talento en el programa"
                  />
                  <Stat
                    name="Clases programadas"
                    value={db.Clases_Asignadas.length}
                    sub="Asignaciones del semestre"
                  />
                  <Stat
                    name="Clases aceptadas"
                    value={`${Math.round((db.Clases_Asignadas.filter((c) => c.estatus === "Aceptada").length / (db.Clases_Asignadas.length || 1)) * 100)}%`}
                    sub={`${db.Clases_Asignadas.filter((c) => c.estatus === "Pendiente").length} pendientes · ${db.Clases_Asignadas.filter((c) => c.estatus === "Cambio Solicitado").length} cambios`}
                  />
                </section>
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>Equipo académico</h2>
                      <p>Carga y seguimiento por profesor</p>
                    </div>
                    <div className="buttons">
                      <button onClick={() => setModal({ type: "professor" })}>
                        + Profesor
                      </button>
                      <button onClick={() => setModal({ type: "class" })}>
                        + Clase
                      </button>
                      <a className="button ghost" href="/api/export">
                        ↓ Excel
                      </a>
                      <label className="button ghost">
                        ↑ Importar
                        <input
                          hidden
                          type="file"
                          accept=".xlsx"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) setModal({ type: "import", file });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="filters">
                    <input
                      aria-label="Buscar profesor"
                      placeholder="Buscar nombre o nómina…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <select
                      aria-label="Estado de carga"
                      value={load}
                      onChange={(e) => setLoad(e.target.value)}
                    >
                      <option value="">Todas las cargas</option>
                      <option>Normal</option>
                      <option>Excedido</option>
                    </select>
                    <select
                      aria-label="Estatus de aceptación"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Todos los estatus</option>
                      {["Pendiente", "Aceptada", "Cambio Solicitado"].map(
                        (s) => (
                          <option key={s}>{s}</option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>PROFESOR / NÓMINA</th>
                          <th>CARGA ACADÉMICA</th>
                          <th>CLASES</th>
                          <th>SEGUIMIENTO</th>
                          <th>ACCIONES</th>
                        </tr>
                      </thead>
                      <tbody>
                        {db.Profesores.filter(
                          (p) =>
                            (p.nombre + " " + p.nomina)
                              .toLowerCase()
                              .includes(search.toLowerCase()) &&
                            (!load ||
                              (udc(p) > p.udc_maximas
                                ? "Excedido"
                                : "Normal") === load) &&
                            (!status ||
                              classes(p).some((c) => c.estatus === status)),
                        ).map((p) => (
                          <tr key={p.nomina}>
                            <td>
                              <div className="person">
                                <span className="avatar">
                                  {p.nombre
                                    .split(" ")
                                    .slice(0, 2)
                                    .map((s) => s[0])
                                    .join("")}
                                </span>
                                <div>
                                  <b>{p.nombre}</b>
                                  <small>
                                    {p.nomina} · {p.correo}
                                  </small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <b
                                className={udc(p) > p.udc_maximas ? "red" : ""}
                              >
                                {udc(p)} / {p.udc_maximas} UDC
                              </b>
                              <div className="meter">
                                <i
                                  style={{
                                    width:
                                      Math.min(
                                        100,
                                        (udc(p) / (p.udc_maximas || 1)) * 100,
                                      ) + "%",
                                    background:
                                      udc(p) > p.udc_maximas ? "#bd5442" : "",
                                  }}
                                />
                              </div>
                              <small>
                                {udc(p) > p.udc_maximas
                                  ? "Excedida"
                                  : "Suficiente / Óptima"}
                              </small>
                            </td>
                            <td>{classes(p).length}</td>
                            <td>
                              <div className="tags">
                                {[
                                  ...new Set(classes(p).map((c) => c.estatus)),
                                ].map((s) => (
                                  <React.Fragment key={s}>
                                    {tag(s)}
                                  </React.Fragment>
                                ))}
                              </div>
                            </td>
                            <td>
                              <div className="buttons">
                                <button
                                  className="ghost"
                                  onClick={() => setSelected(p.nomina)}
                                >
                                  Ver detalle
                                </button>
                                <button
                                  className="ghost"
                                  onClick={() =>
                                    setModal({ type: "professor", item: p })
                                  }
                                >
                                  Editar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                {selected && (
                  <section className="panel">
                    <div className="section-head">
                      <h2>
                        {
                          db.Profesores.find((p) => p.nomina === selected)
                            ?.nombre
                        }
                      </h2>
                      <div className="buttons">
                        <button
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              const r = await api(
                                "/notify/" + encodeURIComponent(selected),
                                {},
                              );
                              if (r.preview)
                                setModal({ type: "preview", text: r.preview });
                              else setNotice("Oferta enviada por correo.");
                            })
                          }
                        >
                          Enviar / compartir oferta
                        </button>
                        <button
                          className="ghost"
                          onClick={() => setSelected("")}
                        >
                          Cerrar
                        </button>
                      </div>
                    </div>
                    {classList(
                      db.Clases_Asignadas.filter(
                        (c) => c.nomina_profesor === selected,
                      ),
                    )}
                  </section>
                )}
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <span className="eyebrow">CONVERSACIONES PENDIENTES</span>
                      <h2>Solicitudes de cambio</h2>
                    </div>
                    <span className="pill">
                      {
                        db.Clases_Asignadas.filter(
                          (c) => c.estatus === "Cambio Solicitado",
                        ).length
                      }{" "}
                      solicitudes
                    </span>
                  </div>
                  {classList(
                    db.Clases_Asignadas.filter(
                      (c) => c.estatus === "Cambio Solicitado",
                    ),
                  )}
                </section>
              </>
            ) : (
              <>
                <section className="stats">
                  <Stat
                    name="UDC asignadas"
                    value={udc(db.Profesores[0])}
                    sub={`Máximo: ${db.Profesores[0].udc_maximas} UDC`}
                  />
                  <Stat
                    name="Materias"
                    value={
                      new Set(db.Clases_Asignadas.map((c) => c.id_materia)).size
                    }
                    sub={`${db.Clases_Asignadas.length} clases asignadas`}
                  />
                  <Stat
                    name="Estado de carga"
                    value={
                      udc(db.Profesores[0]) > db.Profesores[0].udc_maximas
                        ? "Excedida"
                        : "Óptima"
                    }
                    sub="Carga académica semestral"
                  />
                </section>
                <section className="panel">
                  <div className="section-head">
                    <div>
                      <h2>Mi horario</h2>
                      <p>Un espacio para cada idea.</p>
                    </div>
                    <div className="tabs">
                      {["semana", "lista"].map((v) => (
                        <button
                          key={v}
                          className={view === v ? "active" : ""}
                          onClick={() => setView(v)}
                        >
                          {v === "semana" ? "Semana" : "Lista"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {view === "lista" ? (
                    classList(db.Clases_Asignadas, true)
                  ) : (
                    <div className="week">
                      {days.map((d) => (
                        <div className="day" key={d}>
                          <h3>{d}</h3>
                          {db.Clases_Asignadas.filter((c) =>
                            c.dias.split(",").includes(d),
                          )
                            .sort((a, b) => a.horario.localeCompare(b.horario))
                            .map((c) => (
                              <div className="event" key={c.id_clase}>
                                <small>{c.horario}</small>
                                <b>{matter(c.id_materia)?.nombre_materia}</b>
                                <span>{c.aula}</span>
                                {tag(c.estatus)}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="offer-actions">
                    <p>
                      Tu respuesta se guardará en la programación del semestre.
                    </p>
                    <div className="buttons">
                      <button
                        disabled={
                          busy || !online || !db.Clases_Asignadas.length
                        }
                        onClick={() =>
                          respond(
                            db.Clases_Asignadas.map((c) => c.id_clase),
                            "Aceptada",
                          )
                        }
                      >
                        Aceptar todas las clases
                      </button>
                      <button
                        disabled={
                          busy || !online || !db.Clases_Asignadas.length
                        }
                        className="ghost"
                        onClick={() =>
                          respond(
                            db.Clases_Asignadas.map((c) => c.id_clase),
                            "Cambio Solicitado",
                          )
                        }
                      >
                        Solicitar cambio de horario
                      </button>
                    </div>
                  </div>
                </section>
              </>
            )}
          </>
        )}
        {modal && (
          <div className="overlay">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className="modal"
            >
              <button
                className="close ghost"
                aria-label="Cerrar"
                onClick={() => setModal(null)}
              >
                ×
              </button>
              <h2 id="modal-title">
                {
                  {
                    change: "Solicitar cambio",
                    professor: "Profesor",
                    class: "Clase asignada",
                    preview: "Oferta y enlace privado",
                    import: "Importar programación",
                  }[modal.type]
                }
              </h2>
              {modal.type === "preview" ? (
                <pre>{modal.text}</pre>
              ) : modal.type === "import" ? (
                <>
                  <p>
                    Se reemplazarán todos los datos por <b>{modal.file.name}</b>
                    . Exporta antes un respaldo si necesitas conservar la
                    programación actual.
                  </p>
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const f = new FormData();
                        f.append("file", modal.file);
                        await api("/import", f);
                        await refresh();
                        setSelected("");
                        setModal(null);
                        setNotice("Excel importado y validado.");
                      })
                    }
                  >
                    Reemplazar programación
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const data = Object.fromEntries(new FormData(e.target));
                    run(async () => {
                      if (modal.type === "change")
                        await api("/respond", {
                          ids: modal.ids,
                          estatus: "Cambio Solicitado",
                          comentarios: data.comentarios,
                        });
                      else
                        await api(
                          modal.type === "professor"
                            ? "/professors"
                            : "/classes",
                          data,
                        );
                      await refresh();
                      setModal(null);
                      setNotice("Cambios guardados en el Excel.");
                    });
                  }}
                >
                  {modal.type === "change" ? (
                    <label>
                      Describe el conflicto o el horario propuesto
                      <textarea
                        autoFocus
                        name="comentarios"
                        maxLength={2000}
                        required
                        rows={5}
                      />
                    </label>
                  ) : modal.type === "professor" ? (
                    <>
                      {[
                        ["nomina", "Nómina"],
                        ["nombre", "Nombre"],
                        ["correo", "Correo"],
                        ["udc_maximas", "UDC máximas"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            required
                            name={key}
                            readOnly={key === "nomina" && !!modal.item}
                            type={
                              key === "correo"
                                ? "email"
                                : key === "udc_maximas"
                                  ? "number"
                                  : "text"
                            }
                            min="0"
                            defaultValue={
                              modal.item?.[key] ??
                              (key === "udc_maximas" ? 14 : "")
                            }
                          />
                        </label>
                      ))}
                    </>
                  ) : (
                    <>
                      <label>
                        ID de clase
                        <input
                          required
                          name="id_clase"
                          readOnly={!!modal.item}
                          defaultValue={modal.item?.id_clase}
                        />
                      </label>
                      <label>
                        Materia
                        <select
                          name="id_materia"
                          defaultValue={modal.item?.id_materia}
                        >
                          {db.Materias.map((m) => (
                            <option key={m.id_materia} value={m.id_materia}>
                              {m.nombre_materia}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Profesor
                        <select
                          name="nomina_profesor"
                          defaultValue={modal.item?.nomina_profesor}
                        >
                          {db.Profesores.map((p) => (
                            <option key={p.nomina} value={p.nomina}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      {[
                        ["dias", "Días (Lun,Mié)"],
                        ["horario", "Horario (09:00-11:00)"],
                        ["aula", "Aula"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            required
                            name={key}
                            defaultValue={modal.item?.[key]}
                          />
                        </label>
                      ))}
                      <label>
                        Estatus
                        <select
                          name="estatus"
                          defaultValue={modal.item?.estatus}
                        >
                          {["Pendiente", "Aceptada", "Cambio Solicitado"].map(
                            (s) => (
                              <option key={s}>{s}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        Comentarios
                        <textarea
                          name="comentarios"
                          defaultValue={modal.item?.comentarios}
                        />
                      </label>
                    </>
                  )}
                  <button disabled={busy} className="primary">
                    Guardar
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </main>
      <footer>
        PROGRAMACIÓN ARTE FJ27{" "}
        <span>Hecho para conectar el arte y la enseñanza.</span>
      </footer>
    </>
  );
}
function Stat({ name, value, sub }) {
  return (
    <article className="stat">
      <small>{name}</small>
      <strong>{value}</strong>
      <p>{sub}</p>
    </article>
  );
}
createRoot(document.getElementById("root")).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register("/sw.js");
