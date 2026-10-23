const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=process.argv[2],dir=path.join(root,'.local'),file=path.join(dir,'update-state.json');
if(process.argv[3]==='restart'){setTimeout(()=>{const now=new Date();fs.utimesSync(path.join(root,'server','index.js'),now,now);},1200);return;}
const job=JSON.parse(fs.readFileSync(file,'utf8'));
const state=(phase,message)=>{Object.assign(job,{phase,message,updatedAt:new Date().toISOString()});fs.writeFileSync(file+'.tmp',JSON.stringify(job));fs.renameSync(file+'.tmp',file);};
const run=(command,args)=>execFileSync(command,args,{cwd:root,encoding:'utf8',timeout:command===process.execPath?600000:90000,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+(process.env.PATH||''),GIT_TERMINAL_PROMPT:'0'},stdio:['ignore','pipe','pipe']}).trim();
function npmPath(){const bin=path.dirname(process.execPath),candidates=[process.env.npm_execpath,path.join(bin,'node_modules/npm/bin/npm-cli.js'),path.join(bin,'../lib/node_modules/npm/bin/npm-cli.js')];try{candidates.push(fs.realpathSync(path.join(bin,'npm')));}catch{}return candidates.find(p=>p&&p.endsWith('.js')&&fs.existsSync(p));}
try{
 state('checking','Comprobando rama y cambios locales…');
 if(run('git',['branch','--show-current'])!=='web-deploy')throw Error('Esta instalación debe estar en la rama web-deploy.');
 const remote=run('git',['remote','get-url','origin']);if(!/^(https:\/\/github\.com\/danielopzs\/TecMty(?:\.git)?|git@github\.com:danielopzs\/TecMty\.git)$/.test(remote))throw Error('El repositorio configurado no es el repositorio autorizado TecMty.');
 if(run('git',['status','--porcelain']))throw Error('Hay cambios locales sin guardar. Revísalos antes de actualizar; no se descartó ningún archivo.');
 state('fetching','Buscando actualizaciones en GitHub…');run('git',['fetch','origin','web-deploy']);
 const before=run('git',['rev-parse','HEAD']),target=run('git',['rev-parse','origin/web-deploy']);
 if(before===target&&!job.retryInstall){state('complete','Esta computadora ya tiene la versión más reciente.');}
 else{
  try{run('git',['merge-base','--is-ancestor','HEAD','origin/web-deploy']);}catch{throw Error('La rama local tiene cambios que requieren revisión. No se sobrescribió el proyecto.');}
  const npm=npmPath();if(!npm)throw Error('No se encontró npm junto a Node.js. Revisa la instalación de Node antes de actualizar.');
  state('updating','Descargando los cambios…');run('git',['pull','--ff-only','origin','web-deploy']);
  state('installing','Instalando dependencias. Espera sin cerrar la computadora…');run(process.execPath,[npm,'ci','--no-audit','--no-fund']);
  job.version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
  state('ready','Actualización descargada. Reiniciando la aplicación…');
  const now=new Date();fs.utimesSync(path.join(root,'server/index.js'),now,now);
 }
}catch(error){job.failedPhase=job.phase;const message=error.code==='ENOENT'?'No se encontró Git en esta computadora. Instálalo y reinicia la aplicación antes de actualizar.':error.message?.startsWith('Command failed')?'No se pudo completar la actualización. Comprueba internet y el acceso de Git a GitHub. Si falló la instalación, vuelve a intentarlo. No se borraron tus datos ni .env.':error.message;state('failed',message);}
finally{try{fs.unlinkSync(path.join(dir,'update.lock'));}catch{}}
