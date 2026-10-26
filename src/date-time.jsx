import React, { useState } from 'react';
const spanishDate = value => value ? new Date(value+'T12:00:00Z').toLocaleDateString('es-MX',{dateStyle:'long',timeZone:'UTC'}) : 'Selecciona el lunes de inicio';
export function SemesterDatePicker({value,onChange}) {
 const seed=value?new Date(value+'T12:00:00Z'):new Date();
 const [year,setYear]=useState(seed.getUTCFullYear()),[month,setMonth]=useState(seed.getUTCMonth());
 const first=new Date(Date.UTC(year,month,1));const offset=(first.getUTCDay()+6)%7;
 const count=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 const years=Array.from({length:11},(_,i)=>seed.getUTCFullYear()-3+i);
 return <fieldset className="date-picker"><legend>Inicio del semestre</legend>
  <p><b>{spanishDate(value)}</b></p>
  <div className="toolbar"><label>Mes<select aria-label="Mes de inicio" value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,m)=><option key={m} value={m}>{new Date(Date.UTC(2027,m,1)).toLocaleDateString('es-MX',{month:'long',timeZone:'UTC'})}</option>)}</select></label>
  <label>Año<select aria-label="Año de inicio" value={year} onChange={e=>setYear(Number(e.target.value))}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select></label></div>
  <div className="date-grid">{['L','M','X','J','V','S','D'].map((d,i)=><b key={i}>{d}</b>)}
   {Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}
   {Array.from({length:count},(_,i)=>{const day=i+1,iso=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`,monday=(offset+i)%7===0;return <button key={iso} type="button" aria-label={'Seleccionar '+spanishDate(iso)} aria-pressed={value===iso} disabled={!monday} className={value===iso?'selected':''} onClick={()=>onChange(iso)}>{day}</button>})}
  </div><small>Selecciona un lunes habilitado. Las 15 semanas lectivas y las dos intermedias se calculan a partir de esta fecha.</small>
 </fieldset>;
}
export function TimeRangePicker({value='',onChange,label,required=true}) {
 const [start='',end='']=String(value).split('-');
 return <fieldset className="time-picker"><legend>{label}</legend><div className="time-fields">
 <label>Inicio<input type="time" aria-label={label+': inicio'} required={required} value={start} onChange={e=>onChange(e.target.value+'-'+end)}/></label>
 <label>Fin<input type="time" aria-label={label+': fin'} required={required} value={end} min={start||undefined} onChange={e=>onChange(start+'-'+e.target.value)}/></label>
 </div>{start&&end&&start>=end?<p className="field-error" role="alert">La hora de fin debe ser posterior al inicio. Elige una hora de salida más tarde.</p>:<small>Elige inicio y fin. El sistema guardará el intervalo en formato de 24 horas.</small>}</fieldset>;
}
export function explainError(message) {
 if (/Elige|Selecciona|Corrige|Cambia|Completa/.test(message)) return message;
 const advice=[[/porcentaje|Participación inválida|100 %/,'Revisa Responsabilidad (%): usa un valor mayor a 0 y hasta 100; el total del grupo debe sumar 100 %.'],[/Profesor inválido/,'Completa nombre, correo y tipo de contrato: Planta, Cátedra o Por clasificar.'],[/Sesión inválida/,'Selecciona un grupo, sus docentes, días y periodos válidos; verifica que el fin sea posterior al inicio.'],[/Salón inválido/,'Completa edificio y número, capacidad entera mayor a cero, días y horas de trabajo.'],[/clave única|duplicado/,'Usa un identificador diferente o edita el registro que ya existe.'],[/sobrecarga/,'Revisa la carga local y los préstamos; solicita aprobación a otro administrador si supera el tope.']];
 const match=advice.find(([pattern])=>pattern.test(message));return match?message+' '+match[1]:message;
}
