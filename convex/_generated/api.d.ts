/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as dkimActions from "../dkimActions.js";
import type * as domains from "../domains.js";
import type * as http from "../http.js";
import type * as lib_dkim_stub from "../lib/dkim_stub.js";
import type * as lib_encryption_stub from "../lib/encryption_stub.js";
import type * as mail from "../mail.js";
import type * as mailAuth from "../mailAuth.js";
import type * as mailValidators from "../mailValidators.js";
import type * as mailboxes from "../mailboxes.js";
import type * as messages from "../messages.js";
import type * as mutations from "../mutations.js";
import type * as queries from "../queries.js";
import type * as resend from "../resend.js";
import type * as resendState from "../resendState.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  dkimActions: typeof dkimActions;
  domains: typeof domains;
  http: typeof http;
  "lib/dkim_stub": typeof lib_dkim_stub;
  "lib/encryption_stub": typeof lib_encryption_stub;
  mail: typeof mail;
  mailAuth: typeof mailAuth;
  mailValidators: typeof mailValidators;
  mailboxes: typeof mailboxes;
  messages: typeof messages;
  mutations: typeof mutations;
  queries: typeof queries;
  resend: typeof resend;
  resendState: typeof resendState;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
