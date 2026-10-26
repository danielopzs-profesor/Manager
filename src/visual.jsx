import React from "react";
export function Icon({ name = "grid", size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    book: (
      <>
        <path d="M4 5a3 3 0 0 1 3-2h5v17H7a3 3 0 0 0-3 1zM20 5a3 3 0 0 0-3-2h-5v17h5a3 3 0 0 1 3 1z" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7" r="4" />
        <path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M17 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    shield: (
      <>
        <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    message: (
      <>
        <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3zM7 8h10M7 12h7" />
      </>
    ),
    data: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3z" />
      </>
    ),
  };
  return (
    <svg
      className="ui-icon"
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] || paths.grid}
    </svg>
  );
}
export const navIcons = {
  Salones: "grid",
  Préstamos: "users",
  Coordinación: "calendar",
  "Mi carga académica": "calendar",
  Inicio: "grid",
  Profesores: "users",
  "Unidades de formación": "book",
  Ofertas: "calendar",
  Solicitudes: "message",
  "Usuarios y permisos": "shield",
  Historial: "clock",
  Datos: "data",
  "Mi horario": "calendar",
  "Mis respuestas": "check",
};
export function Brand({ light = false }) {
  return (
    <a
      href="/"
      className={"brand " + (light ? "brand--light" : "")}
      aria-label="Coordinación Académica · Inicio"
    >
      <span className="brand__mark">C</span>
      <span className="brand__copy">
        <strong>COORDINACIÓN</strong>
        <small>Académica</small>
      </span>
    </a>
  );
}
export function SemesterIllustration() {
  return (
    <div className="week-preview">
      <div className="week-preview__head">
        <div>
          <span>UNA VISTA DEL SEMESTRE</span>
          <strong>Todo conectado.</strong>
        </div>
        <div className="mini-icon">
          <Icon name="calendar" />
        </div>
      </div>
      <div
        className="semester-flow"
        aria-label="Tres periodos y dos semanas intermedias"
      >
        {["P1", "I1", "P2", "I2", "P3"].map((s) => (
          <span key={s} className={s.startsWith("I") ? "intensive" : ""}>
            {s}
          </span>
        ))}
      </div>
      <div className="preview-caption">
        <Icon name="book" size={18} />
        <span>Unidades de formación, grupos y responsabilidades.</span>
      </div>
    </div>
  );
}

// Google Material Icons (filled), Apache-2.0. See docs/licenses/MaterialIcons.txt.
export function FilledIcon({name,size=24}) {
 const paths={download:'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v3h14v-3H5z',add:'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',edit:'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 000-1.41l-2.34-2.34a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',share:'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A3 3 0 1015 5c0 .24.04.47.09.7L8.04 9.81a3 3 0 100 4.38l7.12 4.16a2.9 2.9 0 00-.08.65A2.92 2.92 0 1018 16.08z',delete:'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z'};
 return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={paths[name]||paths.add}/></svg>;
}
export function IconAction({icon,label,tooltip=label,onClick,disabled=false,danger=false}) {
 return <button type="button" className={'professor-icon-button'+(icon==='add'?' professor-icon-button--add':'')} title={tooltip} aria-label={label} onClick={onClick} disabled={disabled}><FilledIcon name={icon}/></button>;
}
