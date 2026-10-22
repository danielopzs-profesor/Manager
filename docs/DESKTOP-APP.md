# Arte Académico para Mac — rama desktop-app

La versión de escritorio comparte interfaz y reglas con la web, e incluye su servidor Node.js. La Mac del usuario no necesita Node.js, npm, Git ni terminal una vez instalado el `.dmg`. El primer instalador está orientado a Intel x64, compatible con la iMac de 2019. Requiere internet y una base Neon ya configurada con los usuarios existentes.

## Cómo funciona la actualización

GitHub guarda el código en `desktop-app`. Una actualización de escritorio es una versión compilada que se publica en GitHub Releases; la aplicación no hace `git pull` ni ejecuta código de una rama en la computadora del usuario.

En **Aplicación → Buscar actualizaciones**, la app consulta versiones publicadas, ofrece descargar una nueva y pide reiniciar para instalarla. Puedes posponer la instalación y volver a ese menú después. La conexión cifrada se conserva y los datos siguen en Neon. No se descargan versiones en borrador ni preliminares, ni se permiten degradaciones automáticas. Solo se ofrecen las versiones publicadas y revisadas por el responsable del repositorio.

Para actualización automática en macOS hay que distribuir la app **firmada con Developer ID y notarizada**. No se desactiva la comprobación de firma. Un instalador sin firma sirve para pruebas con las advertencias de macOS, pero para actualizarlo puede ser necesario descargar e instalar el nuevo DMG manualmente. No prometemos actualización automática en apps sin firmar.

El repositorio y sus Releases deben ser públicos para este canal sin credenciales. Si el repositorio es privado, será necesario otro servidor de distribución autenticado; no incluyas un token privado de GitHub dentro de la app. GitHub Actions en macOS puede consumir minutos con costo según la cuenta y visibilidad del repositorio; revisa Billing antes de activar compilaciones repetidas.

## Preparar el primer instalador desde una Mac (desarrollo)

Estos pasos son del responsable técnico, no del usuario final. Instala Node.js 24 y Git en la Mac que compilará el instalador. Dentro del repositorio:

```bash
git fetch origin
git switch desktop-app
git pull --ff-only origin desktop-app
npm ci
npm run desktop:dev
```

Para construir DMG, ZIP y metadatos del actualizador:

```bash
npm run desktop:dist
```

Los archivos están en `release/`. No subas la carpeta a Git. El ZIP y `latest-mac.yml`, además del DMG y los blockmaps generados, son necesarios para el canal de actualización. La versión de package.json debe aumentar en cada entrega; debe corresponder con `desktop-vVERSION` al crear la etiqueta. No se instala Node.js en la Mac de la colega: Electron lo incorpora.

## Compilar mediante GitHub Actions

El archivo `.github/workflows/desktop-mac.yml` usa un equipo macOS Intel de GitHub, verifica que el commit pertenezca a desktop-app, ejecuta pruebas y genera artefactos de instalación. Una etiqueta `desktop-v*` dispara la compilación sin tener que modificar main ni web-deploy. La ejecución manual de workflow_dispatch requiere que GitHub haya registrado el workflow; según el estado del repositorio puede requerir que el archivo exista en la rama predeterminada. No es necesario cambiar main para el disparador por etiqueta.

Ejemplo para la primera entrega, después de revisar código, firma y costos de Actions:

```bash
git switch desktop-app
git pull --ff-only origin desktop-app
git tag desktop-v4.5.0
git push origin desktop-v4.5.0
```

La tarea genera un **borrador** de Release con los instaladores y `latest-mac.yml`. En GitHub → Actions puedes descargar el artefacto **Arte-Mac-Intel** para probar. Revisa el DMG en una Mac y publica el Release solo cuando esté listo: las apps instaladas empezarán a detectar esa versión publicada. Si la compilación falla, revisa el registro de Actions; no publiques una versión sin ZIP o sin metadatos de actualización.

Para firma y notarización configura estos **secrets del repositorio**, nunca archivos del proyecto:

- `MAC_CSC_LINK`: certificado Developer ID Application exportado a P12 y codificado en base64, o referencia admitida por electron-builder.
- `MAC_CSC_KEY_PASSWORD`: contraseña del certificado.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` y `APPLE_TEAM_ID`: credenciales de notarización de Apple.

Sin esos secretos puede generarse un instalador de prueba sin firma. Tenerlos configurados no sustituye la prueba real de firma/notarización y actualización entre dos versiones en una Mac. El flujo exige pertenencia a desktop-app y crea Releases en borrador; no publica automáticamente.

## Instrucciones de instalación para el usuario

1. Descarga el `.dmg` revisado desde GitHub Releases.
2. Ábrelo y arrastra **Arte Académico** a **Aplicaciones**.
3. Abre la aplicación. Pega la cadena completa de Neon desde **Connect → Connection string → Copy**, incluida la opción `sslmode=require`.
4. Selecciona **Guardar y abrir la aplicación**. Luego entra con tu usuario y contraseña existentes.
5. Usa **Aplicación → Buscar actualizaciones** para revisar nuevas versiones.

La conexión se guarda cifrada con `safeStorage` de Electron y protección del Llavero de macOS, en los datos de usuario de la app. No se guarda en GitHub ni se entrega al frontend. Si el Llavero no está disponible, la app no la guarda como texto plano. Para cambiar de conexión usa **Aplicación → Configurar conexión**.

El servidor integrado escucha solo en 127.0.0.1, en un puerto temporal y con un token privado por ejecución. Conserva la autenticación y los permisos de producción. La base debe contener las identidades administrativas verificadas; la aplicación no crea un administrador compartido para la instalación. Los cambios en la base compartida afectan también al sitio web y a las demás computadoras.

## Límites de esta primera versión

- El código y el flujo de compilación están preparados; generar y probar el DMG requiere macOS o una ejecución correcta de Actions. No equivale a un instalador ya firmado o probado en la iMac.
- No hay sincronización sin conexión: las consultas y escrituras requieren Neon.
- Los enlaces generados por el servidor local son de esa Mac. Para enviar enlaces accesibles desde otras computadoras usa la versión web pública. En escritorio las ofertas se preparan en modo manual; no hay SMTP configurado en el asistente inicial.
- Tener una conexión directa a Neon otorga acceso a esa base fuera de los controles visuales de la app. Distribuye esta variante solo a equipos administrativos de confianza. Para profesores es preferible la web o un cliente conectado a una API pública sin credenciales de base de datos.
- El instalador Intel no es una distribución nativa para Apple Silicon. Puede añadirse arm64 en una entrega posterior.
