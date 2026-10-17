# Publicar Arte FJ27 en Netlify, paso a paso

No necesitas mantener tu computadora encendida ni instalar programas. Necesitas tu cuenta de GitHub, una cuenta de Netlify y una base de datos en Neon. Netlify sirve la página y ejecuta el servidor mediante Functions; Neon conserva horarios, sesiones y enlaces privados. Consulta los precios y límites actuales de ambos proveedores antes de elegir un plan; no se garantiza alojamiento ilimitado gratuito.

## 1. Crear la base de datos

1. Abre https://console.neon.tech/ y crea una cuenta; puedes usar GitHub.
2. Crea un proyecto llamado `arte-fj27`. Elige una región cercana a la que usarás en Netlify.
3. Abre **Connect** o **Connection details**.
4. Activa **Connection pooling** si está disponible.
5. Copia la **Connection string**, una dirección que comienza con `postgresql://` o `postgres://`. Debe conservar las opciones TLS del proveedor, como `sslmode=require`. Es una contraseña de acceso a tus datos: no la publiques, no la subas a GitHub y no la pegues en el chat.
6. No necesitas crear tablas: la aplicación las prepara automáticamente. Usa esta base exclusivamente para esta aplicación.

## 2. Importar el repositorio en Netlify

1. Entra a https://app.netlify.com/ y crea una cuenta o inicia sesión.
2. Pulsa **Add new project** → **Import an existing project**. Según la versión del panel puede decir **Add new site**.
3. Elige **GitHub** y autoriza el acceso al repositorio `danielopzs/TecMty`.
4. Selecciona ese repositorio y la rama `main`.
5. Deja **Base directory** vacío. La configuración `netlify.toml` incluida debe detectar:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. No uses la opción de arrastrar una carpeta (Deploy manually / Drop): necesitamos el despliegue desde GitHub para incluir el backend.

## 3. Configurar las variables

Antes de publicar, busca **Environment variables**. Si ese formulario no las muestra, puedes publicar primero y agregarlas en **Project configuration → Environment variables**. La página puede verse antes de configurar las variables, pero el acceso no funcionará hasta guardarlas y volver a desplegar.

Agrega una variable por fila. En los secretos selecciona **Contains secret values** cuando exista esa opción. Deben estar disponibles para **Functions / Runtime**, no solo para Builds.

