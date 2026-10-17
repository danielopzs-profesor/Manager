import express from "express";
import session from "express-session";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { isIP } from "node:net";
import multer from "multer";
import nodemailer from "nodemailer";
import { randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { Store, decode, encode } from "./store.js";
import { createDatabaseRuntime } from "./database.js";
export async function createApp({
  serverless = false,
  env = process.env,
} = {}) {
  const production = env.NODE_ENV === "production" || serverless;
  const publicUrl =
    env.PUBLIC_URL || (serverless ? env.URL : null) || "http://localhost:5173";
  if (
    production &&
    (!env.ADMIN_PASSWORD ||
      !env.SESSION_SECRET ||
      env.SESSION_SECRET.length < 32 ||
      !publicUrl.startsWith("https://"))
  ) {
    throw Error(
      "Configura ADMIN_PASSWORD, SESSION_SECRET (32 caracteres mínimo) y una URL HTTPS",
    );
  }
  if (serverless && !env.DATABASE_URL)
    throw Error("Configura DATABASE_URL de PostgreSQL antes de usar Netlify");
  const runtime = env.DATABASE_URL
    ? await createDatabaseRuntime(env.DATABASE_URL)
    : null;
  const store =
    runtime?.store ||
    new Store(
      path.resolve(env.EXCEL_PATH || "data/Programación Arte FJ27.xlsx"),
    );
  await store.init();
  const app = express();
  if (serverless || env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: production ? undefined : false }));
  app.use(express.json({ limit: "100kb" }));
  app.use(
    session({
      secret: env.SESSION_SECRET || randomBytes(32).toString("hex"),
      store: runtime?.sessions,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure: production,
        maxAge: 8 * 3600000,
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.get("origin") &&
      req.get("origin") !== new URL(publicUrl).origin
    )
      return res.status(403).json({ error: "Origen no permitido" });
    next();
  });
  const auth = (req, res, next) =>
    req.session.role
      ? next()
      : res.status(401).json({ error: "Inicia sesión" });
  const admin = (req, res, next) =>
    req.session.role === "admin"
      ? next()
      : res.status(403).json({ error: "Solo administrador" });
  const equal = (a, b) => {
    const x = Buffer.from(a),
      y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };
  const localOffers = new Map();
  const offers = runtime?.offers || {
    async put(token, offer) {
      localOffers.set(token, offer);
    },
    async consume(token, nomina) {
      const offer = localOffers.get(token);
      if (!offer || offer.nomina !== nomina || offer.expires < Date.now())
        return false;
      localOffers.delete(token);
      return true;
    },
  };
  app.post(
    "/api/login",
    rateLimit({
      windowMs: 60000,
      limit: 15,
      keyGenerator: (req) =>
        ipKeyGenerator(isIP(req.ip || "") ? req.ip : "unknown-client"),
      store: runtime?.limiter,
      message: {
        error:
          "Demasiados intentos. Espera un minuto antes de volver a ingresar.",
      },
    }),
    async (req, res) => {
      const { role, identifier = "", password = "", token = "" } = req.body;
      let nomina;
      if (role === "admin") {
        if (!equal(String(password), env.ADMIN_PASSWORD || "admin-demo"))
          return res.status(401).json({ error: "Contraseña incorrecta" });
      } else {
        const db = await store.read();
        const p = db.Profesores.find(
          (p) =>
            p.nomina === identifier ||
            p.correo.toLowerCase() === String(identifier).toLowerCase(),
        );
        if (!p)
          return res.status(401).json({ error: "Profesor no encontrado" });
        if (production) {
          if (!(await offers.consume(String(token), p.nomina)))
            return res.status(401).json({
              error:
                "Usa el enlace vigente de tu oferta. Solicita uno nuevo al administrador.",
            });
        }
        nomina = p.nomina;
      }
      await new Promise((resolve, reject) =>
        req.session.regenerate((e) => (e ? reject(e) : resolve())),
      );
      req.session.role = role === "admin" ? "admin" : "profesor";
      req.session.nomina = nomina;
      res.json({ role: req.session.role, nomina });
    },
  );
  app.post("/api/logout", auth, (req, res) =>
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    }),
  );
  app.get("/api/me", (req, res) =>
    res.json({ role: req.session.role || null, nomina: req.session.nomina }),
  );
  app.get("/api/data", auth, async (req, res) => {
    const db = await store.read();
    if (req.session.role !== "admin") {
      db.Profesores = db.Profesores.filter(
        (p) => p.nomina === req.session.nomina,
      );
      db.Clases_Asignadas = db.Clases_Asignadas.filter(
        (c) => c.nomina_profesor === req.session.nomina,
      );
      const ids = new Set(db.Clases_Asignadas.map((c) => c.id_materia));
      db.Materias = db.Materias.filter((m) => ids.has(m.id_materia));
    }
    res.json(db);
  });
  app.post("/api/respond", auth, async (req, res) => {
    const { ids, estatus, comentarios = "" } = req.body;
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      !["Aceptada", "Cambio Solicitado"].includes(estatus) ||
      typeof comentarios !== "string" ||
      comentarios.length > 2000 ||
      (estatus === "Cambio Solicitado" && !comentarios.trim())
    )
      return res.status(400).json({
        error:
          "Selecciona clases y escribe tus observaciones (máximo 2000 caracteres)",
      });
    await store.mutate((db) => {
      const classes = ids.map((id) =>
        db.Clases_Asignadas.find((c) => c.id_clase === id),
      );
      if (
        classes.some(
          (c) =>
            !c ||
            (req.session.role !== "admin" &&
              c.nomina_profesor !== req.session.nomina),
        )
      )
        throw Error("Clase no autorizada");
      classes.forEach((c) =>
        Object.assign(c, {
          estatus,
          comentarios: estatus === "Aceptada" ? "" : comentarios.trim(),
        }),
      );
    });
    res.json({ ok: true });
  });
  app.post("/api/classes", auth, admin, async (req, res) => {
    await store.mutate((db) => {
      const c = req.body;
      const old = db.Clases_Asignadas.find((x) => x.id_clase === c.id_clase);
      if (old) Object.assign(old, c);
      else db.Clases_Asignadas.push(c);
    });
    res.json({ ok: true });
  });
  app.post("/api/professors", auth, admin, async (req, res) => {
    await store.mutate((db) => {
      const p = req.body;
      const old = db.Profesores.find((x) => x.nomina === p.nomina);
      if (old) Object.assign(old, p);
      else db.Profesores.push(p);
    });
    res.json({ ok: true });
  });
  app.get("/api/export", auth, admin, async (req, res) => {
    const buffer = await encode(await store.read());
    res.attachment("Programación Arte FJ27.xlsx");
    res.send(Buffer.from(buffer));
  });
  app.post(
    "/api/import",
    auth,
    admin,
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 3 * 1024 * 1024 },
    }).single("file"),
    async (req, res) => {
      if (!req.file)
        return res.status(400).json({ error: "Selecciona un Excel" });
      const db = await decode(req.file.buffer);
      await store.mutate(() => db);
      res.json({ ok: true });
    },
  );
  app.post("/api/notify/:nomina", auth, admin, async (req, res) => {
    const db = await store.read();
    const p = db.Profesores.find((p) => p.nomina === req.params.nomina);
    if (!p) return res.status(404).json({ error: "Profesor no encontrado" });
    const token = randomBytes(32).toString("hex");
    const url = new URL(publicUrl);
    url.searchParams.set("nomina", p.nomina);
    url.searchParams.set("token", token);
    const text =
      `Hola ${p.nombre},\nTu oferta académica FJ27:\n` +
      db.Clases_Asignadas.filter((c) => c.nomina_profesor === p.nomina)
        .map(
          (c) =>
            `${db.Materias.find((m) => m.id_materia === c.id_materia).nombre_materia}: ${c.dias} ${c.horario}, ${c.aula}`,
        )
        .join("\n") +
      `\nResponde aquí (vigencia 48 h): ${url}`;
    await offers.put(token, {
      nomina: p.nomina,
      expires: Date.now() + 48 * 3600000,
    });
    if (env.SMTP_HOST) {
      const transport = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT || 587),
        secure: env.SMTP_PORT === "465",
        requireTLS: env.SMTP_PORT !== "465",
        auth: env.SMTP_USER
          ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
          : undefined,
      });
      await transport.sendMail({
        from: env.SMTP_FROM,
        to: p.correo,
        subject: "Oferta académica · Arte FJ27",
        text,
      });
    } else if (production && env.OFFER_DELIVERY !== "manual")
      return res.status(503).json({
        error:
          "Configura SMTP o activa OFFER_DELIVERY=manual para compartir enlaces privados",
      });
    res.json({
      mode: env.SMTP_HOST
        ? "enviado"
        : production
          ? "enlace privado"
          : "simulación",
      ...(!env.SMTP_HOST ? { preview: text } : {}),
    });
  });
  if (!serverless) {
    app.use(express.static("dist"));
    app.get("/{*path}", (req, res) =>
      res.sendFile(path.resolve("dist/index.html")),
    );
  }
  app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(400).json({ error: err.message || "Error de solicitud" });
  });
  return {
    app,
    close: async () => {
      await runtime?.sessions.close();
      await runtime?.pool.end();
    },
  };
}
