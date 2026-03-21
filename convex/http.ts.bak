/**
 * HTTP Router for Convex.
 * Routes HTTP requests to the appropriate SMTP handler functions.
 */

import { httpRouter } from "convex/server";
import {
  getDomain,
  getMailbox,
  storeMessage,
  logSpamEvaluation,
  getUploadUrl,
} from "./smtp";

/** HTTP router instance for handling external requests. */
const http = httpRouter();

// SMTP ingress endpoints

/** Route for domain lookup by name. */
http.route({
  path: "/smtp/getDomain",
  method: "POST",
  handler: getDomain,
});

/** Route for mailbox lookup by domain and name. */
http.route({
  path: "/smtp/getMailbox",
  method: "POST",
  handler: getMailbox,
});

/** Route for storing inbound messages. */
http.route({
  path: "/smtp/storeMessage",
  method: "POST",
  handler: storeMessage,
});

/** Route for logging spam evaluation results. */
http.route({
  path: "/smtp/logSpamEvaluation",
  method: "POST",
  handler: logSpamEvaluation,
});

/** Route for getting attachment upload URLs. */
http.route({
  path: "/smtp/getUploadUrl",
  method: "POST",
  handler: getUploadUrl,
});

export default http;
