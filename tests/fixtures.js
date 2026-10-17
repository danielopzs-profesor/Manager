import { migrateAcademic } from "../server/academic.js";
import { demo } from "../server/store.js";
export function fixture() {
  const db = structuredClone(demo);
  const a = migrateAcademic(db);
  a.profesores.forEach(
    (p) => (p.tipo = p.id === "L002" ? "Cátedra" : "Planta"),
  );
  a.semestres[0].inicio = "2027-02-01";
  a.ufs = [
    { id: "UF1", nombre: "Laboratorio", tipo: "Bloque", udc: 2 },
    { id: "UF2", nombre: "Intensiva", tipo: "Materia", udc: 2 },
  ];
  a.ofertas = [
    {
      id: "O1",
      clave: "123",
      grupo: "302",
      semestre: "FJ27",
      uf: "UF1",
      modalidad: "Ordinaria",
      duracion: 10,
      periodos: "P1,P2",
      udc: 2,
      estado: "Borrador",
    },
  ];
  a.participaciones = [
    {
      id: "R1",
      oferta: "O1",
      profesor: "L001",
      porcentaje: 50,
      estatus: "Pendiente",
      comentarios: "",
    },
    {
      id: "R2",
      oferta: "O1",
      profesor: "L002",
      porcentaje: 50,
      estatus: "Pendiente",
      comentarios: "",
    },
  ];
  a.coordinaciones = [{ id: "CO1", oferta: "O1", profesor: "L001", udc: 0.5 }];
  a.sesiones = [
    {
      id: "S1",
      oferta: "O1",
      profesores: "L001,L002",
      dias: "Lun",
      horario: "09:00-13:00",
      aula: "Taller 1",
      segmentos: "P1,P2",
    },
  ];
  a.sobrecargas = [];
  a.admins = [];
  return db;
}
