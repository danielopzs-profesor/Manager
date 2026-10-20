# Programación Académica
## Guía de instalación y uso en iMac

Preparada para iMac Retina 5K de 27 pulgadas (2019), procesador Intel Core i5, 16 GB de RAM y macOS Sequoia 15.3.
Fecha: 20 de octubre de 2026.

Esta computadora tiene capacidad suficiente para ejecutar el proyecto. Esta guía no requiere conocimientos de programación. Sigue los pasos en orden y ejecuta los comandos uno por uno.

## Antes de comenzar: qué se comparte

La aplicación se ejecutará en tu iMac, pero utilizará la MISMA base de Neon que la aplicación publicada. Puedes consultar y editar esa información con autorización del responsable.

• Los cambios de datos que guardes (profesores, salones, grupos y asignaciones) también se verán en la aplicación publicada. No necesitas subirlos a GitHub.
• Los cambios de código o diseño permanecen en tu copia hasta que se suben a GitHub y se publican. Trabaja en tu rama, no directamente en main.
• Borrar o importar información también afecta los datos compartidos. Antes de una importación que reemplace la programación, descarga un respaldo y coordínalo con el responsable.
• No compartas la contraseña o la cadena de conexión de Neon en capturas, documentos ni GitHub.

## 1. Qué necesitas

• Internet durante la instalación y mientras utilizas Neon.
• Una cuenta de GitHub con acceso al repositorio danielopzs/TecMty. Pide que te inviten y acepta la invitación.
• Permiso para instalar programas y, si se solicita, la contraseña de administración del Mac.
• La conexión privada de Neon que te entregará el responsable por un medio privado.
• Tu usuario y contraseña de la aplicación. Es distinto de tu cuenta de GitHub o de la contraseña del Mac.

Instalaremos Node.js, GitHub Desktop y Visual Studio Code. Puedes usar Chrome o Safari para abrir la aplicación. No necesitas instalar PostgreSQL, Docker ni nvm.

## 2. Instalar Node.js

Node.js permite ejecutar la aplicación; incluye npm, la herramienta que instala las piezas que necesita el proyecto.

1. Abre https://nodejs.org/en/download
2. Busca Node.js 24 LTS para macOS y el instalador .pkg. Si el sitio muestra otra versión predeterminada, selecciona la versión 24 LTS.
3. Tu iMac tiene procesador Intel: elige x64 / Intel, no ARM64 / Apple Silicon. Un instalador Universal también sirve.
4. Abre el .pkg descargado y sigue Continuar → Instalar. Introduce la contraseña del Mac si la solicita.
5. Espera a que confirme que terminó.

No necesitas instalar Node.js otra vez cada día.

## 3. Instalar GitHub Desktop

GitHub guarda el proyecto. GitHub Desktop permite descargarlo y recibir actualizaciones desde una aplicación visual.

1. Abre https://desktop.github.com/
2. Descarga GitHub Desktop para macOS Intel (o Universal, si esa es la opción disponible).
3. Abre el archivo descargado. Descomprímelo si es .zip y mueve GitHub Desktop a Aplicaciones.
4. Abre GitHub Desktop e inicia sesión con TU cuenta. Autoriza el acceso en el navegador si te lo solicita.
5. Si no puedes acceder al repositorio, pide al responsable que revise tu invitación. No uses su contraseña.

## 4. Instalar Visual Studio Code

Visual Studio Code, también llamado VS Code, es el programa donde abrirás el proyecto y su terminal.

1. Abre https://code.visualstudio.com/download
2. Descarga la versión macOS Intel o Universal.
3. Abre el archivo descargado y arrastra Visual Studio Code a Aplicaciones.
4. Abre el programa.

## 5. Descargar el proyecto

“Clonar” significa descargar una copia del código conectada a GitHub para recibir actualizaciones.

1. En GitHub Desktop, abre File → Clone Repository.
2. Selecciona la pestaña URL.
3. En Repository URL pega esta dirección:

```text
https://github.com/danielopzs/TecMty.git
```

4. En Local Path, elige una carpeta fácil de encontrar. Recomendamos una carpeta Proyectos dentro de tu carpeta personal, con TecMty dentro.
5. Evita carpetas sincronizadas con iCloud para guardar el proyecto.
6. Pulsa Clone y espera a que termine.

## 6. Crear tu rama de trabajo

Una rama permite trabajar en el código sin cambiar directamente la versión publicada. No separa los datos de Neon.

1. En GitHub Desktop, selecciona el repositorio TecMty.
2. En Current Branch, selecciona main.
3. Pulsa Fetch origin. Si aparece Pull origin, púlsalo para descargar la versión reciente.
4. Abre Branch → New Branch.
5. Escribe este nombre y crea la rama desde main:

```text
pruebas-imac
```

Trabaja en pruebas-imac. No incorpores cambios a main sin revisión: Netlify puede publicar automáticamente esa rama.

## 7. Abrir la carpeta correcta

