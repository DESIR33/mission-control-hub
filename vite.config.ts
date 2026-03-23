import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/") || id.includes("node_modules/react-router")) {
            return "vendor-react";
          }
          // Data layer
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@supabase/")) return "vendor-supabase";
          // Heavy visualization — keep recharts + all transitive d3/internals together to avoid circular-dep TDZ crashes
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/d3-") ||
            id.includes("node_modules/victory-") ||
            id.includes("node_modules/internmap") ||
            id.includes("node_modules/robust-predicates") ||
            id.includes("node_modules/delaunator") ||
            id.includes("node_modules/react-smooth") ||
            id.includes("node_modules/react-is") ||
            id.includes("node_modules/react-transition-group") ||
            id.includes("node_modules/decimal.js") ||
            id.includes("node_modules/eventemitter3") ||
            id.includes("node_modules/recharts-scale") ||
            id.includes("node_modules/fast-equals") ||
            id.includes("node_modules/tiny-invariant") ||
            id.includes("node_modules/prop-types") ||
            id.includes("node_modules/lodash")
          ) return "vendor-charts";
          // Animation
          if (id.includes("node_modules/framer-motion")) return "vendor-motion";
          // Date utilities
          if (id.includes("node_modules/date-fns")) return "vendor-date";
          // PDF / export — must stay lazy, never in core bundle
          if (id.includes("node_modules/jspdf")) return "vendor-pdf";
          if (id.includes("node_modules/jszip")) return "vendor-zip";
          // Markdown rendering — lazy-loaded
          if (id.includes("node_modules/react-markdown") || id.includes("node_modules/remark-") || id.includes("node_modules/rehype-") || id.includes("node_modules/unified") || id.includes("node_modules/mdast") || id.includes("node_modules/micromark")) {
            return "vendor-markdown";
          }
          // Social icons — only used in a few pages
          if (id.includes("node_modules/react-icons")) return "vendor-icons";
          // DOMPurify — inbox only
          if (id.includes("node_modules/dompurify")) return "vendor-sanitize";
          // Radix UI primitives
          if (id.includes("node_modules/@radix-ui/")) return "vendor-ui";
          // Forms
          if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/@hookform/") || id.includes("node_modules/zod")) {
            return "vendor-forms";
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
    sourcemap: false,
    target: "es2020",
    cssMinify: true,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
}));
