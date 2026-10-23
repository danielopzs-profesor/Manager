import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {randomUUID} from 'node:crypto';import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),dir=path.join(root,'.local'),stateFile=path.join(dir,'update-state.json');
export const updatesEnabled=(env,production)=>!production&&!!env.DATABASE_URL&&env.ENABLE_LOCAL_UPDATES!=='0';
export async function readUpdateState(directory=dir){try{return JSON.parse(await fs.readFile(path.join(directory,'update-state.json'),'utf8'));}catch{return {phase:'idle',message:''};}}
export async function initializeLocalRuntime({directory=dir}={}){
 await fs.mkdir(directory,{recursive:true});
 const secretFile=path.join(directory,'session-secret');
 if(!process.env.SESSION_SECRET){try{await fs.writeFile(secretFile,randomUUID()+randomUUID(),{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}process.env.SESSION_SECRET=(await fs.readFile(secretFile,'utf8')).trim();}
 const state=await readUpdateState(directory);if(['ready','restarting'].includes(state.phase)){state.phase='complete';state.message='La aplicación se actualizó y conservó tu conexión.';await fs.writeFile(path.join(directory,'update-state.json'),JSON.stringify(state),{mode:0o600});}
}
export function registerLocalUpdates(app,{auth,admin,env,production,logEvent}){
 const enabled=updatesEnabled(env,production);
 const local=(req,res,next)=>{if(!enabled||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return res.status(403).json({error:'La actualización está disponible solo en esta computadora, en modo local y con Neon.'});next();};
 app.get('/api/local-update',auth,admin,local,async(req,res)=>{const state=await readUpdateState();if(['checking','fetching','updating','installing'].includes(state.phase)&&Date.now()-Date.parse(state.startedAt)>30*60*1000){state.phase='failed';state.message='La actualización se interrumpió. Puedes volver a intentarlo.';await fs.writeFile(stateFile,JSON.stringify(state));await fs.rm(path.join(dir,'update.lock'),{force:true});}res.json(state);});
 app.post('/api/local-update',auth,admin,local,async(req,res)=>{
  await fs.mkdir(dir,{recursive:true});
  if(['ready','restarting'].includes((await readUpdateState()).phase))return res.status(409).json({error:'La actualización está terminando. Espera al reinicio automático.'});
  try{const lockInfo=await fs.stat(path.join(dir,'update.lock'));if(Date.now()-lockInfo.mtimeMs>30*60*1000)await fs.rm(path.join(dir,'update.lock'),{force:true});}catch{}
  try{const lock=await fs.open(path.join(dir,'update.lock'),'wx');await lock.writeFile(String(Date.now()));await lock.close();}catch(e){if(e.code==='EEXIST')return res.status(409).json({error:'Ya hay una actualización en curso. Espera a que termine.'});throw e;}
  try{
   await fs.copyFile(path.join(root,'server/local-update-worker.cjs'),path.join(dir,'update-worker.cjs'));
   const previous=await readUpdateState();
   const state={retryInstall:previous.phase==='failed'&&previous.failedPhase==='installing',id:randomUUID(),phase:'checking',message:'Preparando actualización…',startedAt:new Date().toISOString()};await fs.writeFile(stateFile,JSON.stringify(state),{mode:0o600});
   const worker=spawn(process.execPath,[path.join(dir,'update-worker.cjs'),root],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});await new Promise((resolve,reject)=>{worker.once('spawn',resolve);worker.once('error',reject);});worker.unref();
   await logEvent({categoria:'seguridad',actor:req.session.adminId||req.session.nomina,accion:'Solicitar actualización local',detalle:'Actualizar código de web-deploy desde GitHub, conservando configuración local.'});res.status(202).json(state);
  }catch(error){await fs.rm(path.join(dir,'update.lock'),{force:true});throw error;}
 });
 app.post('/api/local-update/restart',auth,admin,local,async(req,res)=>{
  const state=await readUpdateState();if(state.phase!=='ready')return res.status(409).json({error:'La actualización aún no está lista para reiniciar.'});
  state.phase='restarting';await fs.writeFile(stateFile,JSON.stringify(state),{mode:0o600});
  const worker=spawn(process.execPath,[path.join(dir,'update-worker.cjs'),root,'restart'],{cwd:root,detached:true,stdio:'ignore',windowsHide:true});worker.unref();res.json({ok:true});setTimeout(()=>process.exit(0),400).unref();
 });
}
