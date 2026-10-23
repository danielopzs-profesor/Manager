# Salones, edición simultánea y coordinación — 4.4.1

## Salones de Escuela de Arte

En Salones → + Salón, los edificios `ATLI`, `Escuela de Arte` y `Escuela Arte` identifican el mismo edificio. Al escribir uno de esos nombres, las sugerencias se limitan a códigos `A-EA-…`. Al capturar el número se genera el código compacto: 110 → `A-EA-110`. Están incluidos 107, 110 y 114. El código se guarda automáticamente y lo acepta el Excel de entrega. No se crean aulas con capacidad u horario inventados: captura esos datos al registrar cada salón.

Si ya existe ATLI-110, no se permite registrar otro salón 110 con el alias Escuela de Arte. Edita el existente. Los otros edificios conservan sus formatos oficiales con espacios cuando correspondan.

## Dos administradores editando

Los formularios de Ofertas, Responsabilidad docente, Sesiones y Coordinación conservan una copia de la versión que abriste.

- Si otro administrador modifica un registro diferente, puedes guardar normalmente. Cada guardado vuelve a validar disponibilidad, aforo, porcentajes y referencias.
- Si modifican el mismo registro, el primer guardado queda aplicado y el segundo se conserva en la base como **edición pendiente**. Un mensaje confirma que tu trabajo está guardado.
- Abre **Ofertas → Ediciones pendientes**. Compara las diferencias, elige **Revisar cambios**, ajusta los valores y guarda. Esto aplica la edición revisada y deja el grupo en borrador. También puedes descartar la pendiente si decides conservar la versión actual.
- No se publica un grupo con ediciones pendientes. No se aplican automáticamente al terminar la sesión de otra persona: requieren revisión explícita para evitar sobrescrituras.
- Las ediciones pendientes no aparecen en el formato de entrega ni alteran la oferta oficial hasta que se aplican. Los registros nuevos incompatibles con el estado actual pueden requerir corregir una asignación duplicada o un horario antes de aplicarse.
- La revisión está disponible a administradores. Un coordinador puede conservar su edición simultánea de responsabilidad únicamente en sus propios grupos; un administrador revisa la pendiente.

Las pantallas de seguridad, importación, restauración y eliminación mantienen la comprobación estricta de revisión. Las versiones anteriores de la app no envían la copia original del formulario: actualiza y recarga ambas computadoras para usar el guardado simultáneo nuevo.

## Coordinación por grupo

En Ofertas, cada ficha de **Bloque** muestra su coordinación y el botón **Asignar coordinador** o **Editar coordinador**. También están disponibles dentro de **Ver asignación → Coordinación del bloque**.

Selecciona el profesor y captura las UDC adicionales, fijadas por el administrador para ese grupo. El coordinador puede ser también docente. Las UDC se suman a su carga semestral y respetan las reglas de sobrecarga. Solo se ofrece coordinación para bloques; las materias no tienen coordinador. No se permite más de una coordinación por grupo.

## Actualizar PC (Windows)

En Visual Studio Code, dentro de la carpeta TecMty, detén con Ctrl+C las terminales donde estén corriendo los servidores. Ejecuta cada línea por separado:

```powershell
git status
git fetch origin
git switch web-deploy
git pull --ff-only origin web-deploy
npm ci
npm run dev
```

Esta versión carga `.env` al usar `npm run dev`; ya no hace falta arrancar el backend por separado. Conserva `.env` con la conexión de Neon. Abre http://localhost:5173 y recarga con Ctrl+F5. No abras además los dos servidores manuales anteriores.

Si `git status` muestra modificaciones propias o Git detiene el cambio de rama, conserva el mensaje y revisa esos cambios antes de continuar. No uses `reset --hard` ni borres `.env`.

## Actualizar iMac con arranque automático

Abre Terminal como el usuario alumno. Primero detén los servicios automáticos:

```bash
launchctl bootout gui/$(id -u)/com.tecmty.servidor
launchctl bootout gui/$(id -u)/com.tecmty.interfaz
```

Si indica que un servicio no está cargado, comprueba si lo estabas ejecutando manualmente y detén esa terminal con Control+C antes de continuar. Si aparece otro error, conserva el mensaje.

Actualiza la carpeta:

```bash
cd /Users/alumno/Documents/Github/TecMty
git status
git fetch origin
git switch web-deploy
git pull --ff-only origin web-deploy
npm ci
```

Conserva `.env` y vuelve a activar los servicios ya configurados:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tecmty.servidor.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.tecmty.interfaz.plist
```

Abre http://localhost:5173 y recarga con Command+Shift+R. Si funciona, puedes cerrar Terminal y Visual Studio Code. No ejecutes también `npm run dev` mientras los servicios automáticos estén activos. La rama a usar para estas pruebas web es `web-deploy`; `desktop-app` es el proyecto de instalador.

Ambas computadoras deben usar la misma base Neon para ver las ediciones de la otra. Estos pasos actualizan el código; no requieren volver a importar la programación ni reemplazar la base de datos.
