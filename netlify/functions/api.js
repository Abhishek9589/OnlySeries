import serverless from "serverless-http";
import { createServer } from "../../server/index.js";

export const handler = serverless(createServer());
