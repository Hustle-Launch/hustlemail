export const mail = {
  domain: "t3.chat",
  boxes: [
    "support",
    "theo",
    "mark",
    "phase",
    "sjobs",
    "sama",
    "dario",
    "em",
    "noreply",
    "catch-all",
    "sales",
    "susan",
    "sarah",
    "laura",
  ],
  routes: {
    support: ["susan", "sarah", "laura"],
    "catch-all": ["sjobs", "dario", "sama", "em", "theo"],
    noreply: ["bounce"],
    sales: ["steve", "elizabeth"],
  },
  auth: {
    provider: "convex", // or "clerk", "convex", "auth0"
  },
};

// mark@t3.chat

// mail.t3.chat -> t3.chat mail web client
