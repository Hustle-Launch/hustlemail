/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as domains from "../domains.js";
import type * as http from "../http.js";
import type * as lib_dkim from "../lib/dkim.js";
import type * as mailboxes from "../mailboxes.js";
import type * as messages from "../messages.js";
import type * as mutations from "../mutations.js";
import type * as queries from "../queries.js";
import type * as smtp from "../smtp.js";
import type * as smtp_internal from "../smtp_internal.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  domains: typeof domains;
  http: typeof http;
  "lib/dkim": typeof lib_dkim;
  mailboxes: typeof mailboxes;
  messages: typeof messages;
  mutations: typeof mutations;
  queries: typeof queries;
  smtp: typeof smtp;
  smtp_internal: typeof smtp_internal;
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
