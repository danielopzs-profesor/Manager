# Programación Arte FJ27

PWA responsiva con React, Vite, Express y ExcelJS. Node.js 22.12+ (validada con Node 24). El Excel es el almacenamiento del servidor; no hace falta una base de datos externa.

## Ejecutar localmente

```bash
npm ci --cache /workspace/.npm-cache
npm run dev
```

Abre http://localhost:5173. Fuera de este entorno puedes omitir `--cache`. El servidor escucha en 3000. Se genera `data/Programación Arte FJ27.xlsx` con **datos ficticios** solo si no existe. Administrador: contraseña `admin-demo`. Profesores: `L001`, `L002`, `L003` o sus correos de demostración. Estos accesos simplificados son exclusivamente para desarrollo.

```bash
npm test
npm run build
npm start
```

La compilación se sirve en http://localhost:3000; establece `PUBLIC_URL=http://localhost:3000` para que los formularios funcionen en ese modo. El frontend en desarrollo usa el proxy de Vite. `.env` no se carga automáticamente: usa `node --env-file=.env server/index.js`, o inyecta las variables con tu plataforma. `npm run dev` hereda las variables exportadas en la terminal.

## Excel integrador

Importa el archivo original desde Administración → Importar, **después de reestructurarlo**. No se ha proporcionado el Excel original; no se presupone su estructura ni se realiza una conversión automática de formatos desconocidos. La importación reemplaza toda la programación; primero exporta un respaldo.

Las columnas deben aparecer en este orden, con estos encabezados exactos:

| Pestaña | Columnas |
| --- | --- |
| Profesores | nomina, nombre, correo, udc_maximas |
| Materias | id_materia, nombre_materia, udc |
| Clases_Asignadas | id_clase, id_materia, nomina_profesor, dias, horario, aula, estatus, comentarios |

Nóminas e identificadores son texto; conserva ceros iniciales. `udc_maximas` vacío usa 14. Días: `Lun,Mar,Mié,Jue,Vie,Sáb,Dom`, sin espacios. Horario: `09:00-11:00`, con inicio anterior al fin. Estatus: `Pendiente`, `Aceptada`, `Cambio Solicitado`. Se rechazan claves duplicadas, referencias inexistentes, valores de carga inválidos y fórmulas. Importaciones hasta 5 MB. Administra materias en el Excel y vuelve a importarlo; profesores y clases también se crean y editan desde la interfaz.

Cada respuesta y edición actualiza el archivo mediante escritura temporal y reemplazo atómico. Las operaciones de la aplicación se serializan en un único proceso. La interfaz consulta cambios cada 15 segundos. Las ediciones externas se leen en la siguiente consulta; **no edites el archivo externamente mientras hay escrituras en la aplicación**. No se implementa sincronización con OneDrive/SharePoint ni edición colaborativa distribuida.

La carga suma UDC por **clase asignada**, incluso si existen dos grupos de la misma materia. Se compara con el máximo del profesor (14 por defecto). El contador de materias del docente cuenta materias distintas. Las solicitudes se revisan en su panel; el administrador modifica la clase, restablece `Pendiente` y reenvía la oferta para confirmación.

## Correo y acceso

Sin SMTP, el envío muestra una vista previa con resumen y enlace. Con `SMTP_HOST`, configura `SMTP_PORT` (587 STARTTLS o 465 TLS), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. No guardes secretos en Git. El enlace contiene un token de uso único, vence en 48 horas y exige ingresar la nómina o correo del destinatario. En producción es obligatorio; conocer la nómina por sí sola no permite entrar.

Las sesiones y tokens se guardan en memoria: un reinicio cierra sesiones e invalida enlaces. Reenvía las ofertas después de reiniciar. Este diseño funciona para una instancia; para múltiples instancias o sesiones duraderas se requiere un almacén compartido y persistente. No se implementan recuperación de contraseña, SSO, auditoría histórica ni detección automática de conflictos.

## Despliegue

1. Instala Node 22.12+ y ejecuta `npm ci && npm run build`.
2. Monta un volumen persistente para `data/` (o configura `EXCEL_PATH` en un volumen). Mantén una sola instancia Node y respalda el Excel regularmente.
3. Define `NODE_ENV=production`, `ADMIN_PASSWORD` fuerte, `SESSION_SECRET` aleatorio (al menos 32 bytes), `PUBLIC_URL=https://tu-dominio` y las variables SMTP.
4. Ejecuta `npm start` detrás de un proxy HTTPS. Si hay exactamente un proxy de confianza, define `TRUST_PROXY=1` para cookies seguras. El proxy debe dirigir todas las rutas al puerto 3000, mantener `Host` y enviar `X-Forwarded-Proto`.
5. Comprueba login, importación, exportación y envío real con una cuenta de prueba antes de invitar usuarios. No expongas el modo de desarrollo a Internet.

Ejemplo Docker (el volumen debe ser escribible por UID 1000):

```bash
docker build -t arte-fj27 .
docker run --env-file .env -p 3000:3000 -v arte-data:/app/data arte-fj27
```

Pon las variables de producción en `.env` y publica el contenedor detrás de HTTPS. Para Render/Railway u otro host, usa build `npm ci && npm run build`, inicio `npm start` y disco persistente; evita plataformas con filesystem efímero o funciones serverless.

## PWA

Manifest e icono SVG incluidos. El service worker se registra en compilaciones de producción y guarda la interfaz estática visitada. Las APIs, sesiones y datos académicos no se cachean. Offline permite abrir la interfaz, pero iniciar sesión, consultar datos y responder requiere red. La instalación requiere HTTPS (localhost es excepción); el soporte depende del navegador. Cuando publiques cambios, cambia la versión de caché en `public/sw.js`.

## Comprobaciones

`npm test` verifica lectura/escritura real del Excel, validaciones, concurrencia y API con sesiones, permisos e importación/exportación. `npm run build` verifica el bundle de producción. SMTP real, instalación en un teléfono y despliegue HTTPS requieren infraestructura externa y deben validarse en el destino.
