import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm,writeFile} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {Store} from '../server/store.js';import {fixture} from './fixtures.js';import {createApp} from '../server/app.js';import {passwordHash} from '../server/accounts.js';import {exportAcademic} from '../server/academic-excel.js';
test('política nominativa, superadministradores permanentes, coordinador acotado, historial y PDF',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'arte-security-'));const file=path.join(dir,'book.xlsx');const store=new Store(file);await store.init();const hash=await passwordHash('verified-password-123');
 await store.mutate(()=>{const db=fixture();db.academic.profesores.forEach(p=>p.passwordHash=hash);db.academic.profesores.push({id:'L03545260',nombre:'Pamela',correo:'pamela@example.edu',tipo:'Planta',passwordHash:hash});db.academic.admins=[{id:'danielopzs',profesor:'L001'},{id:'germanvazquez',profesor:'L002'},{id:'gigidiconstanzo'},{id:'marianaparedes'},{id:'accidental',profesor:'L003'}].map(x=>({...x,nombre:x.id,hash,role:'admin'}));return db;});
 const runtime=await createApp({env:{EXCEL_PATH:file,ENFORCE_NAMED_ROLES:'1'}});const server=runtime.app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api';
 const req=(url,body,cookie)=>fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 const login=async id=>{const r=await req('/login',{identifier:id,password:'verified-password-123'});assert.equal(r.status,200);return {identity:await r.json(),cookie:r.headers.get('set-cookie').split(';')[0]};};
 try{
  const daniel=await login('danielopzs'),pamela=await login('pamela@example.edu'),german=await login('germanvazquez'),extra=await login('accidental');assert.equal(daniel.identity.role,'superadmin');assert.equal(pamela.identity.role,'superadmin');assert.equal(german.identity.role,'admin');assert.equal(extra.identity.role,'profesor');
  const data=async cookie=>(await req('/academic',null,cookie||daniel.cookie)).json();const change=async(url,body,cookie=daniel.cookie)=>req(url,{...body,revision:(await data(cookie)).revision},cookie);
  assert.equal((await change('/academic/professor-role',{profesor:'L003',enabled:true},german.cookie)).status,403);
  assert.equal((await change('/academic/professor-role',{profesor:'L003',enabled:true})).status,200);
  assert.equal((await change('/academic/professor-role',{profesor:'L03545260',enabled:false})).status,400);
  assert.equal((await change('/academic/admin',{id:'danielopzs',nombre:'Daniel',role:'consulta'})).status,400);
  assert.equal((await change('/academic/delete',{collection:'profesores',id:'L03545260'})).status,400);
  const coordinator=await login('mariana@example.edu');assert.equal(coordinator.identity.role,'profesor');const view=await data(coordinator.cookie);assert.deepEqual(view.ofertasCoordinadas,['O1']);
  assert.equal((await change('/academic/save',{collection:'participaciones',item:{...view.participaciones.find(p=>p.id==='R2'),porcentaje:40}},coordinator.cookie)).status,200);
  assert.equal((await change('/academic/save',{collection:'participaciones',item:{id:'hijack',oferta:'O999',profesor:'L003',porcentaje:10}},coordinator.cookie)).status,403);
  assert.equal((await change('/academic/publish',{id:'O1'},coordinator.cookie)).status,403);
  assert.equal((await change('/academic/save',{collection:'profesores',item:{id:'L002',nombre:'Hack'}},coordinator.cookie)).status,403);
  const history=await req('/academic/history.txt',null,daniel.cookie);assert.equal(history.status,200);assert.match(await history.text(),/Inicio de sesión/);
  assert.equal((await req('/academic/history.txt',null,coordinator.cookie)).status,403);
  const pdf=await req('/academic/report.pdf?semestre=FJ27',null,daniel.cookie);assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,8).toString(),'%PDF-1.4');await writeFile('/tmp/arte-v4-report.pdf',bytes);
  assert.equal((await change('/academic/history/clear',{confirmacion:'wrong'})).status,400);
  assert.equal((await change('/academic/history/clear',{confirmacion:'BORRAR HISTORIAL',categoria:'accesos'})).status,200);
  const after=await data();assert.ok(after.auditoria.some(r=>r.accion==='Limpieza de historial'));assert.equal(after.auditoria.some(r=>r.categoria==='accesos'),false);assert.equal(JSON.stringify(after).includes('passwordHash'),false);
 }finally{await new Promise(r=>server.close(r));await runtime.close();await rm(dir,{recursive:true,force:true});}
});
