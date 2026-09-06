import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval("receive mail", { seconds: 10 }, internal.resend.poll);
crons.interval("recover sends and wake snoozed mail", { seconds: 10 }, internal.resendState.recoverSendsAndSnoozes);
export default crons;
