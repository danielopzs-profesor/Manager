# Guía para comenzar con la versión académica

## Qué cambia al actualizar

Se conserva la programación anterior como borradores para revisión. El sistema no conoce todavía qué docentes son de cátedra, qué UF son bloques, cuáles son los grupos ni las fechas reales. No debes volver a cargar ni borrar la base Neon.

## Primer ingreso

1. Abre el mismo enlace de Netlify y recarga con Ctrl + F5 cuando termine el nuevo deploy.
2. Si nunca creaste cuentas individuales, deja usuario vacío y usa tu contraseña de `ADMIN_PASSWORD`.
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

## Dar acceso a un profesor

1. En Profesores busca su nómina y pulsa **Configurar acceso**.
2. Establece una contraseña exclusiva de al menos 12 caracteres y compártela personalmente con ese profesor.
3. El profesor abre la dirección principal, introduce en Usuario su correo institucional y contraseña. Puede volver a entrar sin solicitar enlaces.
4. Si la olvida, utiliza **Restablecer contraseña**. Las sesiones anteriores dejan de funcionar.
5. **Compartir oferta** sigue disponible para enviar el resumen, pero el enlace ya no autentica ni es obligatorio.

La sesión dura hasta ocho horas; después basta con ingresar nuevamente con la contraseña. En la demostración local, solo los profesores ficticios sin contraseña pueden seguir entrando por correo institucional; esa excepción no se permite en producción.

Si cambias una asignación o sus horarios, la oferta vuelve a borrador y las respuestas afectadas se reinician: revisa y publica nuevamente. No se permite aceptar por el profesor desde Administración.

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

## Asignar una UF a un profesor

1. Crea la UF en Unidades de formación y su oferta / grupo en Ofertas, con semestre, clave, duración y UDC.
2. En Profesores, pulsa **Asignar unidad de formación** en la tarjeta del docente.
3. Selecciona la oferta / grupo: muestra nombre de UF, grupo, clave y periodos. Captura su responsabilidad; se propone el porcentaje disponible y se muestran las UDC proporcionales.
4. Guarda. También puedes comenzar desde **Ofertas → Asignar profesor**.
5. En Ver asignación, completa profesores hasta 100 %, coordinación si es bloque y sesiones con sus docentes. Revisa la carga semestral y publica la oferta.

Guardar una asignación devuelve la oferta a borrador para revisión. Solo el administrador puede asignar; el rol Consulta mantiene acceso de lectura.

## Administrador que también imparte clases

1. Registra al docente en Profesores y conserva sus asignaciones con su identificador actual.
2. En Usuarios y permisos, edita la cuenta administrativa. En Profesor vinculado selecciona ese registro y guarda. Deja la contraseña vacía para conservarla.
3. Abre Mi carga académica: verás tus grupos, UDC semestrales (incluida coordinación) y horario. Puedes aceptar tus clases publicadas o solicitar cambios desde la misma cuenta. Los borradores son visibles para revisión pero no aceptables.
4. Otro administrador debe aprobar tu sobrecarga. La cuenta conserva sus permisos administrativos.

Cada profesor puede vincularse a una sola cuenta administrativa. El vínculo se puede retirar seleccionando Sin vinculación docente; no se eliminan sus asignaciones. Consulta no obtiene permisos de respuesta docente. Una importación debe conservar los profesores vinculados o corregir primero los vínculos. No se crean vínculos automáticamente por nombre ni correo.
