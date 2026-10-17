import ExcelJS from "exceljs";
export const sheets = {
  profesores: ["id", "nombre", "correo", "tipo"],
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
    ws.addRows(a[name]);
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
    if (!ws)
      throw Error(
        `Falta la pestaña ${name}. Exporta primero la plantilla actual.`,
      );
    if (cols.some((c, i) => ws.getRow(1).getCell(i + 1).text !== c))
      throw Error(`Encabezados inválidos en ${name}`);
    a[name] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const item = {};
      cols.forEach((col, i) => {
        const cell = row.getCell(i + 1);
        if (cell.type === ExcelJS.ValueType.Formula)
          throw Error("Usa valores, no fórmulas");
        item[col] = ["udc", "duracion", "porcentaje"].includes(col)
          ? Number(cell.text)
          : cell.text;
      });
      if (name === "ofertas") item.estado = "Borrador";
      if (name === "participaciones") {
        item.estatus = "Pendiente";
        item.comentarios = "";
      }
      a[name].push(item);
    });
  }
  a.sobrecargas = [];
  return a;
}
