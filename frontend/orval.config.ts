import { defineConfig } from "orval";

export default defineConfig({
  careerops: {
    input: "http://localhost:8080/openapi/v1.json",
    output: {
      mode: "tags-split",
      target: "src/lib/api",
      schemas: "src/lib/api/model",
      client: "react-query",
      override: {
        mutator: { path: "src/lib/api-client.ts", name: "apiClient" },
      },
    },
  },
  careeropsZod: {
    input: "http://localhost:8080/openapi/v1.json",
    output: {
      mode: "tags-split",
      target: "src/lib/api",
      client: "zod",
      fileExtension: ".zod.ts",
    },
  },
});