| Nombre           | Valor que debes introducir                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`   | La dirección privada copiada de Neon.                                                                                                |
| `ADMIN_PASSWORD` | Una contraseña nueva, larga y exclusiva para el administrador. No uses `admin-demo`.                                                 |
| `SESSION_SECRET` | Un valor aleatorio de al menos 32 caracteres, generado con tu gestor de contraseñas. Es diferente de la contraseña de administrador. |
| `OFFER_DELIVERY` | `manual`                                                                                                                             |

No definas `NODE_ENV=development` ni variables que comiencen con `VITE_` para guardar contraseñas. Las funciones activan las protecciones de producción automáticamente. `PUBLIC_URL` es opcional al usar el dominio principal de Netlify: la aplicación toma su variable automática `URL`.

Para generar `SESSION_SECRET` si no tienes gestor de contraseñas: abre **Windows PowerShell** desde Inicio, ejecuta este comando y copia el resultado únicamente en el panel de Netlify:

```powershell
[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
```

## 4. Publicar y abrir

1. Pulsa **Deploy** / **Deploy project**.
2. Espera hasta que el despliegue indique **Published** o **Production deploy published**.
3. Abre el enlace principal, por ejemplo `https://nombre-del-proyecto.netlify.app`.
4. Si agregaste variables después del primer despliegue, abre **Deploys → Trigger deploy → Deploy project** y espera de nuevo. Guardar variables no sustituye este paso.
5. Entra como **Administrador** con la contraseña que definiste. El valor `admin-demo` ya no es el acceso público.

Si configuras un dominio propio, agrega `PUBLIC_URL=https://tu-dominio` y vuelve a desplegar. Accede y comparte siempre esa misma dirección; los otros dominios y las vistas previas pueden mostrar «Origen no permitido». Desactiva los deploy previews o configúralos con una base de datos independiente para que no modifiquen datos reales.

## 5. Cargar tu programación

1. Primero aparecerán datos ficticios para que compruebes el funcionamiento.
2. Pulsa **↓ Excel** para descargar una plantilla con las siete pestañas académicas.
3. Prepara tu archivo respetando el formato descrito en README.md.
4. Pulsa **↑ Importar**, elige el archivo y confirma. El máximo es **3 MB**. Esta operación reemplaza toda la programación; exporta un respaldo antes.
5. Comprueba los profesores y horarios.

En Netlify, los datos vigentes viven en Neon. Importar envía los datos del Excel a Neon; exportar genera un Excel actualizado. El archivo de tu computadora no cambia automáticamente. Ninguna función escribe archivos permanentes en Netlify.

## 6. Dar acceso a los profesores

En producción no se permite entrar solo con una nómina conocida.

1. Entra como administrador y pulsa **Ver detalle** junto al profesor.
2. Pulsa **Enviar / compartir oferta**.
3. Con `OFFER_DELIVERY=manual` aparecerá el resumen y un **enlace privado**.
4. Copia el enlace completo y envíalo solo al profesor correspondiente por correo o mensaje privado.
5. El profesor abre ese enlace, selecciona **Profesor** e ingresa su nómina o correo tal como aparece en el Excel.

El enlace vence en 48 horas y se usa una sola vez para iniciar sesión. La sesión dura hasta 8 horas; si necesita ingresar de nuevo, genera otro enlace. Los enlaces y las sesiones ahora sobreviven a los reinicios de funciones y a nuevos despliegues si conservas la misma base y `SESSION_SECRET`.

Para enviar correos automáticamente, configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM` con tu proveedor. Al existir SMTP se envía el mensaje en vez de mostrar el enlace. Debes probar el envío real con una cuenta de prueba. No se pueden usar las credenciales de correo habituales si el proveedor exige una contraseña de aplicación o un servicio SMTP específico.

## 7. Comprobar antes de compartir

- Entra como administrador, edita una clase y recarga: el cambio debe permanecer.
- Exporta el Excel y comprueba el cambio.
- Comparte una oferta de prueba y entra desde una ventana privada como profesor.
- Acepta una clase y comprueba su estatus desde el administrador.
- Publica otra vez sin cambiar la base y confirma que los datos se conservan.

Si dice «Servicio no disponible», revisa las variables, su alcance Functions y las credenciales/permisos de la base. Consulta **Logs & metrics → Functions → api** (o **Functions → api → Logs**, según el panel). No compartas registros que incluyan credenciales.

Para Google Sites, agrega un botón o enlace a la aplicación publicada. Abre el acceso en una pestaña propia: incrustarlo dentro de un marco puede impedir las cookies de sesión en algunos navegadores.

## Para mantenimiento técnico

Se usan transacciones PostgreSQL y bloqueo de la fila de programación para evitar pérdidas de cambios entre funciones concurrentes. Las tablas son `arte_workbook`, `arte_session`, `arte_offer` y `arte_login_limit`. Los tokens se almacenan como hashes SHA-256 y se consumen atómicamente. Los límites de login se comparten entre instancias. No uses la misma base para varios proyectos independientes. Conserva exportaciones y configura los respaldos de Neon según el plan contratado.

`npm test` valida el modo local. Para incluir la integración serverless con PostgreSQL real, define `TEST_DATABASE_URL` apuntando a una base **aislada de pruebas**, y ejecuta `npm test`. La prueba sobrescribe la programación de esa base. Nunca uses datos reales para esa variable.

## Actualizar desde la versión anterior

Consulta [GUIA_ACADEMICA.md](docs/GUIA_ACADEMICA.md). Mantén DATABASE_URL y SESSION_SECRET actuales. No borres ni recrees Neon. La nueva función guarda copia previa y migra automáticamente. Después, clasifica los docentes, revisa las UF/grupos/periodos y crea las cuentas individuales. La contraseña inicial deja de servir cuando existe la primera cuenta individual; se solicitará usuario y contraseña. Los registros migrados son borradores, no ofertas listas para enviar.

Comprueba que `/api/config` devuelva `version: "3.1.0"` después de que Netlify publique main. Si GitHub no dispara un deploy automáticamente, usa Deploys → Trigger deploy.
