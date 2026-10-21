import ExcelJS from 'exceljs';
import {calendar,list,publishIssues,validSessionTime} from './academic.js';
export const deliveryHeaders=['SEDE','PERIODO','ESCUELA TEC','DEPARTAMENTO','ESTATUS DEL GRUPO','CLAVE','ASIGNATURA','GRUPO','ATRIBUTOS','NOMINA','PROFESOR','RESPONSABILIDAD','TITULAR','FECHA INICIO','FECHA FIN','HORA INICIO','HORA FIN','DIAS','CODIGO EDIFICIOS Y SALAS','SALAS','SESCODE','REFERENCIAS','COMPONENTE','VACANTES','RESTRICCIONES PROGRAMA','RESTRICCIONES CLASE (CLASS)','RESTRICCIONES COHORTE','RESTRICCIONES ATRIBUTO ESTUDIANTE','RESTRICCIONES CARRERA'];
const dayCodes={Lun:'Lu',Mar:'Ma','Mié':'Mi',Jue:'Ju',Vie:'Vi','Sáb':'Sa',Dom:'Do'};
export async function exportDelivery(a,semesterId){
 const semester=a.semestres.find(s=>s.id===semesterId);
 if(!semester)throw Error('Selecciona un semestre válido para descargar el formato de entrega.');
 if(!semester.identificador?.trim())throw Error('Completa el identificador del periodo en Editar semestre antes de descargar el formato de entrega.');
 const offers=a.ofertas.filter(o=>o.semestre===semesterId&&o.estado==='Publicada');
 if(!offers.length)throw Error('No hay ofertas publicadas en este semestre. Completa y publica las ofertas antes de descargar el formato de entrega.');
 const rows=[],errors=[];
 for(const o of offers){
  const uf=a.ufs.find(u=>u.id===o.uf);const label=`Grupo ${o.grupo} (${uf?.nombre||o.uf})`;
  errors.push(...publishIssues(a,o).map(e=>`${label}: ${e}`));
  for(const session of a.sesiones.filter(s=>s.oferta===o.id)){
   const room=a.salones.find(r=>r.id===session.aula);
   if(!room?.codigo?.trim())errors.push(`${label}: completa el código oficial del salón en Salones.`);
   if(!validSessionTime(session))continue;
   for(const segment of calendar(semester).filter(r=>list(session.segmentos).includes(r.id))){
    if(!segment.inicio||!segment.fin){errors.push(`${label}: completa las fechas de ${segment.id} en Editar semestre.`);continue;}
    for(const teacherId of list(session.profesores)){
     const professor=a.profesores.find(p=>p.id===teacherId),part=a.participaciones.find(p=>p.oferta===o.id&&p.profesor===teacherId);
     if(!professor||!part)continue;
     if(!professor.nomina?.trim())errors.push(`${label}: completa la nómina de ${professor.nombre} en Profesores.`);
     if(!Number.isInteger(part.porcentaje))errors.push(`${label}: ${professor.nombre} tiene responsabilidad decimal; el formato requiere un porcentaje entero. Corrige la asignación antes de exportar.`);
     rows.push(['monterrey',semester.identificador,semester.escuela||'','DART-D. Arte','ACTIVO',uf.id,uf.nombre,o.grupo,uf.atributos??'PMT3',professor.nomina||'',professor.nombre,part.porcentaje,1,new Date(segment.inicio+'T00:00:00Z'),new Date(segment.fin+'T00:00:00Z'),session.horario.slice(0,5)+':00',session.horario.slice(6)+':00',Object.keys(dayCodes).filter(d=>list(session.dias).includes(d)).map(d=>dayCodes[d]).join(''),room?.codigo||'',room?.nombre||session.aula,'P','','CL',Number(o.alumnos||0),'','','','','']);
    }
   }
  }
 }
 if(errors.length)throw Error([...new Set(errors)].join('\n'));
 const book=new ExcelJS.Workbook(),ws=book.addWorksheet('Sheet1');
 ws.columns=deliveryHeaders.map(header=>({header,width:['ASIGNATURA','PROFESOR','SALAS'].includes(header)?40:24}));ws.addRows(rows);
 ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF46546B'}};
 for(const n of [14,15])ws.getColumn(n).numFmt='dd/mm/yyyy';for(const n of [12,13,24])ws.getColumn(n).numFmt='0';
 ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:29}};
 return book.xlsx.writeBuffer();
}
