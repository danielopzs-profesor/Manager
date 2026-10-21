import ExcelJS from "exceljs";
export const sheets = {
  prestamos: ["id", "profesor", "semestre", "departamento", "udc", "comentarios"],
  salones: ["id", "nombre", "capacidad", "dias", "horario", "edificio", "numero"],
  profesores: ["id", "nombre", "correo", "tipo", "area", "udc_maximas"],
  ufs: ["id", "nombre", "tipo", "udc"],
  semestres: ["id", "nombre", "inicio"],
  ofertas: [
    "id",
    "clave",
    "grupo",
    "semestre",
    "uf",
    "modalidad",
    "duracion",
    "periodos",
    "udc",
    "estado",
    "alumnos",
  ],
  participaciones: [
    "id",
    "oferta",
    "profesor",
    "porcentaje",
    "estatus",
    "comentarios",
  ],
  coordinaciones: ["id", "oferta", "profesor", "udc"],
  sesiones: [
    "id",
    "oferta",
    "profesores",
    "dias",
    "horario",
    "aula",
    "segmentos",
  ],
};
export async function exportAcademic(a) {
  const book = new ExcelJS.Workbook();
  for (const [name, cols] of Object.entries(sheets)) {
    const ws = book.addWorksheet(name);
    ws.columns = cols.map((key) => ({ header: key, key, width: 24 }));
    ws.addRows(a[name] || []);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  }
  return book.xlsx.writeBuffer();
}
export async function importAcademic(buffer, current) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  const a = structuredClone(current);
  for (const [name, cols] of Object.entries(sheets)) {
    const ws = book.getWorksheet(name);
    if (!ws && ["salones","prestamos"].includes(name)) { a[name] = structuredClone(current[name] || []); continue; }
    if (!ws)
      throw Error(
        `Falta la pestaña ${name}. Exporta primero la plantilla actual.`,
      );
    if (cols.some((c, i) => !["alumnos","edificio","numero","area","udc_maximas"].includes(c) && ws.getRow(1).getCell(i + 1).text !== c))
      throw Error(`Encabezados inválidos en ${name}`);
    a[name] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const item = {};
      cols.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        if (cell.type === ExcelJS.ValueType.Formula)
          throw Error("Usa valores, no fórmulas");
        if (["edificio","numero","area","udc_maximas"].includes(col) && !cell.text) return;
        item[col] = ["udc", "duracion", "porcentaje", "capacidad", "alumnos", "udc_maximas"].includes(col)
          ? Number(cell.text)
          : cell.text;
      });
      if (name === "ofertas") item.estado = "Borrador";
      if (name === "participaciones") {
        item.estatus = "Pendiente";
        item.comentarios = "";
      }
      if (name === "profesores") {
        const old = current.profesores.find((p) => p.id === item.id);
        if (old?.passwordHash) item.passwordHash = old.passwordHash;
        if (old?.accessRole) item.accessRole=old.accessRole;
        if (old?.protectedAccess) item.protectedAccess=true;
      }
      a[name].push(item);
    });
  }
  a.sobrecargas = [];
  return a;
}
