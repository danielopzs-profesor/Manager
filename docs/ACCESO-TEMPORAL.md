# Contraseñas temporales para pruebas

La actualización del código no restablece contraseñas automáticamente. Para activar el acceso de prueba en la base de datos que estés usando:

1. Inicia sesión como administrador o superadministrador.
2. Abre **Usuarios y permisos → Activar contraseñas temporales de prueba**.
3. Revisa el aviso y escribe **ACTIVAR PRUEBA** para confirmar.

Se reemplazan las contraseñas de los perfiles docentes por `temporal123`, se invalidan sus sesiones anteriores y se obliga a elegir una contraseña personal al ingresar. Se excluyen profesores con rol administrativo o superadministrador y perfiles vinculados a una cuenta administrativa; sus contraseñas no cambian.

Cada profesor ingresa con su **nómina** y `temporal123`. Aparece un formulario emergente obligatorio para escribir y confirmar una contraseña personal de 12 a 200 caracteres. La aplicación bloquea la consulta y modificación de datos hasta completarlo. La contraseña temporal deja de funcionar al guardar y la nueva contraseña se guarda mediante hash, sin registrarse en el historial ni exportarse a Excel. El usuario continúa en su sesión y en el siguiente acceso usa su contraseña personal.

Esta acción se aplica a los profesores existentes en el momento de activarla. No la repitas como parte de cada inicio: volvería a reemplazar las contraseñas personales. Para un profesor nuevo configura su acceso individual desde la ficha. La activación queda registrada en el historial con cantidades de perfiles afectados y excluidos.

Si la computadora de oficina, Raspberry o sitio web utilizan la misma base de datos Neon, la activación afecta a esa base compartida. Las contraseñas temporales compartidas son para la etapa de pruebas; distribúyelas únicamente a los participantes de la prueba.
