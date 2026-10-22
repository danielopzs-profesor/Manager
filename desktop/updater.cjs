function createUpdateController({app,autoUpdater,dialog,shell,getWindow,platform=process.platform}) {
let updating=false,downloaded=false;
return async function checkUpdates(){
  if(!app.isPackaged||platform!=='darwin'){await dialog.showMessageBox(getWindow(),{message:'Las actualizaciones se verifican desde la versión instalada para Mac.'});return;}
  if(updating)return;updating=true;
  try{
    if(downloaded){const r=await dialog.showMessageBox(getWindow(),{message:'La actualización está descargada.',buttons:['Reiniciar e instalar','Más tarde'],cancelId:1});if(r.response===0)autoUpdater.quitAndInstall();return;}
    const result=await autoUpdater.checkForUpdates();
    if(!result?.isUpdateAvailable){await dialog.showMessageBox(getWindow(),{message:`Tienes la versión más reciente (${app.getVersion()}).`});return;}
    const answer=await dialog.showMessageBox(getWindow(),{message:`Hay una nueva versión: ${result.updateInfo.version}`,detail:'Se descargará desde las versiones publicadas en GitHub. La base de datos y la conexión guardada se conservan.',buttons:['Descargar actualización','Más tarde'],cancelId:1});
    if(answer.response===0){await autoUpdater.downloadUpdate();downloaded=true;const next=await dialog.showMessageBox(getWindow(),{message:'Actualización lista.',detail:'Termina de guardar tu trabajo antes de reiniciar.',buttons:['Reiniciar e instalar','Más tarde'],cancelId:1});if(next.response===0)autoUpdater.quitAndInstall();}
  }catch{
    const answer=await dialog.showMessageBox(getWindow(),{type:'error',message:'No se pudo completar la actualización.',detail:'Comprueba tu conexión. La actualización automática requiere una app para Mac firmada y una versión publicada compatible. Puedes revisar los instaladores en GitHub.',buttons:['Cerrar','Ver versiones publicadas'],cancelId:0});
    if(answer.response===1)await shell.openExternal('https://github.com/danielopzs/TecMty/releases');
  }finally{updating=false;}
};
}
module.exports={createUpdateController};