1. En GitHub Desktop, elige Repository → Open in Visual Studio Code, si aparece.
2. Como alternativa, en VS Code abre File → Open Folder y selecciona la carpeta TecMty que acabas de descargar.
3. Si pregunta si confías en los archivos, confirma solo si abriste este repositorio conocido.
4. En el panel izquierdo debes ver package.json, package-lock.json y las carpetas src, server y public.

Abre TecMty completa, no solo la carpeta src ni server.

## 8. Abrir la terminal y comprobar la instalación

La terminal es el panel donde escribirás instrucciones. No es el navegador.

1. En VS Code, elige Terminal → New Terminal.
2. Haz clic en el panel que aparece abajo.
3. Copia un comando, pégalo con Command + V y presiona Enter.
4. Espera el resultado antes del siguiente comando. No copies las marcas de bloque ni el nombre “bash”; solo el contenido del recuadro.

Comprueba Node.js:

```bash
node -v
```

Debe mostrar una versión que comience con v24.

Comprueba npm:

```bash
npm -v
```

Debe mostrar un número. Si dice command not found, cierra y vuelve a abrir VS Code. Si persiste, verifica que terminó la instalación de Node.js.

## 9. Instalar las dependencias del proyecto

Las dependencias son los componentes que necesita la aplicación. Dentro de la terminal del proyecto ejecuta:

```bash
npm ci
```

La primera vez puede tardar varios minutos. Espera hasta que vuelva a aparecer la línea donde puedes escribir.

• npm warn significa advertencia; no siempre impide continuar.
• npm error indica un problema. Guarda el mensaje y pide ayuda antes de seguir.
• No uses sudo npm ci ni borres archivos de bloqueo para resolver errores.

Si falta package-lock.json, comprueba la carpeta abierta. Este archivo forma parte del proyecto.

## 10. Conectar la misma base de Neon

Solicita al responsable la conexión de la base COMPARTIDA que utiliza la aplicación publicada. No necesitas tener tu propia cuenta de Neon si te entrega la conexión y tienes autorización.

La conexión debe comenzar con postgresql://. Debe ser la cadena completa, con la contraseña real y los parámetros finales. No copies psql, comillas externas ni una contraseña sustituida por asteriscos. En el panel de Neon se obtiene desde Connect → Connection string, normalmente con Connection pooling activado.

Si la aplicación ya está corriendo, detenla en su terminal con Control + C. No es Command + C.

En ESA MISMA terminal de VS Code, ejecuta:

```bash
read -rs "DATABASE_URL?Pega la conexión de Neon y presiona Enter: "
```

Cuando te lo pida, pega la conexión privada con Command + V y presiona Enter. NO se mostrarán caracteres: es intencional. No pegues la conexión hasta que hayas ejecutado el comando anterior.

Después ejecuta estas líneas una por una:

```bash
echo
```

```bash
export DATABASE_URL
```

```bash
export PUBLIC_URL=http://localhost:5173
```

```bash
export PORT=3000
```

Estas instrucciones son para zsh, la terminal predeterminada de macOS Sequoia. Si read informa un error de opciones, detente y comparte ese mensaje sin la conexión.

Estas variables viven en esta terminal. Al cerrarla, tendrás que configurarlas otra vez. El servidor actual no carga un archivo .env automáticamente.

## 11. Comprobar la conexión

Ejecuta:

```bash
node server/index.js
```

Si inicia correctamente, debe mostrar:

```text
Arte FJ27 disponible en puerto 3000
```

Esto confirma que el servidor pudo iniciar con la configuración de Neon. Presiona Control + C para detener esta comprobación antes de continuar.

Si falla, comparte el error con el responsable. Oculta cualquier cadena que comience con postgresql:// y cualquier contraseña. No cierres esta terminal: contiene las variables de conexión.

## 12. Abrir la aplicación

En la misma terminal ejecuta:

```bash
npm run dev
```

Espera mensajes parecidos a estos:

```text
Arte FJ27 disponible en puerto 3000
Local: http://localhost:5173/
```

Abre Chrome o Safari y entra en:

```text
http://localhost:5173
```

Deja la terminal abierta. Si el navegador ya tenía una sesión anterior, ciérrala desde la aplicación y vuelve a entrar.

En la pantalla de acceso:

• Usuario: utiliza la cuenta que te asignó el responsable. Para profesores, normalmente es el correo institucional; para administradores, su usuario registrado.
• Contraseña: utiliza la contraseña de esa cuenta en la aplicación.
• El sistema identifica el rol automáticamente. No debes elegirlo.
• No pegues la conexión de Neon en el formulario de acceso. Tampoco uses la contraseña del Mac o GitHub.
• admin-demo es solo para una demostración local nueva. No es la contraseña de la base compartida.

Localhost significa “esta computadora”. Esa dirección no permite que otra persona entre a tu iMac desde internet.

## 13. Cómo trabajar cada día

