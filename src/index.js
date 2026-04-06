import { bootstarp } from "./app.controller.js";

bootstarp().catch((error) => {
  console.error("Failed to bootstrap server", error);
  process.exit(1);
});
