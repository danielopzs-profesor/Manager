## 4.2.3 (web-deploy)

- El formato de entrega permite datos incompletos y deja celdas vacías, sin omitir ofertas ni docentes pendientes de sesión.
- Exporta horas parciales por separado y conserva estados, asignaciones y confirmaciones.

## 4.2.2 (web-deploy)

- El formato de entrega incluye ofertas en borrador y publicadas del semestre seleccionado.
- Validación de datos de entrega independiente de publicación, coordinación y aprobación de sobrecarga; la descarga no modifica estados ni respuestas.

## 4.2.1 (web-deploy)

- Compatibilidad con ManualCargaMasiva: sede MTY, fechas yyyy-mm-dd, horas como texto y orden institucional de restricciones.
- Atributos separados por comas sin espacios, validación de separadores del código de salón y sugerencias de 307 códigos individuales de referencia.
- Corrección confirmada de FJ27 a 202711 al arrancar, con migración única e historial; AD27 conserva 202713.

## 4.2.0 (web-deploy)

- Formato de entrega XLSX con las 29 columnas institucionales, filas por profesor/sesión/periodo y validaciones previas.
- Nómina independiente del acceso, atributos UF (PMT3 inicial), código oficial de salón e identificador institucional de periodo (202713 inicial para FJ27).
- Fechas de inicio y fin editables por periodo ordinario o intensivo, compartidas por calendario, contratos y exportación; respaldo Excel conserva nuevos campos y admite plantillas anteriores.
- Add primero y azul; resto de iconos grises, manteniendo separación y etiquetas accesibles.

## 4.1.1 (web-deploy)

- El formulario conserva el rol protegido al vincular un superadministrador con un profesor existente; mantiene permisos, asignaciones y acceso a Mi carga académica.
- Más separación entre iconos, contraseña y casilla administrativa; fila de acciones centrada y con ancho limitado.

## 4.1.0 (web-deploy)

- Edición de periodos conserva las sesiones como pendientes en borrador; mensajes específicos para corregirlas antes de publicar.
- Guardado parcial de grupos y sesiones, sin retirar los controles de aforo, disponibilidad y empalmes confirmados.
- Fichas docentes con iconos Material rellenos, etiquetas accesibles y casilla administrativa al pie.
- Combinación explícita de cuenta administrativa con perfil docente existente, conservando asignaciones y contraseña administrativa.

## 4.0.0 (web-deploy)

- Rama de publicación independiente de main y arranque de producción para Hostinger con política nominativa verificada.
- Superadministradores permanentes, retirada inicial de privilegios sobrantes, casilla de administración exclusiva del superadministrador y coordinación restringida a sus propios grupos.
- Historial por categorías con accesos, errores, exportación TXT y limpieza confirmada; los eventos no generan respaldos de datos duplicados.
- Cátedra interna y Préstamo recibido con tope individual y área de origen para préstamos recibidos; conserva préstamos hacia otras áreas.
- Exportación XLSX, reporte PDF con gráficas y fichas JPEG de profesores, UF y asignaciones.

## 3.6.0

- Salones por edificio y número, con identificación interna estable y validación de combinaciones duplicadas.
- Calendario visual que habilita lunes para inicio de semestre; selectores de hora para sesiones y disponibilidad de salones.
- Dashboard con confirmación docente completa, distribución contractual, horas libres semanales por periodo y préstamos; accesos a vistas filtradas.
- Préstamos semestrales a otros departamentos que consumen tope de carga y actualizan la disponibilidad y aprobaciones.
- Mensajes de validación que indican datos conflictivos y opciones para corregirlos; compatibilidad con Excel anterior.

## 3.5.0

- Catálogo de salones con clave, nombre, capacidad y días/horario de trabajo.
- Mapa de ocupación por salón, semestre y periodo; asignación de clases desde el salón.
- Número de alumnos por grupo; validación de aforo, disponibilidad y empalmes en salones registrados.
- Conserva aulas anteriores; Excel incorpora salones y alumnos y admite plantillas anteriores.
- Acceso desde Profesores para vincular/crear cuentas administrativas sin duplicar docentes; conserva Mi carga académica.

