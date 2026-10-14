const draftKey = (id: string) => `muse-draft-${id}`;

export function loadDraft(id: string) {
  try {
    return (localStorage.getItem(draftKey(id)) || "").slice(0, 6000);
  } catch {
    return "";
  }
}
export function saveDraft(id: string, value: string) {
  if (value) localStorage.setItem(draftKey(id), value);
  else localStorage.removeItem(draftKey(id));
}
