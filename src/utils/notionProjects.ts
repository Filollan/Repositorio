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

type NotionSelectLike = {
  name?: string;
};

type NotionDate = {
  start?: string;
  end?: string | null;
};

type NotionFormula = {
  type?: "string" | "number" | "boolean" | "date";
  string?: string | null;
  number?: number | null;
  boolean?: boolean | null;
  date?: NotionDate | null;
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .trim();

const getPropertyByAliases = (
  properties: Record<string, unknown>,
  aliases: string[],
) => {
  const normalizedAliases = aliases.map(normalizeKey);

  const foundKey = Object.keys(properties).find((propertyKey) => {
    const normalizedPropertyKey = normalizeKey(propertyKey);

    return normalizedAliases.some(
      (alias) =>
        normalizedPropertyKey === alias ||
        normalizedPropertyKey.includes(alias) ||
        alias.includes(normalizedPropertyKey),
    );
  });

  if (!foundKey) return undefined;
  return properties[foundKey];
};

const stringifyValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const getTextValue = (value: unknown): string => {
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

  const select = (value as { select?: NotionSelectLike | null }).select;
  if (select && typeof select === "object") {
    return stringifyValue(select.name);
  }

  const status = (value as { status?: NotionSelectLike | null }).status;
  if (status && typeof status === "object") {
    return stringifyValue(status.name);
  }

  const url = (value as { url?: string | null }).url;
  if (typeof url === "string") return url.trim();

  const email = (value as { email?: string | null }).email;
  if (typeof email === "string") return email.trim();

  const phone = (value as { phone_number?: string | null }).phone_number;
  if (typeof phone === "string") return phone.trim();

  const number = (value as { number?: number | null }).number;
  if (typeof number === "number") return String(number);

  const checkbox = (value as { checkbox?: boolean | null }).checkbox;
  if (typeof checkbox === "boolean") return checkbox ? "true" : "false";

  const date = (value as { date?: NotionDate | null }).date;
  if (date && typeof date === "object") {
    return stringifyValue(date.start);
  }

  const formula = (value as { formula?: NotionFormula | null }).formula;
  if (formula && typeof formula === "object") {
    if (formula.type === "string") return stringifyValue(formula.string);
    if (formula.type === "number") return stringifyValue(formula.number);
    if (formula.type === "boolean") return stringifyValue(formula.boolean);
    if (formula.type === "date") return stringifyValue(formula.date?.start);
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

const getUrl = (value: unknown) => normalizeUrl(getTextValue(value));

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
    .split(/[,;|•\n]/)
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

  const name = getTextValue(
    getPropertyByAliases(properties, ["name", "nombre", "title", "titulo"]),
  );
  const description = getTextValue(
    getPropertyByAliases(properties, ["description", "descripcion", "descripción"]),
  );
  const technologies = parseTechnologies(
    getTextValue(
      getPropertyByAliases(properties, [
        "technologies",
        "technology",
        "tecnologies",
        "tecnologias",
        "tecnología",
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
