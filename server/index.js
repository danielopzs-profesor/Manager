import {initializeLocalRuntime} from "./local-updates.js";
if(process.env.NODE_ENV!=="production")await initializeLocalRuntime();
if (process.env.NODE_ENV === "production" && process.env.ENFORCE_NAMED_ROLES === undefined) process.env.ENFORCE_NAMED_ROLES = "1";
import { createApp } from "./app.js";
const { app } = await createApp();
app.listen(process.env.PORT || 3000, "0.0.0.0", () =>
  console.log("Arte FJ27 disponible en puerto " + (process.env.PORT || 3000)),
);
