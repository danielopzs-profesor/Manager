const { app, BrowserWindow, Menu, dialog, ipcMain, safeStorage, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { validateConfig } = require('./config.cjs');
let window,server,runtime,origin,config,quitting=false;
const settingsPath=()=>path.join(app.getPath('userData'),'connection.enc');
const setupUrl=()=>pathToFileURL(path.join(__dirname,'setup.html')).href;
function readableError(){return 'No se pudo conectar. Revisa la conexión de Neon, el acceso a internet y que esta base ya tenga los usuarios configurados. La configuración anterior se conserva. No compartas la conexión ni su contraseña.';}
async function saveConfig(value){
  if(!safeStorage.isEncryptionAvailable())throw Error('El cifrado del sistema no está disponible. Desbloquea el Llavero de macOS e intenta de nuevo.');
  const data=safeStorage.encryptString(JSON.stringify(value)),file=settingsPath();
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',data,{mode:0o600});await fs.rename(file+'.tmp',file);
}
async function stopServer(){if(server){const old=server;server=null;old.closeAllConnections();await new Promise(resolve=>old.close(resolve));}await runtime?.close();runtime=null;}
async function startServer(value){
  await stopServer();
  server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;const token=randomBytes(48).toString('hex');
  try{
    const { createApp }=await import(pathToFileURL(path.join(app.getAppPath(),'server/app.js')).href);
    runtime=await createApp({desktop:true,env:{NODE_ENV:'production',DATABASE_URL:value.databaseUrl,PUBLIC_URL:origin,SESSION_SECRET:value.sessionSecret,ADMIN_PASSWORD:value.bootstrapPassword,DESKTOP_TOKEN:token,ENFORCE_NAMED_ROLES:'1',OFFER_DELIVERY:'manual'}});
    server.on('request',runtime.app);
    window.webContents.session.webRequest.onBeforeSendHeaders({urls:[origin+'/*']},(details,callback)=>callback({requestHeaders:{...details.requestHeaders,'X-Arte-Desktop':token}}));
  }catch(error){await stopServer();throw error;}
}
const { createUpdateController } = require('./updater.cjs');
const checkUpdates=createUpdateController({app,autoUpdater,dialog,shell,getWindow:()=>window});
function installMenu(){Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'Aplicación',submenu:[{label:`Arte ${app.getVersion()}`,enabled:false},{label:'Buscar actualizaciones…',click:checkUpdates},{label:'Configurar conexión…',click:async()=>{const r=await dialog.showMessageBox(window,{message:'¿Cambiar la conexión de esta Mac?',detail:'Guarda tus cambios antes de continuar.',buttons:['Configurar','Cancelar'],cancelId:1});if(r.response===0)await window.loadFile(path.join(__dirname,'setup.html'));}},{type:'separator'},{role:'quit'}]},
  {label:'Edición',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
  {label:'Ventana',submenu:[{role:'minimize'},{role:'zoom'},{role:'togglefullscreen'}]},
]));}
async function openWindow(){
  window=new BrowserWindow({width:1280,height:900,minWidth:800,minHeight:640,title:'Arte — Programación académica',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(url!==setupUrl()&&(!origin||new URL(url).origin!==origin))event.preventDefault();});
  window.webContents.session.setPermissionRequestHandler((contents,permission,callback,details)=>callback(contents===window.webContents&&permission==='clipboard-sanitized-write'&&!!origin&&details.requestingUrl?.startsWith(origin+'/')));
  installMenu();
  if(config){try{await startServer(config);await window.loadURL(origin);return;}catch{await dialog.showMessageBox(window,{type:'error',message:readableError()});}}
  await window.loadFile(path.join(__dirname,'setup.html'));
}
if(!app.requestSingleInstanceLock())app.quit();else{
  app.on('second-instance',()=>{window?.show();window?.focus();});
  ipcMain.handle('desktop:configure',async(event,input)=>{
    if(event.sender!==window?.webContents||event.senderFrame?.url!==setupUrl())throw Error('Operación no autorizada');
    try{const next=validateConfig({...input,sessionSecret:config?.sessionSecret,bootstrapPassword:config?.bootstrapPassword});if(!safeStorage.isEncryptionAvailable())return {ok:false,error:'Desbloquea el Llavero de macOS para guardar la conexión cifrada.'};await startServer(next);await saveConfig(next);config=next;await window.loadURL(origin);return {ok:true};}catch{await stopServer();return {ok:false,error:readableError()};}
  });
  autoUpdater.autoDownload=false;autoUpdater.autoInstallOnAppQuit=false;autoUpdater.allowPrerelease=false;autoUpdater.allowDowngrade=false;autoUpdater.logger=null;autoUpdater.on('error',()=>{});
  app.whenReady().then(async()=>{process.chdir(app.getAppPath());try{if(safeStorage.isEncryptionAvailable())config=JSON.parse(safeStorage.decryptString(await fs.readFile(settingsPath())));}catch{config=null;}await openWindow();}).catch(()=>{dialog.showErrorBox('Arte','No se pudo abrir la aplicación. Reiníciala e intenta de nuevo.');app.quit();});
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',event=>{if(!quitting){event.preventDefault();quitting=true;stopServer().finally(()=>app.quit());}});
}
