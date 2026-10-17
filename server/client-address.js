import { isIP } from "node:net";
// Netlify aporta la IP mediante esta cabecera, sin requestContext de API Gateway.
export function normalizeClientAddress(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const supplied = headers["x-nf-client-connection-ip"];
  const gateway = event.requestContext?.identity?.sourceIp;
  const ip =
    typeof supplied === "string" && isIP(supplied.trim())
      ? supplied.trim()
      : typeof gateway === "string" && isIP(gateway)
        ? gateway
        : undefined;
  delete headers["x-forwarded-for"];
  if (ip) headers["x-forwarded-for"] = ip;
  event.headers = headers;
  if (event.multiValueHeaders) {
    event.multiValueHeaders = Object.fromEntries(
      Object.entries(event.multiValueHeaders).filter(
        ([key]) => key.toLowerCase() !== "x-forwarded-for",
      ),
    );
  }
  event.requestContext = {
    ...event.requestContext,
    identity: { ...event.requestContext?.identity, sourceIp: ip },
  };
}
