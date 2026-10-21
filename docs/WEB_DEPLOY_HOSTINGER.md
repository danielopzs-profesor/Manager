# Rama web-deploy · versión 4.0

Esta rama contiene la preparación para Hostinger y los cambios funcionales. No migra servicios por sí sola y no cambia main. Antes de publicar confirma que el plan concreto incluya aplicaciones Node.js persistentes, variables privadas, HTTPS y el almacenamiento/base necesarios. El nombre Unlimited no garantiza PostgreSQL administrado; si no lo incluye, mantener Neon o planear una migración de base separada. No se ha implementado un adaptador MariaDB/MySQL.

## Política de acceso verificada

Identidades confirmadas por el responsable, en config/access-policy.json:

- Superadministradores permanentes: danielopzs (Daniel) y L03545260 (Pamela).
- Administración inicial: danielopzs, germanvazquez, gigidiconstanzo y marianaparedes. Daniel conserva su capacidad administrativa como superadministrador; Pamela es la segunda superadministradora.
- Las demás cuentas administrativas pasan a Profesor si están vinculadas a un docente y a Consulta si no lo están. La coordinación se deriva de los grupos realmente coordinados, no de un permiso global.

La política se aplica una sola vez, dentro de una transacción. Busca coincidencias exactas en usuarios, identificadores docentes o correos, no por nombre. Si alguna identidad no se encuentra, no aplica cambios parciales y detiene el arranque para corregir el dato. Si Pamela existe solo como profesora, se protege ese perfil sin inventar otra contraseña. Inicia sesión con su correo institucional. Si no tenía contraseña, Daniel puede configurar su primer acceso; después solo Pamela puede cambiar esa credencial protegida.

Para activarla localmente en PowerShell, en la misma terminal donde configuraste DATABASE_URL:

```powershell
$env:ENFORCE_NAMED_ROLES='1'
npm.cmd run dev
```

Esto modifica los roles en la base conectada. Está autorizado por el responsable, pero asegúrate de que sea la base deseada y conserva un respaldo antes de ejecutarlo. Tras aplicar la política, las sesiones con roles anteriores se invalidan: inicia sesión nuevamente.

Para producción usa `npm run start:web`. Ese arranque activa la política nominativa y usa NODE_ENV=production. No uses un arranque de demostración para publicar el servicio. `/api/config` muestra la versión; las contraseñas y la conexión de base nunca se publican en ese endpoint.

Solo superadministradores pueden otorgar/revocar administración. En Profesores se muestra una casilla Administrador, no un botón que otorgue ese rol al editar el perfil. Las casillas de superadministradores son permanentes y están deshabilitadas. Importación, eliminación y restauración no pueden degradar esos perfiles. Las cuentas antiguas sin rol explícito reciben Consulta, no administración.

## Coordinación

Un profesor que figura en coordinaciones tiene la pestaña Coordinación. Puede agregar, editar o retirar participaciones docentes y porcentajes solo en esos grupos. El servidor comprueba tanto el grupo solicitado como el registro previo, por lo que no puede mover una participación desde otro grupo. No puede publicar, aprobar sobrecargas, configurar salones, gestionar usuarios ni editar otros catálogos. Para aceptar sus propias clases utiliza Mis respuestas.

## Contratos

Planta: 14 UDC; Cátedra: 10 UDC. Cátedra interna y Préstamo recibido usan el tope semestral que el administrador capture para cada profesor. No se asigna un tope inventado. Préstamo recibido exige Área de origen, habilitada solo para ese tipo. Esto es distinto de Préstamos a otros departamentos, que siguen consumiendo el tope semestral como antes.

## Historial

Categorías: accesos (inicio/cierre de sesión), errores, cambios, respuestas, aprobaciones, datos y seguridad. Incluye quién entró y cuándo. No almacena contraseñas, tokens ni cadenas de conexión en los eventos.

Descarga el TXT completo o la categoría seleccionada antes de borrar. El borrado requiere escribir BORRAR HISTORIAL y deja un evento de limpieza. Los respaldos anteriores pueden conservar eventos previos y se mantienen como máximo las 30 versiones anteriores de datos. El historial activo conserva como máximo 10 000 eventos. Los eventos de acceso/error no crean 30 copias adicionales de la base y no cambian la revisión académica; los cambios funcionales mantienen respaldos y control de concurrencia.

## Datos y fichas

- Datos: Excel XLSX como exportación/plantilla. El formato admite área y tope de los nuevos contratos y conserva compatibilidad con plantillas anteriores.
- Reporte PDF: resumen del semestre, gráficas de contratos y carga UDC, y listas de carga y grupos. Es un PDF descargable, no una captura de la página.
- Fichas JPEG: descarga desde las tarjetas de profesor, UF y asignación/grupo. Incluyen los datos resumidos de la ficha, no contraseñas ni controles de administración. El administrador puede compartir el archivo fuera de la plataforma; el sistema no envía mensajes automáticamente.

## Configuración de Hostinger cuando se autorice la migración

1. Conecta GitHub y selecciona la rama web-deploy.
2. Usa Node.js 24 y la raíz del repositorio como carpeta de aplicación.
3. Instala con npm ci y compila con npm run build.
4. Configura variables privadas: NODE_ENV=production, PUBLIC_URL con la dirección HTTPS final, SESSION_SECRET de al menos 32 caracteres, ADMIN_PASSWORD privado y TRUST_PROXY=1 si Hostinger termina HTTPS delante de Express. Conserva el puerto que asigne el proveedor.
5. Configura DATABASE_URL si continuarás con PostgreSQL. Para operar sin un proveedor externo, hay que verificar PostgreSQL propio o planear y probar otra persistencia. El modo Excel local requiere disco persistente, una sola instancia y respaldos privados; no migra cuentas desde una exportación pública XLSX.
6. Arranque: npm run start:web (entrada server/hostinger.js).
7. Comprueba /api/config versión 4.0.0, login de Daniel y Pamela, un administrador normal, un profesor y un coordinador, descargas y permisos negativos antes de cambiar el DNS.
8. Conserva Netlify y el respaldo hasta comprobar la migración. No se han cambiado DNS ni cuentas de Hostinger desde esta tarea.

main sigue siendo la versión estable anterior. Los commits en web-deploy no deben incorporarse a main ni activar una migración de datos sin revisión del responsable.

## Regreso a una versión anterior

Conservar main permite regresar al código anterior, pero no revierte la base automáticamente. Los nuevos roles y contratos pueden no ser compatibles con una versión vieja; conserva un respaldo completo y privado antes de activar la política o migrar. Volver al código antiguo puede requerir recuperar una base compatible. No uses el XLSX público como respaldo de cuentas y contraseñas.
