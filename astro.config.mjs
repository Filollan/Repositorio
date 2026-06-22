import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/serverless";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
	site: "https://miguel-llanten.vercel.app",
	output: "server",
	adapter: vercel(),
	integrations: [sitemap()],
});
