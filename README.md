# Coordinación Académica

PWA para oferta semestral de unidades de formación, grupos, responsabilidad docente, coordinación y horarios. React + Node.js + PostgreSQL en Netlify/Neon; también funciona localmente con persistencia Excel. Identidad visual azul y cian, superficies translúcidas y tipografías Manrope/Sora locales, adaptadas del archivo de referencia `ui`.

**Actualización del modelo:** consulta [la guía de uso y migración](docs/GUIA_ACADEMICA.md). Para publicar desde cero, sigue [Netlify paso a paso](DEPLOY_NETLIFY.md).

## Ejecutar en tu computadora

Requiere Node 22.12+ (validado con Node 24).

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173`. Mantén la terminal abierta. Administrador inicial: contraseña `admin-demo`, usuario vacío. Profesores locales ficticios: L001/L002/L003. En producción los profesores entran con nómina/correo y contraseña configurada por un administrador. Al crear la primera cuenta de administrador se deshabilita el acceso compartido inicial, también en local.

```bash
npm run build
```

Para servir el build, define `PUBLIC_URL=http://localhost:3000` y ejecuta `npm start`. En Windows CMD:

```bat
set "PUBLIC_URL=http://localhost:3000"
npm start
```

Para cargar `.env`, usa `node --env-file=.env server/index.js`; `npm start` hereda variables del sistema y no carga `.env` por sí mismo. Nunca subas secretos a GitHub.

## Modelo académico

- **UF:** catálogo de materias y bloques con UDC base.
- **Oferta:** una UF y grupo específicos de un semestre; clave única y número de grupo independientes, ambos texto. La clave no puede repetirse dentro del mismo semestre. No se deducen periodos a partir del código de grupo: 300 puede representar P3 o P1–P2.
- **Participación:** profesor y porcentaje fijo para toda la duración de una oferta. Debe sumar exactamente 100 % para publicar; borradores pueden estar incompletos, pero nunca superar 100 %. Máximo dos decimales en porcentajes.
- **Coordinación:** un coordinador por bloque, con UDC adicionales fijadas por el administrador. Puede ser también docente. Las materias no admiten coordinación.
- **Sesión:** docentes participantes, días, horario, aula y segmentos reales. El porcentaje de responsabilidad no sustituye a la programación de sesiones.
- **Semestre:** lunes inicial, tres periodos de cinco semanas y dos semanas intermedias; 17 semanas calendario.

Ordinarias: 5 semanas (P1/P2/P3), 10 (P1,P2 o P2,P3), 15 (P1,P2,P3). Intensivas: materias de una semana en I1 o I2, únicamente de lunes a viernes. Las UF/grupos de 15 semanas e intensivas usan códigos capturados por el administrador porque no se especificó una regla institucional para generarlos.

Carga semestral = suma de UDC de cada grupo × responsabilidad/100 + UDC de coordinación. Cada grupo suma una sola vez, aunque abarque varios periodos. Cátedra: 10 UDC; planta: 14. Intensivas y coordinación están incluidas. No existe un tope por periodo; se muestran horas semanales y grupos para ayudar a distribuir actividades.

Sobrecargas requieren aprobación con motivo, administrador y fecha. La aprobación está vinculada a las asignaciones, el tipo de profesor y sus UDC; si cambia esa combinación debe revisarse de nuevo. El sistema muestra una vigencia académica sugerida para cátedra entre su primera y última participación, incluyendo coordinación; no genera ni sustituye contratos laborales.

## Trabajo diario

1. Define fechas del semestre y clasifica profesores como cátedra o planta.
2. Revisa las UF (materia/bloque) y UDC.
3. Crea ofertas con clave única, grupo, duración, periodos y UDC del grupo.
4. Distribuye 100 % entre docentes; asigna coordinación en bloques.
5. Programa sesiones sin conflictos de profesor o aula.
6. Revisa y aprueba sobrecargas cuando corresponda.
7. Publica cada oferta y comparte el enlace privado desde Profesores.
8. El profesor acepta o solicita cambios. Editar asignaciones/horarios las vuelve a borrador y reinicia las respuestas afectadas; revisa, publica y comparte nuevamente.

## Persistencia y migración

Con `DATABASE_URL`, los datos se guardan en PostgreSQL en `arte_workbook.data` como un documento JSONB validado por el servidor. Las mutaciones usan transacciones con bloqueo de fila y control de revisión; una escritura obsoleta recibe HTTP 409 en vez de sobrescribir otra. El documento conserva el modelo anterior y añade `academic` v2. Esta implementación es apropiada para el volumen actual (27 UF, 76 docentes, 4 administradores); no es una conversión a tablas SQL normalizadas por entidad.

Al arrancar la nueva versión:

- Se preserva una copia previa en `arte_workbook_backup` (o `.pre-v2.xlsx` junto al archivo local).
- Las asignaciones antiguas se convierten en ofertas **Borrador**, con clave anterior conservada, grupo vacío y profesores **Por clasificar**.
- Se conserva el horario, las UDC y la respuesta anterior para consulta, pero es obligatorio revisar duración/periodos, tipo de UF y fechas antes de publicar. Los 15 semanas/P1–P3 son una propuesta de migración, no una interpretación comprobada del Excel.
- La migración es idempotente: nuevos arranques no duplican registros ni reinician la programación ya migrada.

Cada cambio conserva una versión previa; se retienen las últimas 30 en `arte_workbook_history` o `.history.json` local. En Datos puedes restaurarlas preservando las cuentas y el historial actuales; los grupos restaurados quedan en borrador, las respuestas y aprobaciones se reinician. Los respaldos están en el mismo almacenamiento: exporta y conserva copias externas o configura los respaldos del proveedor para recuperación ante pérdida completa.

