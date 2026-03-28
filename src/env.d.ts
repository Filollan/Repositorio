/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NOTION_TOKEN?: string;
  readonly NOTION_PROJECTS?: string;
  readonly NOTION_PROYECTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
