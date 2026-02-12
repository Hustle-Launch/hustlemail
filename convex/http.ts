/**
 * HTTP Router for Convex
 * 
 * Routes HTTP requests to the appropriate handlers.
 */

import { httpRouter } from "convex/server";
import {
  getDomain,
  getMailbox,
  storeMessage,
  logSpamEvaluation,
  getUploadUrl,
} from "./smtp";

const http = httpRouter();

// SMTP ingress endpoints
http.route({
  path: "/smtp/getDomain",
  method: "POST",
  handler: getDomain,
});

http.route({
  path: "/smtp/getMailbox",
  method: "POST",
  handler: getMailbox,
});

http.route({
  path: "/smtp/storeMessage",
  method: "POST",
  handler: storeMessage,
});

http.route({
  path: "/smtp/logSpamEvaluation",
  method: "POST",
  handler: logSpamEvaluation,
});

http.route({
  path: "/smtp/getUploadUrl",
  method: "POST",
  handler: getUploadUrl,
});

export default http;
