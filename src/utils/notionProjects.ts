const NOTION_API_VERSION = "2022-06-28";

export type Project = {
  name: string;
  description: string;
  technologies: string[];
  liveLink: string;
  sourceLink: string;
  image: {
    src: string;
    alt: string;
  } | null;
  createdAt: string;
};

type NotionRichText = {
  plain_text?: string;
};

type NotionFile = {
  type: "file" | "external";
  name?: string;
  file?: { url?: string };
  external?: { url?: string };
};

type NotionPage = {
  created_time: string;
  properties?: Record<string, unknown>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

const getPlainText = (value: unknown) => {
  if (!value || typeof value !== "object") return "";

  const richText = (value as { rich_text?: NotionRichText[] }).rich_text;
  if (Array.isArray(richText) && richText.length > 0) {
    return richText.map((item) => item.plain_text ?? "").join("").trim();
  }

  const title = (value as { title?: NotionRichText[] }).title;
  if (Array.isArray(title) && title.length > 0) {
    return title.map((item) => item.plain_text ?? "").join("").trim();
  }

  return "";
};

const getUrl = (value: unknown) => {
  if (!value || typeof value !== "object") return "";
  return ((value as { url?: string }).url ?? "").trim();
};

const getFirstFileUrl = (value: unknown) => {
  if (!value || typeof value !== "object") return "";

  const files = (value as { files?: NotionFile[] }).files;
  if (!Array.isArray(files) || files.length === 0) return "";

  const [firstFile] = files;
  if (!firstFile) return "";

  if (firstFile.type === "file") return firstFile.file?.url ?? "";
  if (firstFile.type === "external") return firstFile.external?.url ?? "";

  return "";
};

const parseTechnologies = (rawTechnologies: string) =>
  rawTechnologies
    .split(",")
    .map((technology) => technology.trim())
    .filter(Boolean);

const isValidUrl = (value: string) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const parseProjectFromPage = (page: NotionPage): Project | null => {
  const properties = page.properties ?? {};

  const name = getPlainText(properties.name);
  const description = getPlainText(properties.description);
  const technologies = parseTechnologies(getPlainText(properties.technologies));
  const liveLink = getUrl(properties.liveLink);
  const sourceLink = getUrl(properties.sourceLink);
  const imageUrl = getFirstFileUrl(properties.image);

  if (!name) return null;

  return {
    name,
    description,
    technologies,
    liveLink,
    sourceLink,
    image: imageUrl
      ? {
          src: imageUrl,
          alt: `Imagen de ${name}`,
        }
      : null,
    createdAt: page.created_time,
  };
};

const getNotionEnv = () => {
  const token = import.meta.env.NOTION_TOKEN;
  const databaseId =
    import.meta.env.NOTION_PROJECTS ?? import.meta.env.NOTION_PROYECTS;

  if (!token || !databaseId) {
    return {
      token: "",
      databaseId: "",
      hasConfig: false,
    };
  }

  return {
    token,
    databaseId,
    hasConfig: true,
  };
};

export const getProjectsFromNotion = async () => {
  const { token, databaseId, hasConfig } = getNotionEnv();

  if (!hasConfig) return [];

  try {
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 100,
          sorts: [
            {
              timestamp: "created_time",
              direction: "descending",
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn("No se pudieron cargar proyectos desde Notion:", errorBody);
      return [];
    }

    const data = (await response.json()) as NotionQueryResponse;

    return (data.results ?? [])
      .map(parseProjectFromPage)
      .filter((project): project is Project => Boolean(project));
  } catch (error) {
    console.warn("Error al consultar Notion:", error);
    return [];
  }
};

export const splitProjectsByType = (projects: Project[]) => {
  const mainProjects = projects.filter(
    (project) => Boolean(project.image) && isValidUrl(project.liveLink),
  );

  const otherProjects = projects.filter(
    (project) => !project.image || !isValidUrl(project.liveLink),
  );

  return { mainProjects, otherProjects };
};
