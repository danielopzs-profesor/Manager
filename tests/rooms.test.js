import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures.js';
import {validateAcademic, publishIssues, migrateAcademic} from '../server/academic.js';
import {exportAcademic,importAcademic} from '../server/academic-excel.js';
import ExcelJS from 'exceljs';
function data(){const a=fixture().academic;a.salones=[{id:'R1',nombre:'Taller',capacidad:30,dias:'Lun,Mar,Mié,Jue,Vie',horario:'08:00-18:00'}];a.sesiones[0].aula='R1';a.ofertas[0].alumnos=25;return a;}
test('salones: aforo, disponibilidad, empalmes y periodos separados',()=>{
 const a=data();assert.doesNotThrow(()=>validateAcademic(a));
 a.ofertas[0].alumnos=31;assert.throws(()=>validateAcademic(a),/capacidad/);a.ofertas[0].alumnos=25;
 a.sesiones[0].horario='07:00-09:00';assert.throws(()=>validateAcademic(a),/horario de trabajo/);a.sesiones[0].horario='09:00-13:00';
 a.sesiones[0].dias='Dom';assert.throws(()=>validateAcademic(a),/horario de trabajo/);a.sesiones[0].dias='Lun';
 a.sesiones.push({...a.sesiones[0],id:'S2',horario:'12:00-14:00'});assert.throws(()=>validateAcademic(a),/Empalme/);
 a.sesiones[1].horario='13:00-14:00';assert.doesNotThrow(()=>validateAcademic(a));
 a.sesiones[0].segmentos='P1';a.sesiones[1].segmentos='P2';a.sesiones[1].horario='09:00-13:00';assert.doesNotThrow(()=>validateAcademic(a));
 a.ofertas[0].alumnos=0;assert.ok(publishIssues(a,a.ofertas[0]).some(s=>s.includes('número de alumnos')));
});
test('salones: persistencia Excel y compatibilidad con archivos anteriores',async()=>{
 const a=data();let b=await exportAcademic(a);let loaded=await importAcademic(b,a);assert.deepEqual(loaded.salones,a.salones);assert.equal(loaded.ofertas[0].alumnos,25);
 const book=new ExcelJS.Workbook();await book.xlsx.load(b);book.removeWorksheet(book.getWorksheet('salones').id);book.getWorksheet('ofertas').spliceColumns(11,1);loaded=await importAcademic(await book.xlsx.writeBuffer(),a);assert.deepEqual(loaded.salones,a.salones);assert.equal(loaded.ofertas[0].alumnos,0);assert.doesNotThrow(()=>validateAcademic(loaded));
 const db=fixture();delete db.academic.salones;assert.deepEqual(migrateAcademic(db).salones,[]);
});
