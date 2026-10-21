# Borradores y perfiles vinculados (4.1)

## Guardar una oferta incompleta

En Ofertas, selecciona la unidad de formación y el semestre. Puedes dejar pendientes la clave, el grupo y los periodos. Guarda los cambios para conservar el borrador. En Sesiones y horarios debes seleccionar el grupo; docentes, días, horas, salón y periodos pueden completarse después.

Al cambiar la duración o modalidad vuelve a seleccionar los periodos. Las sesiones anteriores se conservan: revísalas en Sesiones y horarios para que sus periodos correspondan al grupo. La tarjeta de oferta muestra lo pendiente antes de publicar. Los datos incompletos no autorizan la publicación ni la aceptación docente. Un horario incompleto no cuenta como tiempo reservado en las gráficas.

Los conflictos comprobados de salón, aforo y disponibilidad siguen mostrando un error que debe corregirse. Una modificación relevante de una oferta publicada la devuelve a borrador y requiere revisar su publicación y confirmaciones.

## Combinar una cuenta administrativa con un profesor

1. Abre Usuarios y edita la cuenta administrativa que quieres conservar.
2. En «Combinar con perfil de profesor (opcional)», selecciona el profesor existente.
3. Guarda. Se conservan el perfil docente y sus asignaciones. No se crea otro profesor.
4. La cuenta administrativa conserva su usuario y contraseña. Después de combinar, también admite el correo del profesor como usuario, con esa misma contraseña administrativa. La contraseña docente anterior no sustituye la administrativa.

Si existe una cuenta adicional sin privilegios administrativos vinculada al mismo profesor, se retira ese acceso duplicado. Si el profesor ya está vinculado a otra cuenta administrativa, la aplicación pide revisar las cuentas antes de combinar. Las identidades de superadministrador están protegidas. Solo un superadministrador puede otorgar o retirar permisos administrativos.

## Actualizar la computadora de oficina

En la terminal de Visual Studio Code, dentro de la carpeta del proyecto, detén la aplicación con Ctrl+C. Ejecuta cada línea por separado:

```powershell
git status
git fetch origin
git switch web-deploy
git pull --ff-only origin web-deploy
npm ci
npm run dev
```

Si `git status` muestra cambios propios sin guardar, respáldalos antes de cambiar de rama; no uses comandos para descartarlos. Si Git reporta conflictos o que no puede avanzar, conserva el mensaje para revisar el caso. Abre http://localhost:5173. Conserva tu archivo `.env`; estas instrucciones no cambian las credenciales de Neon. Las pruebas locales que usan la misma base de datos compartida modifican información real.
