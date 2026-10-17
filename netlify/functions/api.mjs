import serverless from "serverless-http";
import { normalizeClientAddress } from "../../server/client-address.js";
import { createApp } from "../../server/app.js";
let ready;
export async function handler(event, context) {
  normalizeClientAddress(event);
  // Netlify termina TLS antes de invocar la función; no confiar en cabeceras del visitante.
  event.headers = { ...event.headers, "x-forwarded-proto": "https" };
  if (event.multiValueHeaders)
    event.multiValueHeaders["x-forwarded-proto"] = ["https"];
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    if (!ready)
      ready = createApp({ serverless: true })
        .then(({ app }) =>
          serverless(app, {
            basePath: "/.netlify/functions/api",
            binary: [
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ],
          }),
        )
        .catch((e) => {
          ready = null;
          throw e;
        });
    return await (
      await ready
    )(event, context);
  } catch (e) {
    console.error("No fue posible iniciar la API:", e.message);
    return {
      statusCode: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        error:
          "Servicio no disponible. Revisa las variables y conexión de base de datos en Netlify.",
      }),
    };
  }
}
