import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures.js';
import {workload,validateAcademic,loadFingerprint,publicAcademic} from '../server/academic.js';
import {exportAcademic,importAcademic} from '../server/academic-excel.js';
import {acceptanceMetrics,roomUtilization} from '../shared/metrics.js';
test('préstamos consumen tope semestral, alteran aprobaciones y conservan aislamiento',async()=>{
 const a=fixture().academic;a.prestamos=[{id:'P1',profesor:'L001',semestre:'FJ27',departamento:'Diseño',udc:3,comentarios:''}];
 assert.doesNotThrow(()=>validateAcademic(a));let w=workload(a,'L001','FJ27');assert.equal(w.cargaLocal,1.5);assert.equal(w.prestamos,3);assert.equal(w.total,4.5);assert.equal(w.disponible,9.5);
 assert.equal(workload(a,'L001','otro').prestamos,0);
 const signature=loadFingerprint(a,'L001','FJ27');a.prestamos[0].udc=14;assert.notEqual(loadFingerprint(a,'L001','FJ27'),signature);assert.equal(workload(a,'L001','FJ27').estado,'Sobrecarga pendiente');
 assert.equal(publicAcademic(a,{role:'profesor',nomina:'L002'}).prestamos.length,0);assert.equal(publicAcademic(a,{role:'profesor',nomina:'L001'}).prestamos.length,1);
 const loaded=await importAcademic(await exportAcademic(a),a);assert.deepEqual(loaded.prestamos,a.prestamos);
 a.prestamos[0].udc=-1;assert.throws(()=>validateAcademic(a),/Préstamo inválido/);
});
test('salones identificados por edificio y número, sin duplicar combinaciones',()=>{
 const a=fixture().academic;a.salones=[{id:'internal-1',nombre:'CEDES-319',edificio:'CEDES',numero:'319',capacidad:30,dias:'Lun',horario:'08:00-18:00'}];assert.doesNotThrow(()=>validateAcademic(a));
 a.salones.push({...a.salones[0],id:'internal-2',edificio:'cedes'});assert.throws(()=>validateAcademic(a),/Ya existe/);
});
test('dashboard cuenta profesores con toda su oferta publicada aceptada y excluye borradores',()=>{
 const a=fixture().academic;assert.equal(acceptanceMetrics(a,'FJ27').ids.length,0);a.ofertas[0].estado='Publicada';a.participaciones[0].estatus='Aceptada';
 let m=acceptanceMetrics(a,'FJ27');assert.equal(m.percent,50);assert.deepEqual(m.accepted,['L001']);assert.deepEqual(m.pending,['L002']);
 a.participaciones.push({id:'R3',oferta:'O1',profesor:'L001',estatus:'Pendiente'});assert.equal(acceptanceMetrics(a,'FJ27').percent,0);
});
test('disponibilidad calcula unión de reservas semanales por segmento, no suma empalmes dos veces',()=>{
 const a=fixture().academic;a.salones=[{id:'R1',nombre:'CEDES-319',dias:'Lun,Mar',horario:'08:00-18:00'}];a.sesiones[0].aula='R1';
 let r=roomUtilization(a,'FJ27','P1')[0];assert.equal(r.totalHours,20);assert.equal(r.usedHours,4);assert.equal(r.freeHours,16);
 a.sesiones.push({...a.sesiones[0],id:'overlap',horario:'12:00-14:00'});assert.equal(roomUtilization(a,'FJ27','P1')[0].usedHours,5);
 assert.equal(roomUtilization(a,'FJ27','P3')[0].freeHours,20);
});