## 3.4.0

- Vinculación explícita entre una cuenta administrativa y un profesor, sin duplicar asignaciones.
- Mi carga académica: UDC, coordinación, grupos, horario y respuestas propias a ofertas publicadas.
- Actualización del vínculo en sesiones activas y validación de referencias únicas.
- Prohibición de aprobar la propia sobrecarga.

## 3.3.4

- Accesos directos para asignar UF desde Profesores y profesores desde Ofertas.
- Selector de grupos con nombre de UF, clave y periodos; porcentaje disponible y vista de UDC proporcionales.
- Etiquetas accesibles en los campos del editor.

## 3.3.2

- Formulario único de usuario y contraseña sin selector de perfil. El servidor determina los permisos a partir de la cuenta autenticada.
- Conserva el acceso inicial con usuario vacío únicamente mientras no existan cuentas administrativas.

## 3.3.1

- Acceso docente exclusivamente con correo institucional y contraseña; la nómina permanece como identificador interno.
- Enlaces de oferta y configuración de acceso muestran el correo. Se rechazan correos duplicados al autenticar.

# 3.3.0 — Acceso docente con usuario y contraseña

- Los profesores acceden directamente por nómina o correo y contraseña; se retira el requisito de enlace/token en producción.
- Configuración y restablecimiento de contraseñas desde Profesores, con hash scrypt y revocación de sesiones anteriores.
- Credenciales excluidas de respuestas, exportaciones e historial; importación y restauración preservan las contraseñas actuales.
- Compartir oferta se conserva como notificación opcional y no concede acceso.

# 3.2.0 — Identidad visual Coordinación Académica

- Adaptación de la referencia visual ui: azules, cian, superficies translúcidas, tarjetas de métricas y barra lateral oscura.
- Pantalla de ingreso con tres perfiles y composición del semestre; navegación inferior adaptable en móvil.
- Manrope y Sora alojadas con la aplicación, sin peticiones a Google Fonts.
- Identidad, iconos instalables y colores PWA actualizados; funciones y permisos existentes conservados.

# 3.1.0 — Rol de consulta

- Cuentas Consulta con acceso de lectura a UF, ofertas, profesores, carga y horarios.
- Permisos verificados en servidor: sin escritura, aceptación, notificaciones, exportación ni administración de cuentas.
- Gestión en Usuarios y permisos, con selección de rol e invalidación de sesiones tras cambios de permisos.
- Cuentas anteriores siguen siendo administrativas y se protege al último administrador.

# 3.0.1 — Acceso tras cambio de dominio

- Valida tanto el dominio personalizado configurado como la dirección principal proporcionada por Netlify.
- Al renombrar un sitio Netlify, reemplaza un alias antiguo de PUBLIC_URL por la dirección principal actual, también para enlaces de profesores.
- Conserva el rechazo de sitios externos y vistas previas no autorizadas.

# 3.0.0 — Modelo académico semestral

- UF materia/bloque, ofertas con clave y grupo independientes y múltiples docentes por grupo.
- Responsabilidad fija de hasta 100 % por grupo, carga proporcional y coordinación adicional de bloques.
- Topes semestrales cátedra 10/planta 14; aprobación identificada de sobrecarga.
- Calendario de tres periodos, intensivas y validación de duración consecutiva.
- Sesiones por docente/segmento, conflictos de aula y profesor y distribución de horas.
- Cuentas administrativas individuales, permisos, historial antes/después y control de revisión.
- Migración conservadora con copia previa, 30 versiones y restauración protegida.
- Catálogos, ofertas, profesores y sesiones administrables sin Excel; nueva plantilla opcional.
- Diseño PWA responsive rojo/negro, accesibilidad de diálogos y aviso de actualización.

La migración se ejecuta al iniciar la versión desplegada. Los registros anteriores permanecen como borradores hasta revisión. La publicación en Netlify debe confirmarse en el destino; un commit de GitHub no acredita que el deploy haya finalizado.
