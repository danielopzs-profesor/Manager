# Publicación, microprogramación y actualización local — 4.6.0

## Publicar antes de microprogramar

El administrador puede publicar una oferta sin sesiones completas o con empalmes de docentes/salón. La información de horario pendiente y los conflictos siguen apareciendo como advertencias. Se conservan los requisitos de responsabilidad total, grupo/clave, calendario del semestre, coordinación de bloques, contrato definido y aprobación de sobrecarga. También se conservan las validaciones de capacidad y horario de trabajo de los salones cuando esos datos se capturan.

Los conflictos entre versiones pendientes de dos administradores siguen requiriendo revisión antes de publicar; no son conflictos de horario.

## Pestaña Coordinación

Quien tenga asignada una coordinación ve **Coordinación**. Abre el grupo y entra a **Sesiones y horarios → + Sesión / Editar / Eliminar**. Puede seleccionar docentes con responsabilidad en ese grupo, días, horas, salón y periodos.

Solo puede programar los grupos que coordina. También conserva el permiso de distribuir responsabilidad docente en ellos. No puede modificar UDC del grupo, roles, profesores del catálogo, coordinación de otros grupos, aprobar sobrecargas ni publicar. Los cambios de sesiones mantienen la publicación si la oferta ya estaba publicada, y reinician las confirmaciones para que los docentes revisen el nuevo horario. Cambiar responsabilidad, carga u otros datos de oferta conserva el proceso de revisión administrativa.

## Botón Actualizar aplicación

Después de instalar esta versión una vez mediante Git, los administradores pueden usar **Actualizar aplicación** en la cabecera de la versión web local. Aparece cuando el servidor se inicia en modo local con DATABASE_URL de Neon. No se habilita en Netlify/Hostinger de producción y solo acepta peticiones desde la misma computadora.

1. Guarda todos los formularios y avisa a quienes estén usando esa instalación.
2. Pulsa **Actualizar aplicación** y confirma.
3. El proceso comprueba rama web-deploy, repositorio autorizado y ausencia de cambios locales sin guardar. Busca cambios, avanza solo si es posible sin sobrescribir historia local, instala dependencias y reinicia.
4. Espera mientras aparece el progreso. La página vuelve a cargar al terminar y conserva la conexión y la sesión de Neon, salvo vencimiento normal o cambios de credenciales/permisos.

La actualización se hace en la computadora que ejecuta el servidor; pulsa el botón en PC y en iMac por separado. No publica Netlify ni cambia la base de datos por una copia. Las migraciones que incluya una versión sí se ejecutan al arrancar y pueden afectar la base compartida, como en una actualización manual.

Los requisitos son Git y Node/npm instalados, acceso de Git al repositorio, rama web-deploy limpia y supervisor activo: npm run dev en PC, o los dos LaunchAgents ya configurados en iMac. El servidor guarda su clave de sesión local en `.local/session-secret` si SESSION_SECRET no está definido en .env; no borres esa carpeta ni la subas a Git. Si ya tienes SESSION_SECRET en .env se conserva. Neon almacena las sesiones de forma persistente. Una instalación sin Neon no ofrece este botón porque el almacenamiento local de sesiones no sobrevive al reinicio.

La activación inicial de la clave persistente puede pedir iniciar sesión una vez después de actualizar manualmente. Las siguientes actualizaciones conservan la sesión. La clave y .env no se distribuyen ni se modifican con Git. La aplicación debe seguir corriendo para usar el botón; no arranca sola en la PC a menos que configures un servicio de Windows. En la iMac conserva el inicio automático de LaunchAgents.

Si Git encuentra cambios locales, se detiene sin descartarlos. Si falla una instalación, se puede reintentar cuando el servidor siga accesible. Una interrupción fuerte puede requerir recuperación manual (`npm ci` y reinicio de servidores); el botón no garantiza recuperar una instalación incompleta sin que el servidor vuelva a arrancar. Las tareas en curso interrumpidas se liberan para reintentar al cabo de 30 minutos. No cierres ni suspendas la computadora mientras actualiza.

## Instalación inicial de esta versión

PC: detén con Ctrl+C los servidores, abre la carpeta del proyecto en VS Code y ejecuta cada línea:

```powershell
git fetch origin
git switch web-deploy
git pull --ff-only origin web-deploy
npm ci
npm run dev
```

Conserva `.env`. Abre http://localhost:5173. No ejecutes simultáneamente los dos servidores manuales anteriores.

En iMac, con el usuario alumno, detén primero los servicios automáticos:

```bash
launchctl bootout gui/$(id -u)/com.tecmty.servidor
launchctl bootout gui/$(id -u)/com.tecmty.interfaz
cd /Users/alumno/Documents/Github/TecMty
git fetch origin
git switch web-deploy
git pull --ff-only origin web-deploy
npm ci
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tecmty.servidor.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tecmty.interfaz.plist
```

Si un servicio no estaba cargado, revisa si estaba corriendo en una terminal manual y detenla antes de continuar. Si Git avisa de cambios locales o conflictos, no los descartes sin revisarlos. Abre http://localhost:5173 y recarga la página. Después podrás utilizar el botón en esa computadora.
