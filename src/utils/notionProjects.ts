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

type NotionMultiSelect = {
  name?: string;
};

type NotionPage = {
  created_time: string;
  properties?: Record<string, unknown>;
};

type NotionQueryResponse = {
  results?: NotionPage[];
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();

const getPropertyByAliases = (
  properties: Record<string, unknown>,
  aliases: string[],
) => {
  const normalizedAliases = aliases.map(normalizeKey);

  const foundKey = Object.keys(properties).find((propertyKey) =>
    normalizedAliases.includes(normalizeKey(propertyKey)),
  );

  if (!foundKey) return undefined;
  return properties[foundKey];
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

  const multiSelect = (value as { multi_select?: NotionMultiSelect[] }).multi_select;
  if (Array.isArray(multiSelect) && multiSelect.length > 0) {
    return multiSelect
      .map((item) => item.name ?? "")
      .filter(Boolean)
      .join(", ")
      .trim();
  }

  return "";
};

const normalizeUrl = (value: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
    return trimmedValue;
  }

  if (trimmedValue.includes(".")) {
    return `https://${trimmedValue}`;
  }

  return trimmedValue;
};

const getUrl = (value: unknown) => {
  if (!value || typeof value !== "object") return "";
  const rawUrl = ((value as { url?: string }).url ?? "").trim();
  return normalizeUrl(rawUrl);
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
    .replace(/[\[\]"]/g, "")
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

  const name = getPlainText(getPropertyByAliases(properties, ["name", "nombre", "title", "titulo"]));
  const description = getPlainText(
    getPropertyByAliases(properties, ["description", "descripcion", "descripción"]),
  );
  const technologies = parseTechnologies(
    getPlainText(
      getPropertyByAliases(properties, [
        "technologies",
        "tecnologies",
        "tecnologias",
        "tecnologías",
        "stack",
      ]),
    ),
  );
  const liveLink = getUrl(
    getPropertyByAliases(properties, ["liveLink", "live link", "demo", "url"]),
  );
  const sourceLink = getUrl(
    getPropertyByAliases(properties, ["sourceLink", "source link", "github", "repo", "repositorio"]),
  );
  const imageUrl = getFirstFileUrl(
    getPropertyByAliases(properties, ["image", "imagen", "cover", "thumbnail"]),
  );

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
