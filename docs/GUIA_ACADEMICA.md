# Guía para comenzar con la versión académica

## Qué cambia al actualizar

Se conserva la programación anterior como borradores para revisión. El sistema no conoce todavía qué docentes son de cátedra, qué UF son bloques, cuáles son los grupos ni las fechas reales. No debes volver a cargar ni borrar la base Neon.

## Primer ingreso

1. Abre el mismo enlace de Netlify y recarga con Ctrl + F5 cuando termine el nuevo deploy.
2. Selecciona Administrador. Si nunca creaste cuentas individuales, deja usuario vacío y usa tu contraseña de `ADMIN_PASSWORD`.
3. Entra a Usuarios y permisos y crea tu cuenta, con usuario, nombre y una contraseña de al menos 12 caracteres. Guárdala en un lugar seguro.
4. Crea las otras tres cuentas con usuarios distintos. Comunica sus contraseñas por un canal privado. El acceso compartido inicial deja de funcionar al crear la primera cuenta.

## Preparar el semestre

1. Arriba a la derecha, selecciona el semestre y pulsa Editar fechas. Captura el lunes real de inicio.
2. En Profesores, edita cada registro: Cátedra tiene tope de 10 UDC y Planta de 14 UDC, por todo el semestre.
3. En Unidades de formación, identifica Materia/Bloque y revisa las UDC base. Esto no cambia automáticamente las UDC de grupos existentes.
4. En Ofertas, entra a cada grupo y edita:
   - Clave única institucional, independiente del grupo. Por ejemplo clave 123, grupo 102.
   - Periodos, duración y UDC del grupo.
   - Los grupos de 10 semanas solo pueden ser P1–P2 o P2–P3.
   - Para materias intensivas, selecciona Intensiva, duración 1 e I1 o I2.
5. Reparte los porcentajes entre docentes. Por ejemplo, 50 % y 50 % en una UF de 2 UDC da 1 UDC a cada uno. El total debe ser 100 % por grupo.
6. En cada bloque asigna un coordinador y las UDC extra correspondientes.
7. Crea las sesiones: docentes que asistirán, segmentos, días, horario y aula. Un porcentaje no determina automáticamente cuándo imparte cada profesor.
8. En Profesores revisa totales, distribución de horas y las sobrecargas. Un administrador puede aprobarlas con justificación.
9. Regresa a la oferta y pulsa Publicar. Si faltan datos o hay conflictos, el sistema indica qué corregir.

No se genera un contrato laboral. La vigencia de cátedra es una sugerencia académica que debe revisar la institución.

## Compartir con un profesor

1. En Profesores pulsa Compartir oferta.
2. Con el envío manual verás un resumen y un enlace. Envíalo completo solo a su destinatario.
3. El profesor abre el enlace y escribe su nómina/correo.
4. Puede ver el calendario, aceptar asignaciones o solicitar cambios con comentarios.
5. El enlace se consume al ingresar; para otro inicio de sesión después de cerrarla o vencer, genera uno nuevo. Vigencia del enlace: 48 horas; sesión: hasta 8 horas.

Si cambias una asignación o sus horarios, la oferta vuelve a borrador y las respuestas afectadas se reinician: revisa, publica y comparte nuevamente. No se permite aceptar por el profesor desde Administración.

## Respaldo y recuperación

En Datos puedes:

- Exportar un Excel sin credenciales.
- Exportar un JSON académico legible sin contraseñas.
- Restaurar alguna de las últimas 30 versiones guardadas automáticamente antes de cada cambio.

Restaurar conserva las cuentas e historial actuales y deja las ofertas como borrador; requiere revisar y volver a publicar. Estos respaldos no protegen contra pérdida completa de la base, porque están en el mismo servicio: conserva copias externas periódicas.

## Si dos personas editan a la vez

Si aparece «La programación cambió», otro usuario guardó primero. Cierra el formulario, recarga la programación, revisa su cambio y vuelve a editar. El sistema no sobrescribe silenciosamente la información de la otra persona.

## Datos que requieren revisión institucional

- Las fechas se generan desde un lunes inicial con 17 semanas calendario. No se incluyen feriados ni excepciones locales.
- Los códigos de grupo de 15 semanas e intensivas se capturan manualmente.
- La clave se exige única dentro del semestre; puede reutilizarse en otro semestre.
- Los porcentajes tienen máximo dos decimales; las UDC se muestran hasta cuatro.
- La distribución por segmento muestra horas de sesión, sin inventar un tope de UDC por periodo.
