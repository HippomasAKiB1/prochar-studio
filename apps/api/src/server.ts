import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Prochar Studio API listening on port ${env.PORT} [${env.NODE_ENV}]`);
});

export { server };
