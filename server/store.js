import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
import path from 'node:path';
export const schema={Profesores:['nomina','nombre','correo','udc_maximas'],Materias:['id_materia','nombre_materia','udc'],Clases_Asignadas:['id_clase','id_materia','nomina_profesor','dias','horario','aula','estatus','comentarios']};
export const statuses=['Pendiente','Aceptada','Cambio Solicitado'];
export function validate(db){
 for(const [sheet,cols] of Object.entries(schema)){
  if(!Array.isArray(db[sheet]))throw Error(`Falta pestaña ${sheet}`);
  const seen=new Set();
  for(const row of db[sheet]){if(!row[cols[0]]||seen.has(String(row[cols[0]])))throw Error(`Clave vacía o duplicada en ${sheet}`);seen.add(String(row[cols[0]]));}
 }
 for(const p of db.Profesores){p.nomina=String(p.nomina);p.udc_maximas=p.udc_maximas===''||p.udc_maximas==null?14:Number(p.udc_maximas);if(!p.nombre||!p.correo||!Number.isFinite(p.udc_maximas)||p.udc_maximas<0)throw Error('Profesor inválido');}
 for(const m of db.Materias){m.id_materia=String(m.id_materia);m.udc=Number(m.udc);if(!m.nombre_materia||!Number.isFinite(m.udc)||m.udc<0)throw Error('Materia inválida');}
 for(const c of db.Clases_Asignadas){c.id_clase=String(c.id_clase);c.id_materia=String(c.id_materia);c.nomina_profesor=String(c.nomina_profesor);if(!db.Materias.some(m=>m.id_materia===c.id_materia)||!db.Profesores.some(p=>p.nomina===c.nomina_profesor))throw Error('Referencia de clase inexistente');if(!statuses.includes(c.estatus))throw Error('Estatus inválido');if(!/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom)(,(Lun|Mar|Mié|Jue|Vie|Sáb|Dom))*$/.test(c.dias)||!/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(c.horario)||c.horario.slice(0,5)>=c.horario.slice(6))throw Error('Usa días Lun,Mar,Mié,Jue,Vie,Sáb,Dom y horario HH:mm-HH:mm');}
 return db;
}
export async function decode(buffer){const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);const db={};for(const [sheet,cols] of Object.entries(schema)){const ws=book.getWorksheet(sheet);if(!ws)throw Error(`Falta pestaña ${sheet}`);if(cols.some((c,i)=>ws.getRow(1).getCell(i+1).text!==c))throw Error(`Encabezados incorrectos: ${sheet}`);db[sheet]=[];ws.eachRow((row,n)=>{if(n===1)return;const item={};cols.forEach((c,i)=>{const cell=row.getCell(i+1);if(cell.type===ExcelJS.ValueType.Formula)throw Error('Importa valores, no fórmulas');item[c]=cell.text});db[sheet].push(item)})}return validate(db)}
export async function encode(db){const book=new ExcelJS.Workbook();for(const [sheet,cols] of Object.entries(schema)){const ws=book.addWorksheet(sheet);ws.columns=cols.map(key=>({header:key,key,width:24}));ws.addRows(db[sheet]);ws.getRow(1).font={bold:true};ws.views=[{state:'frozen',ySplit:1}]}return book.xlsx.writeBuffer()}
export const demo={Profesores:[{nomina:'L001',nombre:'Mariana Torres',correo:'mariana@example.edu',udc_maximas:14},{nomina:'L002',nombre:'Diego Herrera',correo:'diego@example.edu',udc_maximas:14},{nomina:'L003',nombre:'Sofía Méndez',correo:'sofia@example.edu',udc_maximas:14}],Materias:[{id_materia:'ART101',nombre_materia:'Laboratorio de creación',udc:8},{id_materia:'ART202',nombre_materia:'Historia del arte',udc:6},{id_materia:'ART303',nombre_materia:'Narrativas visuales',udc:8}],Clases_Asignadas:[{id_clase:'C001',id_materia:'ART101',nomina_profesor:'L001',dias:'Lun,Mié',horario:'09:00-11:00',aula:'Taller 201',estatus:'Pendiente',comentarios:''},{id_clase:'C002',id_materia:'ART202',nomina_profesor:'L001',dias:'Mar,Jue',horario:'11:00-13:00',aula:'Aula 104',estatus:'Aceptada',comentarios:''},{id_clase:'C003',id_materia:'ART303',nomina_profesor:'L002',dias:'Lun,Vie',horario:'13:00-15:00',aula:'Estudio 02',estatus:'Cambio Solicitado',comentarios:'¿Podemos revisar el horario del viernes?'},{id_clase:'C004',id_materia:'ART101',nomina_profesor:'L002',dias:'Mar,Jue',horario:'09:00-11:00',aula:'Taller 202',estatus:'Pendiente',comentarios:''}]};
export class Store{
 constructor(file){this.file=file;this.queue=Promise.resolve()}
 async init(){await fs.mkdir(path.dirname(this.file),{recursive:true});try{await fs.access(this.file)}catch{await fs.writeFile(this.file,await encode(structuredClone(demo)),{flag:'wx'})}await this.read()}
 async read(){return decode(await fs.readFile(this.file))}
 mutate(fn){const job=this.queue.then(async()=>{const db=await this.read();const next=await fn(db)||db;validate(next);const tmp=this.file+'.tmp';await fs.writeFile(tmp,await encode(next));await fs.rename(tmp,this.file);return next});this.queue=job.catch(()=>{});return job}
}
