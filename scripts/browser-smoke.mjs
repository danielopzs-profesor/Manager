import { chromium } from "playwright";
import { mkdtemp, rm, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { createApp } from "../server/app.js";
import { fixture } from "../tests/fixtures.js";
const dir = await mkdtemp(path.join(os.tmpdir(), "arte-browser-"));
const file = path.join(dir, "smoke.xlsx");
const store = new Store(file);
await store.init();
await store.mutate(() => { const data = fixture(); data.academic.participaciones[0].porcentaje = 25; data.academic.ofertas[0].alumnos = 25; return data; });
const { app, close } = await createApp({
  env: {
    EXCEL_PATH: file,
    ADMIN_PASSWORD: "browser-test-password",
    PUBLIC_URL: "http://localhost:31879",
  },
});
const server = app.listen(31879);
await new Promise((r) => server.once("listening", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE
    ? { executablePath: process.env.BROWSER_EXECUTABLE }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const failures = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("http://localhost:31879");
  await mkdir("/tmp/arte-screens", { recursive: true });
  await page.getByRole("heading", { name: "Ingresa a tu espacio" }).waitFor();
  assert.equal(await page.locator(".login-card input").count(), 2);
  assert.equal(await page.locator(".login-card .tabs").count(), 0);
  await page.screenshot({
    path: "/tmp/arte-screens/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "Login móvil desbordado",
  );
  await page.screenshot({
    path: "/tmp/arte-screens/login-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1050 });

  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Ingresar →" }).click();
  await page
    .getByRole("heading", { name: "Una mirada al semestre." })
    .waitFor();
  await page.getByRole("button", {name:"Editar fechas",exact:true}).click();
  await dialogCalendar();
  async function dialogCalendar(){
    const cal=page.getByRole("dialog");
    await cal.getByLabel("Año de inicio").selectOption("2027");
    await cal.getByLabel("Mes de inicio").selectOption("1");
    assert.equal(await cal.getByRole("button",{name:"Seleccionar 2 de febrero de 2027",exact:true}).isDisabled(),true);
    await cal.getByRole("button",{name:"Seleccionar 1 de febrero de 2027",exact:true}).click();
    await cal.getByLabel("Identificador del periodo para entrega",{exact:true}).fill("202711");
    await cal.getByLabel("Fecha fin · P1",{exact:true}).fill("2027-03-05");
    await cal.getByRole("button",{name:"Guardar cambios",exact:true}).click();
    await cal.waitFor({state:"hidden"});
  }
  await page.getByRole("button", { name: "Profesores", exact: true }).click();
  await page.getByRole("button", { name: "+ Profesor", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Usuario", { exact: true }).fill("L004");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana Ejemplo");
  await dialog
    .getByLabel("Correo institucional", { exact: true })
    .fill("ana@example.edu");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Ana Ejemplo" }).waitFor();
  await page.getByRole("heading",{name:"Ana Ejemplo",exact:true}).locator("..").getByRole("button",{name:"Editar",exact:true}).click();
  assert.equal(await dialog.getByLabel("Usuario",{exact:true}).inputValue(),"L004");
  assert.equal(await dialog.getByLabel("Usuario",{exact:true}).getAttribute("readonly"),"");
  assert.equal(await dialog.getByLabel("Nómina para formato de entrega",{exact:true}).count(),0);
  await dialog.getByRole("button",{name:"Cerrar",exact:true}).click();

  const [cardDownload]=await Promise.all([page.waitForEvent("download"),page.getByRole("heading",{name:"Ana Ejemplo",exact:true}).locator("..").getByRole("button",{name:"Descargar ficha JPEG",exact:true}).click()]);
  await cardDownload.saveAs("/tmp/arte-screens/ficha-profesor.jpg");
  const jpeg=await readFile("/tmp/arte-screens/ficha-profesor.jpg");assert.equal(jpeg[0],255);assert.equal(jpeg[1],216);

  await page.getByRole("heading", { name: "Ana Ejemplo", exact: true }).locator("..")
    .getByRole("button", { name: "Asignar unidad de formación", exact: true }).click();
  await dialog.getByLabel("Oferta / grupo", { exact: true }).selectOption("O1");
  assert.equal(await dialog.getByLabel("Profesor", { exact: true }).inputValue(), "L004");
  assert.equal(await dialog.getByLabel("Responsabilidad (%)", { exact: true }).inputValue(), "25");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "hidden" });

  await page
    .getByRole("heading", { name: "Mariana Torres", exact: true })
    .locator("..")
    .getByRole("button", { name: "Configurar acceso", exact: true })
    .click();
  await dialog
    .getByLabel("Nueva contraseña", { exact: true })
    .fill("browser-professor-password");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Salones", exact: true }).click();
  await page.getByRole("button", { name: "+ Salón", exact: true }).click();
  await dialog.getByLabel("Edificio", {exact:true}).fill("CEDES");
  await dialog.getByLabel("Número de salón", {exact:true}).fill("319");
  await dialog.getByLabel("Código de salón para entrega",{exact:true}).fill("A-CD- 319");
  await dialog.getByLabel("Capacidad de alumnos", {exact:true}).fill("30");
  await dialog.getByLabel("Lun", {exact:true}).check();
  await dialog.getByLabel("Horario de trabajo: inicio", {exact:true}).fill("08:00");
  await dialog.getByLabel("Horario de trabajo: fin", {exact:true}).fill("18:00");
  await dialog.getByRole("button", {name:"Guardar cambios", exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await page.getByRole("button", { name: "Ofertas", exact: true }).click();
  await page.getByRole("button", { name: "Ver asignación →" }).first().click();
  await page.locator(".record").filter({ hasText: "09:00-13:00" })
    .getByRole("button", { name: "Editar", exact: true }).click();
  await dialog.getByLabel("Ana Ejemplo", { exact: true }).check();
  await dialog.getByLabel("Aula", {exact:true}).selectOption({label:"CEDES-319 · 30 alumnos · Lun 08:00-18:00"});
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "hidden" });

  await page.getByRole("button",{name:"Datos",exact:true}).click();
  const [draftDownload]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Descargar formato de entrega",exact:true}).click()]);
  await draftDownload.saveAs("/tmp/arte-screens/Formato_Entrega_Borrador.xlsx");
  await page.getByRole("button",{name:"Ofertas",exact:true}).click();
  await page.getByRole("button",{name:"Ver asignación →"}).first().click();
  await page
    .getByRole("button", { name: "Publicar oferta", exact: true })
    .click();
  await page.getByText("Oferta publicada. Ya puedes compartirla.").waitFor();
  await page.getByRole("button",{name:"Datos",exact:true}).click();
  const [deliveryDownload]=await Promise.all([page.waitForEvent("download"),page.getByRole("button",{name:"Descargar formato de entrega",exact:true}).click()]);
  await deliveryDownload.saveAs("/tmp/arte-screens/Formato_Entrega.xlsx");
  assert.equal((await readFile("/tmp/arte-screens/Formato_Entrega.xlsx")).subarray(0,2).toString(),"PK");
  await page.getByRole("button", {name:"Salones",exact:true}).click();
  await page.getByRole("heading", {name:"CEDES-319",exact:true}).waitFor();
  await page.getByText("09:00-13:00 · Laboratorio",{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,"Mapa de salones móvil desbordado");
  await page.screenshot({path:"/tmp/arte-screens/salones-mobile.png",fullPage:true});
  await page.setViewportSize({width:1440,height:1050});

  await page.getByRole("button", {name:"Préstamos",exact:true}).click();
  await page.getByRole("button", {name:"+ Préstamo",exact:true}).click();
  await dialog.getByLabel("Profesor",{exact:true}).selectOption("L001");
  await dialog.getByLabel("Departamento de destino",{exact:true}).fill("Diseño");
  await dialog.getByLabel("UDC de préstamo",{exact:true}).fill("3");
  await dialog.getByRole("button",{name:"Guardar cambios",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await page.getByRole("button",{name:"Inicio",exact:true}).click();
  await page.getByRole("heading",{name:"Disponibilidad de salones",exact:true}).waitFor();
  await page.getByRole("button",{name:"Ver cargas aceptadas",exact:true}).click();
  await page.getByRole("button",{name:"Inicio",exact:true}).click();
  await page
    .getByRole("button", { name: "Usuarios y permisos", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Usuario", exact: true }).click();
  await dialog.getByLabel("Usuario", { exact: true }).fill("admin.uno");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Admin Uno");
  await dialog.locator("select[name=role]").selectOption("admin");
  await dialog.locator("select[name=profesor]").selectOption("L001");
  await dialog
    .getByLabel("Contraseña", { exact: false })
    .fill("browser-personal-password");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("Admin Uno", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Mi carga académica", exact: true }).click();
  await page.getByRole("heading", { name: "Mi carga académica", exact: true, level: 1 }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Aceptar clases", exact: true }).count(), 1);
  await page.getByRole("button", { name: "Solicitar cambio", exact: true }).click();
  await dialog.getByLabel("Observaciones o conflicto de horario", { exact: true }).fill("Revisar mi horario de docencia");
  await dialog.getByRole("button", { name: "Confirmar respuesta", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Usuarios y permisos", exact: true }).click();

  await page.getByRole("button", { name: "+ Usuario", exact: true }).click();
  await dialog.getByLabel("Usuario", { exact: true }).fill("lector");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Usuario Consulta");
  await dialog.locator("select[name=role]").selectOption("consulta");
  await dialog
    .getByLabel("Contraseña", { exact: false })
    .fill("browser-reader-password");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Datos", exact: true }).click();
  await page.getByRole("heading", { name: "Versiones anteriores" }).waitFor();
  await page
    .getByRole("button", { name: "Restaurar", exact: true })
    .first()
    .waitFor();
  await page.getByRole("button", { name: "Inicio", exact: true }).click();
  await mkdir("/tmp/arte-screens", { recursive: true });
  await page.screenshot({
    path: "/tmp/arte-screens/admin-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/arte-screens/admin-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "Desbordamiento horizontal de la página móvil",
  );
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.getByLabel("Usuario", { exact: true }).fill("lector");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("browser-reader-password");
  await page.getByRole("button", { name: "Ingresar →" }).click();
  await page
    .getByRole("heading", { name: "Una mirada al semestre." })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Usuarios y permisos", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Profesores", exact: true }).click();
  await page
    .getByRole("heading", { name: "Mariana Torres", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "+ Profesor", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Unidades de formación", exact: true })
    .click();
  assert.equal(
    await page.getByRole("button", { name: "Editar", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Ofertas", exact: true }).click();
  await page.getByRole("button", { name: "Ver asignación →" }).first().click();
  assert.equal(
    await page
      .getByRole("button", { name: "Publicar oferta", exact: true })
      .count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Aceptar", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.getByLabel("Usuario", { exact: true }).fill("mariana@example.edu");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("browser-professor-password");
  await page.getByRole("button", { name: "Ingresar →" }).click();
  await page.getByRole("heading", { name: "Tu próximo semestre." }).waitFor();
  await page
    .getByRole("button", { name: "Mis respuestas", exact: true })
    .click();
  await page.getByRole("button", { name: "Ver asignación →" }).first().click();
  await page.getByRole("button", { name: "Aceptar", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Confirmar respuesta", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("Aceptada", { exact: true }).waitFor();
  await page.screenshot({
    path: "/tmp/arte-screens/professor-mobile.png",
    fullPage: true,
  });

  await page.getByRole("button",{name:"Coordinación",exact:true}).click();
  await page.getByRole("button",{name:"Ver asignación →",exact:true}).first().click();
  assert.equal(await page.getByRole("button",{name:"Publicar oferta",exact:true}).count(),0);
  await page.getByRole("button",{name:"Asignar profesor",exact:true}).click();
  assert.equal(await dialog.getByLabel("Oferta / grupo",{exact:true}).locator("option").count(),2);
  await dialog.getByRole("button",{name:"Cerrar",exact:true}).click();
  await page.getByRole("button",{name:"Cerrar sesión",exact:true}).click();
  await store.mutate(db=>{const a=db.academic.admins.find(a=>a.id==="admin.uno");a.role="superadmin";a.protegido=true;});
  await page.getByLabel("Usuario",{exact:true}).fill("admin.uno");
  await page.getByLabel("Contraseña",{exact:true}).fill("browser-personal-password");
  await page.getByRole("button",{name:"Ingresar →",exact:true}).click();
  await page.getByRole("button",{name:"Profesores",exact:true}).click();
  const marianaPanel=page.getByRole("heading",{name:"Mariana Torres",exact:true}).locator("..");
  assert.equal(await marianaPanel.getByRole("checkbox").isDisabled(),true);
  const actions=marianaPanel.getByRole("group",{name:"Acciones de Mariana Torres"});
  assert.deepEqual(await actions.getByRole("button").evaluateAll(bs=>bs.map(b=>b.getAttribute("aria-label"))),["Asignar unidad de formación","Descargar ficha JPEG","Editar","Compartir oferta","Eliminar"]);
  await page.setViewportSize({width:390,height:844});
  const positions=await actions.getByRole("button").evaluateAll(bs=>bs.map(b=>({y:b.getBoundingClientRect().top,w:b.getBoundingClientRect().width,title:b.title})));
  assert.equal(new Set(positions.map(b=>b.y)).size,1);
  assert.ok(positions.every(b=>b.w>=44&&b.title));
  await page.screenshot({path:"/tmp/arte-screens/professor-icons-mobile.png",fullPage:true});

  assert.equal(await page.getByRole("button",{name:"Cuenta administrativa",exact:true}).count(),0);

  await page.getByRole("button",{name:"Usuarios y permisos",exact:true}).click();
  const superAccount=page.getByText("admin.uno ·",{exact:false}).locator("../..");
  await superAccount.getByRole("button",{name:"Editar / contraseña",exact:true}).click();
  assert.equal(await dialog.getByLabel("Rol",{exact:true}).isDisabled(),true);
  assert.equal(await dialog.locator("form").evaluate(f=>new FormData(f).get("role")),"superadmin");
  assert.ok(await dialog.getByLabel("Combinar con perfil de profesor (opcional)").isEnabled());
  await dialog.getByRole("button",{name:"Confirmar",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await page.getByRole("button",{name:"Historial",exact:true}).click();
  await page.getByLabel("Categoría de historial").selectOption("accesos");
  const [historyDownload]=await Promise.all([page.waitForEvent("download"),page.getByRole("link",{name:"Descargar TXT",exact:true}).click()]);
  await historyDownload.saveAs("/tmp/arte-screens/historial.txt");
  assert.match(await readFile("/tmp/arte-screens/historial.txt","utf8"),/Inicio de sesión/);
  await page.getByRole("button",{name:"Datos",exact:true}).click();
  const [pdfDownload]=await Promise.all([page.waitForEvent("download"),page.getByRole("link",{name:"Descargar reporte PDF",exact:true}).click()]);
  await pdfDownload.saveAs("/tmp/arte-screens/reporte.pdf");
  assert.equal((await readFile("/tmp/arte-screens/reporte.pdf")).subarray(0,8).toString(),"%PDF-1.4");
  assert.deepEqual(failures, []);
  console.log(
    "Navegador: creación de profesor y administrador, publicación, respaldos y aceptación docente correctos. Desktop y móvil sin errores JS ni desbordamiento.",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  await close();
  await rm(dir, { recursive: true, force: true });
}
