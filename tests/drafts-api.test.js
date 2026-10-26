import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {Store} from '../server/store.js';import {fixture} from './fixtures.js';import {createApp} from '../server/app.js';
test('API: editar periodos publicados, guardar parcial y combinar una cuenta con el docente existente',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'arte-draft-')),file=path.join(dir,'book.xlsx'),store=new Store(file);await store.init();await store.mutate(()=>fixture());const runtime=await createApp({env:{EXCEL_PATH:file,ADMIN_PASSWORD:'initial-password'}});const server=runtime.app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api';let cookie;
 const req=(url,body,c=cookie)=>fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(c?{cookie:c}:{})},body:body?JSON.stringify(body):undefined});const data=async()=>(await req('/academic')).json();const change=async(url,body)=>req(url,{...body,revision:(await data()).revision});
 try{const login=await req('/login',{password:'initial-password'});cookie=login.headers.get('set-cookie').split(';')[0];let a=await data();assert.equal((await change('/academic/publish',{id:'O1'})).status,200);
 assert.equal((await change('/academic/save',{collection:'ofertas',item:{...a.ofertas[0],duracion:5,periodos:'P3',grupo:'301'}})).status,200);a=await data();assert.equal(a.ofertas[0].estado,'Borrador');assert.equal(a.sesiones[0].segmentos,'P1,P2');assert.ok(a.avisos[0].errores.some(x=>x.includes('Revisa los periodos')));assert.equal((await change('/academic/publish',{id:'O1'})).status,400);
 assert.equal((await change('/academic/save',{collection:'sesiones',item:{id:'S1',oferta:'O1',dias:'',horario:'',aula:'',segmentos:'',profesores:''}})).status,200);assert.equal((await data()).cargas[0].distribucion[0].horasSemanales,0);
 assert.equal((await change('/academic/admin',{id:'admin.uno',nombre:'Admin Uno',password:'admin-password-123',role:'admin'})).status,200);
 assert.equal((await change('/academic/admin',{id:'teacher.portal',nombre:'Mariana',password:'teacher-password-123',role:'profesor',profesor:'L001'})).status,200);
 const before=await data();assert.equal((await change('/academic/admin',{id:'admin.uno',nombre:'Admin Uno',role:'admin',profesor:'L001',combinar:true})).status,200);a=await data();assert.equal(a.profesores.length,before.profesores.length);assert.equal(a.admins.some(x=>x.id==='teacher.portal'),false);assert.equal(a.participaciones.length,before.participaciones.length);
 const alias=await req('/login',{identifier:'mariana@example.edu',password:'admin-password-123'},null);assert.equal(alias.status,200);assert.equal((await alias.json()).role,'admin');
 // Una cuenta protegida puede combinar su perfil docente sin enviar de nuevo el rol.
 await store.mutate(db=>{const account=db.academic.admins.find(x=>x.id==='admin.uno');account.role='superadmin';account.protegido=true;});
 const superLogin=await req('/login',{identifier:'admin.uno',password:'admin-password-123'},null);assert.equal(superLogin.status,200);cookie=superLogin.headers.get('set-cookie').split(';')[0];
 assert.equal((await change('/academic/admin',{id:'admin.uno',nombre:'Admin Uno',profesor:'L002',combinar:true})).status,200);
 const byPayroll=await req('/login',{identifier:'l002',password:'admin-password-123'},null);assert.equal(byPayroll.status,200);assert.equal((await byPayroll.json()).role,'superadmin');
 const me=await (await req('/me')).json();assert.equal(me.role,'superadmin');assert.equal(me.nomina,'L002');
 a=await data();assert.equal(a.admins.find(x=>x.id==='admin.uno').role,'superadmin');assert.equal(a.admins.find(x=>x.id==='admin.uno').protegido,true);assert.equal(a.participaciones.length,before.participaciones.length);
 assert.equal((await change('/academic/admin',{id:'admin.uno',nombre:'Admin Uno',role:'profesor',profesor:'L002'})).status,400);

 }finally{await new Promise(r=>server.close(r));await runtime.close();await rm(dir,{recursive:true,force:true});}
});
