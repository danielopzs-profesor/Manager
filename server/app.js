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
import { academicRoutes } from "./academic-routes.js";
import {
  migrateAcademic,
  workload,
  publicAcademic,
  publishIssues,
} from "./academic.js";
import { passwordMatches } from "./accounts.js";
import { originPolicy } from "./origins.js";
export async function createApp({
  serverless = false,
  env = process.env,
} = {}) {
  const production = env.NODE_ENV === "production" || serverless;
  const policy = originPolicy(env, { serverless, production });
  const publicUrl = policy.publicUrl;
  if (
    production &&
    (!env.ADMIN_PASSWORD ||
      !env.SESSION_SECRET ||
      env.SESSION_SECRET.length < 32 ||
      !publicUrl?.startsWith("https://"))
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
  if (!(await store.read()).academic)
    await store.mutate((db) => {
      migrateAcademic(db);
    });
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
      !policy.allows(req.get("origin"))
    )
      return res.status(403).json({
        error: `Esta dirección no está autorizada. Abre la aplicación desde ${policy.origins.join(" o ")}. Si usas un dominio nuevo, actualiza PUBLIC_URL y vuelve a desplegar.`,
      });
    next();
  });
  const auth = (req, res, next) => {
    if (!req.session.role)
      return res.status(401).json({ error: "Inicia sesión" });
    if (["admin", "consulta"].includes(req.session.role))
      return accountAuth(req, res, next);
    next();
  };
  const accountAuth = async (req, res, next) => {
    try {
      const db = await store.read();
      const accounts = db.academic?.admins || [];
      if (
        accounts.length &&
        !accounts.some(
          (a) =>
            a.id === req.session.adminId &&
            a.hash === req.session.adminVersion &&
            (a.role || "admin") === req.session.role,
        )
      )
        return res.status(401).json({
          error:
            "Tu acceso cambió. Cierra sesión y vuelve a ingresar con tu cuenta individual.",
        });
      if (!accounts.length && req.session.role !== "admin")
        return res.status(401).json({ error: "Cuenta no disponible" });
      next();
    } catch (e) {
      next(e);
    }
  };
  const admin = (req, res, next) =>
    req.session.role === "admin"
      ? accountAuth(req, res, next)
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
      let nomina, adminAccount;
      if (["admin", "consulta"].includes(role)) {
        const db = await store.read();
        const accounts = db.academic?.admins || [];
        if (accounts.length) {
          adminAccount = accounts.find(
            (a) => a.id === String(identifier).trim().toLowerCase(),
          );
          if (
            !adminAccount ||
            !(await passwordMatches(password, adminAccount.hash))
          )
            return res
              .status(401)
              .json({ error: "Usuario o contraseña incorrectos" });
        } else if (
          role !== "admin" ||
          !equal(String(password), env.ADMIN_PASSWORD || "admin-demo")
        )
          return res.status(401).json({ error: "Contraseña incorrecta" });
      } else {
        const db = await store.read();
        const people = db.academic
          ? db.academic.profesores.map((p) => ({ ...p, nomina: p.id }))
          : db.Profesores;
        const p = people.find(
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
      req.session.role = adminAccount
        ? adminAccount.role || "admin"
        : role === "admin"
          ? "admin"
          : "profesor";
      req.session.nomina = nomina;
      if (adminAccount) {
        req.session.adminId = adminAccount.id;
        req.session.adminVersion = adminAccount.hash;
      }
      res.json({
        role: req.session.role,
        nomina,
        adminId: req.session.adminId,
      });
    },
  );
  app.post("/api/logout", (req, res) =>
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    }),
  );
  app.get("/api/me", (req, res) =>
    res.json({
      role: req.session.role || null,
      nomina: req.session.nomina,
      adminId: req.session.adminId,
    }),
  );
  app.get("/api/config", (req, res) =>
    res.json({
      production,
      version: "3.1.0",
      schema: 2,
      publicUrl,
      allowedOrigins: policy.origins,
    }),
  );
  academicRoutes(app, { store, auth, admin });
  app.use(
    ["/api/respond", "/api/classes", "/api/professors", "/api/import"],
    (req, res, next) =>
      req.method === "POST"
        ? res.status(409).json({
            error: "Actualiza la página para utilizar el modelo académico v2.",
          })
        : next(),
  );
  app.get("/api/data", auth, (req, res) => res.redirect(307, "/api/academic"));
  app.get("/api/export", auth, admin, async (req, res) => {
    res.redirect(307, "/api/academic/export");
  });
  app.post("/api/notify/:nomina", auth, admin, async (req, res) => {
    const db = await store.read();
    const a = migrateAcademic(db);
    const p = a.profesores.find((p) => p.id === req.params.nomina);
    if (!p) return res.status(404).json({ error: "Profesor no encontrado" });
    const selectedSemester = String(
      req.body.semestre || a.semestres[0]?.id || "",
    );
    if (!a.semestres.some((s) => s.id === selectedSemester))
      return res.status(400).json({ error: "Semestre no encontrado" });
    const ps = a.participaciones.filter(
      (x) =>
        x.profesor === p.id &&
        a.ofertas.find((o) => o.id === x.oferta)?.estado === "Publicada" &&
        a.ofertas.find((o) => o.id === x.oferta)?.semestre === selectedSemester,
    );
    const coords = a.coordinaciones.filter(
      (x) =>
        x.profesor === p.id &&
        a.ofertas.find((o) => o.id === x.oferta)?.estado === "Publicada" &&
        a.ofertas.find((o) => o.id === x.oferta)?.semestre === selectedSemester,
    );
    if (!ps.length && !coords.length)
      return res.status(400).json({
        error:
          "Primero completa y publica al menos una oferta para este profesor.",
      });
    const token = randomBytes(32).toString("hex");
    const url = new URL(publicUrl);
    url.searchParams.set("nomina", p.id);
    url.searchParams.set("token", token);
    const text =
      `Hola ${p.nombre},\nTu oferta académica:\n` +
      ps
        .map((x) => {
          const o = a.ofertas.find((o) => o.id === x.oferta);
          return `${a.ufs.find((u) => u.id === o.uf).nombre} · Grupo ${o.grupo} · Clave ${o.clave} · ${o.semestre} · ${o.periodos} · ${x.porcentaje}% · ${(o.udc * x.porcentaje) / 100} UDC`;
        })
        .join("\n") +
      coords
        .map(
          (c) =>
            `\nCoordinación ${a.ofertas.find((o) => o.id === c.oferta)?.clave}: ${c.udc} UDC`,
        )
        .join("") +
      `\nResponde aquí (vigencia 48 h): ${url}`;
    await offers.put(token, {
      nomina: p.id,
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
    const databaseError =
      typeof err.code === "string" && /^[0-9A-Z]{5}$/.test(err.code);
    res.status(databaseError ? 503 : err.status || 400).json({
      error: databaseError
        ? "La base de datos no pudo completar la operación. Reintenta o contacta al administrador."
        : err.message || "Error de solicitud",
    });
  });
  return {
    app,
    close: async () => {
      await runtime?.sessions.close();
      await runtime?.pool.end();
    },
  };
}
