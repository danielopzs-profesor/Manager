# Formato institucional de entrega

En Datos selecciona **Descargar formato de entrega**. Usa el semestre seleccionado y todas sus ofertas, publicadas o en borrador. El Excel de respaldo/importación sigue disponible por separado; el formato institucional no es una plantilla para importar a la app.

Antes de descargar:

1. En Inicio → Editar fechas (semestre), revisa el **Identificador del periodo para entrega**. FJ27 tiene por defecto `202711`. No cambia la clave interna del semestre. Escuela TEC usa `AD-Arquitectura, Arte y Diseño`.
2. Revisa las fechas inicio y fin de P1, I1, P2, I2 y P3 en sus selectores de calendario. Sin fechas explícitas se calculan desde el lunes inicial; una fecha capturada tiene prioridad. No se permiten fechas invertidas ni periodos que se empalmen. Cambiar el calendario devuelve las ofertas a borrador para revisión.
3. En cada unidad de formación captura **Atributos de la UF**. El valor inicial es `PMT3`; admite varios atributos separados por comas.
4. En cada profesor revisa **Nómina para formato de entrega**. Es independiente del usuario de acceso y correo. Los identificadores antiguos con formato L seguido de dígitos se conservan como valor inicial; verifica que sean nóminas reales.
5. En Salones agrega el **Código de salón para entrega**. SALAS usa el nombre del salón (edificio-número); el código oficial va en CODIGO EDIFICIOS Y SALAS.
6. Puedes descargar la información disponible aunque falten asignaciones u horarios. Los borradores también se incluyen; no requieren publicación, coordinador, clasificación contractual ni aprobación de sobrecarga para generar el archivo. La descarga no modifica estados ni confirmaciones. Los datos faltantes se dejan como celdas vacías y no bloquean la descarga. Se conserva una fila por oferta aunque no tenga profesores o sesiones. Si un docente asignado aún no tiene sesión, también aparece con horario y salón en blanco.

El libro genera una hoja `Sheet1` nueva, sin copiar personas ni asignaciones del archivo de referencia. Sus 29 encabezados y su orden corresponden a la hoja ColumnasEjemplo de ManualCargaMasiva.xlsx. Las restricciones empiezan por RESTRICCIONES CARRERA. El encabezado de hora final es **HORA FIN**, como en ese archivo.

Se genera una fila por profesor participante de la sesión y por periodo de esa sesión. Una UF de diez semanas puede generar filas de P1 y P2 con fechas diferentes. Se incluye el porcentaje de responsabilidad total de ese profesor en el grupo, sin dividirlo otra vez entre periodos. Solo se incluyen los docentes seleccionados en cada sesión; la coordinación no genera filas de docencia adicionales. No se redondean porcentajes decimales: se solicita corregirlos para la entrega que requiere enteros.

Constantes: SEDE=`MTY`, DEPARTAMENTO=`DART-D. Arte`, ESTATUS DEL GRUPO=`ACTIVO`, TITULAR=1, SESCODE=`P`, COMPONENTE=`CL`. CLAVE contiene la clave UF, no la clave única de oferta. VACANTES contiene los alumnos de la oferta; si están pendientes o en cero, se deja vacío. REFERENCIAS y las cinco restricciones se dejan vacías. Las fechas son celdas de fecha de Excel con formato visible `yyyy-mm-dd`, las horas son texto literal `HH:mm:ss` con formato de celda Texto (`@`), sin números seriales de hora y los días se ordenan Lu, Ma, Mi, Ju, Vi, Sa, Do, incluyendo solo los seleccionados.

El manual define FJ 2027 = 202711 y AD 2027 = 202713. Con la confirmación del responsable se corrige una sola vez el valor 202713 de FJ27 al iniciar esta versión, dejando historial; no se cambian otros semestres ni se sobrescriben modificaciones posteriores.

Los atributos se exportan separados por comas sin espacios. Los códigos de salón conservan sus espacios y guiones oficiales; por ejemplo `A-A6- 206`. La captura ofrece 307 códigos individuales extraídos de ClavesSalones_MTY del manual, sin registrar aulas, capacidades ni horarios. El catálogo es de referencia: si un código nuevo no aparece, se solicita verificarlo con Escolar. La exportación comprueba el patrón de espacios/guiones, pero no certifica que el código exista en el sistema institucional. Las combinaciones de varias aulas del catálogo no se ofrecen porque la aplicación asigna un salón por sesión.

SALAS es informativa según el manual; se conserva el nombre local. Las horas ya se exportan como texto y no necesitan copiarse desde OneDrive. El manual admite cursos sin horario, pero se pueden generar filas con horas y días vacíos cuando aún no se han capturado. Esto no cambia los requisitos para publicar las ofertas. No se ha comprobado la aceptación por un sistema institucional externo.

Las horas de inicio y fin se exportan por separado: si solo se conoce una, la otra queda vacía. Los campos institucionales constantes se conservan. Los códigos de salón con formato incorrecto y los porcentajes decimales conocidos siguen requiriendo revisión para evitar alterar datos. No se inventan docentes, horarios, aulas, porcentajes ni fechas; solo se utilizan los datos guardados o las fechas de periodo ya calculadas por el calendario del semestre. Un semestre sin ofertas genera la hoja con encabezados.
