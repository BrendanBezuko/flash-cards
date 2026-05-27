import { copyFileSync, existsSync } from "fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function ghPagesSpaFallback(): Plugin {
  return {
    name: "gh-pages-spa-fallback",
    closeBundle() {
      const indexPath = path.resolve(__dirname, "dist/index.html");
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, path.resolve(__dirname, "dist/404.html"));
      }
    },
  };
}

// GitHub Pages serves from /repo-name/; override with VITE_BASE if needed.
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
  process.env.VITE_BASE ?? (repoName ? `/${repoName}/` : "/");

export default defineConfig({
  base,
  plugins: [react(), ghPagesSpaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
