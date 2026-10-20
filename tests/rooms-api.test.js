import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../server/store.js';
import {fixture} from './fixtures.js';
import {createApp} from '../server/app.js';
test('API de salones: guarda, bloquea empalmes/aforo y no elimina salones ocupados',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'arte-rooms-'));const file=path.join(dir,'book.xlsx');
 const store=new Store(file);await store.init();await store.mutate(()=>fixture());
 const runtime=await createApp({env:{EXCEL_PATH:file,ADMIN_PASSWORD:'initial-password',PUBLIC_URL:'http://localhost'}});
 const server=runtime.app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api';let cookie;
 const req=(url,body)=>fetch(base+url,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 const data=async()=>(await req('/academic')).json();
 const change=async(url,body)=>req(url,{...body,revision:(await data()).revision});
 try{
  const login=await req('/login',{password:'initial-password'});cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await change('/academic/save',{collection:'salones',item:{id:'R1',nombre:'Taller',edificio:'CEDES',numero:'319',capacidad:30,dias:'Lun',horario:'08:00-18:00'}})).status,200);
  let a=await data();assert.equal(a.salones.length,1);
  assert.equal(a.salones[0].nombre,'CEDES-319');
  assert.equal((await change('/academic/save',{collection:'salones',item:{id:'R2',nombre:'Duplicado',edificio:'cedes',numero:'319',capacidad:30,dias:'Lun',horario:'08:00-18:00'}})).status,400);
  assert.equal((await change('/academic/save',{collection:'prestamos',item:{id:'P1',profesor:'L001',semestre:'FJ27',departamento:'Diseño',udc:3,comentarios:''}})).status,200);
  assert.equal((await data()).cargas.find(c=>c.profesor==='L001').total,4.5);

  assert.equal((await change('/academic/save',{collection:'ofertas',item:{...a.ofertas[0],alumnos:25}})).status,200);
  a=await data();const session={...a.sesiones[0],aula:'R1'};
  assert.equal((await change('/academic/save',{collection:'sesiones',item:session})).status,200);
  const revision=(await data()).revision;
  assert.equal((await change('/academic/save',{collection:'sesiones',item:{...session,id:'S2',horario:'12:00-14:00'}})).status,400);
  assert.equal((await data()).revision,revision);
  assert.equal((await change('/academic/save',{collection:'ofertas',item:{...a.ofertas[0],alumnos:31}})).status,400);
  assert.equal((await change('/academic/save',{collection:'sesiones',item:{...session,horario:'07:00-10:00'}})).status,400);
  assert.equal((await change('/academic/save',{collection:'sesiones',item:{...session,aula:'unknown'}})).status,400);
  assert.equal((await change('/academic/delete',{collection:'salones',id:'R1'})).status,400);
  assert.equal((await data()).salones.length,1);
 }finally{await new Promise(r=>server.close(r));await runtime.close();await rm(dir,{recursive:true,force:true});}
});
