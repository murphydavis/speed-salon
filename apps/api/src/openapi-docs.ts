import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Express } from "express";

const specPath = path.join(
  fileURLToPath(new URL("../../../docs/openapi.yaml", import.meta.url)),
);

const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Speed Salon API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/openapi.yaml",
      dom_id: "#swagger-ui",
      persistAuthorization: true,
    });
  </script>
</body>
</html>
`;

export function mountOpenApiDocs(app: Express): void {
  app.get("/openapi.yaml", (_req, res) => {
    res.type("application/yaml").send(readFileSync(specPath, "utf8"));
  });
  app.get("/docs", (_req, res) => {
    res.type("html").send(PAGE);
  });
}
