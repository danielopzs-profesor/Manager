import ExcelJS from 'exceljs';
import {calendar,list} from './academic.js';
export const deliveryHeaders=['SEDE','PERIODO','ESCUELA TEC','DEPARTAMENTO','ESTATUS DEL GRUPO','CLAVE','ASIGNATURA','GRUPO','ATRIBUTOS','NOMINA','PROFESOR','RESPONSABILIDAD','TITULAR','FECHA INICIO','FECHA FIN','HORA INICIO','HORA FIN','DIAS','CODIGO EDIFICIOS Y SALAS','SALAS','SESCODE','REFERENCIAS','COMPONENTE','VACANTES','RESTRICCIONES CARRERA','RESTRICCIONES PROGRAMA','RESTRICCIONES CLASE (CLASS)','RESTRICCIONES COHORTE','RESTRICCIONES ATRIBUTO ESTUDIANTE'];
const dayCodes={Lun:'Lu',Mar:'Ma','Mié':'Mi',Jue:'Ju',Vie:'Vi','Sáb':'Sa',Dom:'Do'};
export async function exportDelivery(a,semesterId){
 const semester=a.semestres.find(s=>s.id===semesterId);
 if(!semester)throw Error('Selecciona un semestre válido para descargar el formato de entrega.');
 const offers=a.ofertas.filter(o=>o.semestre===semesterId),rows=[],errors=[];
 const date=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return null;const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?d:null;};
 const time=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||"")?value+':00':null;
 const numeric=value=>value!==''&&value!==undefined&&value!==null&&Number.isFinite(Number(value))?Number(value):null;
 for(const o of offers){
  const uf=a.ufs.find(u=>u.id===o.uf),parts=a.participaciones.filter(p=>p.oferta===o.id);
  const sessions=a.sesiones.filter(s=>s.oferta===o.id);
  const units=(sessions.length?sessions:[null]).map(session=>({session,teachers:list(session?.profesores).length?list(session.profesores):parts.map(p=>p.profesor)}));
  // Preserve assigned teachers who do not yet have a scheduled session.
  for(const part of parts)if(!units.some(unit=>unit.teachers.includes(part.profesor)))units.push({session:null,teachers:[part.profesor]});
  for(const {session,teachers} of units){
   const room=a.salones.find(r=>r.id===session?.aula);
   if(room?.codigo && !/^A-[A-Z0-9]+(?:- | )[^,\r\n]+$/.test(room.codigo))errors.push(`Grupo ${o.grupo||o.id}: el código de salón debe conservar los espacios y guiones oficiales; por ejemplo A-A6- 206. Revísalo en Salones con el catálogo de referencia.`);
   const segmentIds=list(session?.segmentos).length?list(session.segmentos):list(o.periodos);
   for(const segmentId of segmentIds.length?segmentIds:[null]){
    const segment=calendar(semester).find(r=>r.id===segmentId);
    for(const teacherId of teachers.length?teachers:[null]){
     const professor=a.profesores.find(p=>p.id===teacherId),part=parts.find(p=>p.profesor===teacherId);
     const percentage=numeric(part?.porcentaje);
     if(percentage!==null&&!Number.isInteger(percentage))errors.push(`Grupo ${o.grupo||o.id}: ${professor?.nombre||teacherId} tiene responsabilidad decimal; el formato requiere un porcentaje entero. Corrige la asignación antes de exportar.`);
     const [start,end]=String(session?.horario||'').split('-');
     rows.push(['MTY',semester.identificador||null,semester.escuela||null,'DART-D. Arte','ACTIVO',uf?.id||null,uf?.nombre||null,o.grupo||null,uf?list(uf.atributos??'PMT3').join(','):null,professor?.nomina||null,professor?.nombre||null,percentage,1,date(segment?.inicio),date(segment?.fin),time(start),time(end),Object.keys(dayCodes).filter(d=>list(session?.dias).includes(d)).map(d=>dayCodes[d]).join('')||null,room?.codigo||null,room?.nombre||session?.aula||null,'P',null,'CL',Number(o.alumnos)>0?numeric(o.alumnos):null,null,null,null,null,null]);
    }
   }
  }
 }
 if(errors.length)throw Error([...new Set(errors)].join('\n'));
 const book=new ExcelJS.Workbook(),ws=book.addWorksheet('Sheet1');
 ws.columns=deliveryHeaders.map(header=>({header,width:['ASIGNATURA','PROFESOR','SALAS'].includes(header)?40:24}));ws.addRows(rows);
 ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF46546B'}};
 for(const n of [14,15])ws.getColumn(n).numFmt='yyyy-mm-dd';for(const n of [12,13,24])ws.getColumn(n).numFmt='0';
 // Kronos requires literal time strings, never Excel time serials.
 for(const n of [16,17])ws.getColumn(n).numFmt='@';
 ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:29}};
 return book.xlsx.writeBuffer();
}
