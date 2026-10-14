export const PREFERENCES_KEY = "muse-preferences-v1";

export const AVATAR_COLORS = [
  { value: "#397020", label: "苔绿" },
  { value: "#496b95", label: "雾蓝" },
  { value: "#846193", label: "鸢紫" },
  { value: "#ae654e", label: "陶红" },
  { value: "#535353", label: "石墨" },
];

export type Preferences = {
  name: string;
  avatarColor: string;
  showGrid: boolean;
  openSidebar: boolean;
  openAgent: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  name: "zhiwei wang",
  avatarColor: AVATAR_COLORS[0].value,
  showGrid: true,
  openSidebar: true,
  openAgent: true,
};

export function loadPreferences(): Preferences {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "null");
    if (!saved || typeof saved !== "object") return { ...DEFAULT_PREFERENCES };
    return {
      name:
        typeof saved.name === "string" && saved.name.trim()
          ? saved.name.trim().slice(0, 40)
          : DEFAULT_PREFERENCES.name,
      avatarColor: AVATAR_COLORS.some(
        (color) => color.value === saved.avatarColor,
      )
        ? saved.avatarColor
        : DEFAULT_PREFERENCES.avatarColor,
      showGrid: typeof saved.showGrid === "boolean" ? saved.showGrid : true,
      openSidebar:
        typeof saved.openSidebar === "boolean" ? saved.openSidebar : true,
      openAgent: typeof saved.openAgent === "boolean" ? saved.openAgent : true,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function avatarInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return (
    (words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join("")
      : Array.from(words[0]).slice(0, 2).join("")
    ).toLocaleUpperCase() || "M"
  );
}