Sin `DATABASE_URL`, `data/Programación Arte FJ27.xlsx` conserva las tres pestañas anteriores más una pestaña interna oculta con el estado completo. Este archivo local incluye hashes de cuentas y no debe compartirse. Usa la exportación pública desde Datos, que excluye credenciales.

## Importación y exportación

Excel es opcional. Datos → Descargar Excel genera las pestañas `profesores`, `ufs`, `semestres`, `ofertas`, `participaciones`, `coordinaciones`, `sesiones`. Conserva los encabezados y las referencias por ID. Nóminas, claves y grupos son texto. Días `Lun,Mié`; horario `09:00-13:00`; segmentos `P1,P2`.

Importar (máximo 3 MB) reemplaza los datos académicos, conserva cuentas e historial y convierte ofertas/respuestas a borradores/pendientes. Exporta antes un respaldo. La plantilla antigua de tres pestañas no reemplaza esta estructura; los datos ya guardados en el sistema anterior se migran automáticamente. Los JSON exportados no incluyen hashes y sirven como respaldo legible, no como imagen completa de recuperación de PostgreSQL.

## Cuentas, permisos y enlaces

- Crea cuatro cuentas individuales en Usuarios y permisos. Contraseñas de 12–200 caracteres, almacenadas con scrypt y salt aleatorio.
- El primer acceso usa `ADMIN_PASSWORD` sin usuario. Tras crear la primera cuenta, ese acceso compartido queda deshabilitado. La sesión creadora pasa a la cuenta nueva.
- Las cuentas eliminadas o cuyas contraseñas cambiaron no conservan acceso con sesiones anteriores. No puedes eliminar la cuenta actual ni el último administrador.
- Profesor: accede con nómina o correo institucional y contraseña propia. En Profesores, el administrador usa Configurar acceso / Restablecer contraseña (12–200 caracteres). Las sesiones duran hasta ocho horas; un restablecimiento invalida las sesiones anteriores.
- Las contraseñas docentes se guardan como hashes scrypt, no se exportan ni se registran en auditoría. Importar Excel o restaurar datos académicos conserva las credenciales actuales; los profesores recuperados sin cuenta actual requieren nueva configuración.
- Compartir oferta envía un resumen y un enlace normal al portal. No concede acceso por sí mismo y no es necesario para iniciar sesión.
- No se aceptan clases en nombre de un profesor desde una cuenta administrativa.
- Historial: actor, fecha, operación y campos antes/después; nunca registra contraseñas o hashes de cuentas.

Sin SMTP, `OFFER_DELIVERY=manual` permite compartir ofertas personalmente. Con SMTP configura host, puerto, usuario, contraseña y remitente; STARTTLS obligatorio en puertos distintos de 465. El envío real requiere validación con tu proveedor.

## Publicación

Netlify utiliza `netlify.toml` y `netlify/functions/api.mjs`; conecta GitHub y establece `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (mínimo 32 caracteres), `OFFER_DELIVERY=manual`. `PUBLIC_URL` permite un dominio propio HTTPS; si no está definido, se utiliza la URL principal proporcionada por Netlify.

Un push a main puede iniciar un deploy si la publicación automática está habilitada. El código incluye la migración de Neon al iniciar la función; no hace falta borrar la base ni reemplazar secretos. `/api/config` expone la versión pública (`3.3.0`) sin datos privados.

También se incluye Dockerfile para un servidor propio. En producción: HTTPS, `NODE_ENV=production`, secretos fuertes, almacenamiento persistente y `TRUST_PROXY=1` solo detrás de un proxy de confianza. Con PostgreSQL, varias instancias comparten sesiones, límites de acceso y tokens.

## PWA y comprobaciones

El service worker guarda solo recursos estáticos; no cachea API ni datos privados. La aplicación avisa cuando hay una nueva versión. Sin conexión no se permite guardar. Instalación móvil requiere HTTPS o localhost; usa la URL propia de la aplicación, no un iframe de Google Sites.

```bash
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

`npm test`: reglas académicas, migración, Excel y API local. Para ejecutar la integración Netlify/PostgreSQL define `TEST_DATABASE_URL` en una base **aislada**; la prueba sustituye datos de prueba. Sin esa variable, esa prueba se omite explícitamente. `TEST_NETLIFY_BUNDLE` permite ejecutar la misma integración contra el paquete de Functions generado por Netlify.

La prueba de navegador usa una base Excel temporal, arranca un servidor en 31879 y verifica administración, publicación, aceptación docente y diseño móvil. Si Chromium ya está instalado, puedes establecer `BROWSER_EXECUTABLE` con su ruta. SMTP, publicación final y datos reales requieren comprobación en el destino.

## Rol Consulta (3.1)

En **Usuarios y permisos → + Usuario**, selecciona **Consulta · solo lectura**. Esta cuenta puede consultar todos los catálogos, ofertas (incluidos borradores), docentes, cargas y horarios. No puede editar, eliminar, publicar, aprobar, responder por profesores, compartir ofertas, administrar usuarios, exportar ni restaurar respaldos. No recibe contraseñas, historial ni comentarios privados de solicitudes. Inicia sesión en la pestaña Consulta con usuario y contraseña. Las cuentas anteriores conservan su rol de administrador. Cambiar el rol de una cuenta invalida sus sesiones anteriores. Siempre debe permanecer al menos un administrador.
