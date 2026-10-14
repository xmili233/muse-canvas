export function designSectionFromHash(hash: string) {
  const match = /^#design(?:\/([^?#]*))?$/.exec(hash);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1] || "overview");
  } catch {
    return "overview";
  }
}