1. Abre GitHub Desktop y selecciona TecMty.
2. Comprueba que estés en pruebas-imac.
3. Pulsa Fetch origin y, si aparece, Pull origin para recibir cambios de esa rama.
4. Abre el proyecto en VS Code y una terminal.
5. Si abriste una terminal nueva, repite el paso 10 para conectar Neon.
6. Ejecuta npm run dev y abre http://localhost:5173.
7. Si editas código, guarda los archivos con Command + S y comprueba el resultado.
8. Al terminar, presiona Control + C en la terminal. Después puedes cerrar VS Code.

No necesitas reinstalar programas cada día. Después de una actualización que cambie dependencias, detén la aplicación, ejecuta npm ci y luego npm run dev.

Fetch origin no incorpora automáticamente cambios nuevos de main en pruebas-imac. Cuando haya una nueva versión oficial, pide al responsable que te acompañe a incorporarla con Branch → Update from main, si está disponible, o mediante una revisión de cambios.

## 14. Guardar y compartir cambios de código

Los cambios de DATOS se guardan al usar los botones de la app. Estos pasos son solo para cambios en archivos de código o diseño.

1. En GitHub Desktop, comprueba que la rama sea pruebas-imac.
2. Revisa los archivos que aparecen en Changes.
3. Nunca incluyas conexiones de Neon, contraseñas, respaldos de datos personales o archivos privados.
4. En Summary, describe brevemente lo que cambiaste.
5. Pulsa Commit to pruebas-imac. Esto guarda una versión en tu computadora.
6. Pulsa Publish branch la primera vez, o Push origin después. Esto envía los cambios a GitHub.
7. Pide al responsable que revise el trabajo antes de incorporarlo a main y publicarlo.

No fuerces un cambio de rama ni descartes archivos si Git avisa que tienes trabajo pendiente.

## 15. Revisar antes de publicar

Para una revisión funcional, comprueba que puedes entrar, navegar y guardar los cambios esperados. Recuerda que estás utilizando datos compartidos: evita crear pruebas destructivas o datos ficticios sin coordinarlos.

Para comprobar que el código compila, detén la aplicación y ejecuta:

```bash
npm run build
```

Las pruebas básicas del proyecto se ejecutan con:

```bash
npm test
```

IMPORTANTE: no configures TEST_DATABASE_URL con la conexión compartida. Las pruebas de PostgreSQL necesitan una base separada preparada para pruebas. Una prueba omitida no equivale a una prueba aprobada.

Si cualquiera de los comandos falla, entrega el mensaje al responsable antes de publicar.

## 16. Solución de problemas

### El navegador dice “This site can’t be reached”

Comprueba que npm run dev siga activo y que la terminal muestre http://localhost:5173/. Abrir el enlace no inicia el servidor por sí solo.

### Aparece ECONNREFUSED 127.0.0.1:3000

La interfaz está abierta, pero el servidor falló. Presiona Control + C y ejecuta node server/index.js en la misma terminal para ver el error original.

### Aparece “Esta dirección no está autorizada”

Detén la aplicación. En la misma terminal ejecuta export PUBLIC_URL=http://localhost:5173 y vuelve a ejecutar npm run dev. Abre exactamente esa dirección.

### No aparecen los datos o las cuentas esperadas

Verifica con el responsable qué proyecto, rama y base de Neon corresponden a la conexión. No borres ni importes datos para intentar solucionarlo.

### La contraseña no funciona

Usa la cuenta de la aplicación compartida, no la contraseña del Mac, GitHub o Neon. Pide al administrador que revise o restablezca tu acceso.

### Aparece EADDRINUSE

El puerto puede estar ocupado por otra instancia. Busca otras terminales donde esté corriendo la aplicación y detenlas con Control + C. No inicies varias copias del servidor.

### Git no permite cambiar de rama

Puede haber cambios sin guardar mediante un commit. No uses comandos para forzar el cambio ni borres archivos. Comparte el mensaje con el responsable.

### La terminal no está en la carpeta del proyecto

En VS Code, abre File → Open Folder, selecciona TecMty y abre una terminal nueva. Recuerda repetir la conexión de Neon si cambiaste de terminal.

## 17. Qué enviar cuando necesites ayuda

• El paso de esta guía que estabas siguiendo.
• El comando que ejecutaste.
• El mensaje completo del error o una captura de la terminal.
• Si estabas conectada a Neon o usando una copia local.

Antes de enviar una captura, revisa que no muestre conexiones privadas, contraseñas o información personal innecesaria. No compartas el contenido de DATABASE_URL.

## Resumen para volver a abrir la aplicación

1. Abre la carpeta TecMty en VS Code.
2. Abre una terminal y configura Neon con el paso 10.
3. Ejecuta npm run dev.
4. Abre http://localhost:5173.
5. Mantén la terminal abierta. Para terminar, Control + C.

Esta guía no contiene credenciales. El responsable debe entregar por separado la conexión de Neon y el acceso a la aplicación.
