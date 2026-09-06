import { readConfig } from "../packages/cli/src/operations";

readConfig(process.argv[2] ?? "mail.config.ts")
  .then((config) => {
    console.log(
      JSON.stringify({
        valid: true,
        domain: config.domain,
        boxes: config.boxes.length,
        scope: "local configuration only",
      }),
    );
  })
  .catch(() => {
    console.error(
      "Invalid or unsupported mail configuration. Run the CLI config validate command for field paths.",
    );
    process.exitCode = 1;
  });
