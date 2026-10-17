import { chromium } from "playwright";
import { mkdtemp, rm, mkdir } from "node:fs/promises";
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
await store.mutate(() => fixture());
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
  await mkdir('/tmp/arte-screens',{recursive:true});
  await page.getByRole('heading',{name:'Ingresa a tu espacio'}).waitFor();
  await page.screenshot({path:'/tmp/arte-screens/login-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Login móvil desbordado');
  await page.screenshot({path:'/tmp/arte-screens/login-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1050});

  await page
    .getByRole("button", { name: "Administrador", exact: true })
    .click();
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "Ingresar →" }).click();
  await page
    .getByRole("heading", { name: "Una mirada al semestre." })
    .waitFor();
  await page.getByRole("button", { name: "Profesores", exact: true }).click();
  await page.getByRole("button", { name: "+ Profesor", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nómina", { exact: true }).fill("L004");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Ana Ejemplo");
  await dialog
    .getByLabel("Correo institucional", { exact: true })
    .fill("ana@example.edu");
  await dialog.getByRole("button", { name: "Guardar cambios" }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Ana Ejemplo" }).waitFor();
  await page.getByRole("button", { name: "Ofertas", exact: true }).click();
  await page.getByRole("button", { name: "Ver asignación →" }).first().click();
  await page
    .getByRole("button", { name: "Publicar oferta", exact: true })
    .click();
  await page.getByText("Oferta publicada. Ya puedes compartirla.").waitFor();
  await page
    .getByRole("button", { name: "Usuarios y permisos", exact: true })
    .click();
  await page.getByRole("button", { name: "+ Usuario", exact: true }).click();
  await dialog.getByLabel("Usuario", { exact: true }).fill("admin.uno");
  await dialog.getByLabel("Nombre", { exact: true }).fill("Admin Uno");
  await dialog
    .getByLabel("Contraseña", { exact: false })
    .fill("browser-personal-password");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("Admin Uno", { exact: true }).waitFor();
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
  await page.getByRole("button", { name: "Profesor", exact: true }).click();
  await page.getByRole("button", { name: "Consulta", exact: true }).click();
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
  await page.getByRole("button", { name: "Profesor", exact: true }).click();
  await page.getByLabel("Nómina o correo institucional").fill("L001");
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
