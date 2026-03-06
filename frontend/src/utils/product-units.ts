export interface ProductUnitOption {
  value: string;
  label: string;
}

const STORAGE_PREFIX = "sellfiz_product_units";

const toStorageKey = (companyId?: string | null) =>
  `${STORAGE_PREFIX}_${companyId || "default"}`;

const normalizeLabel = (raw: string) => raw.trim().replace(/\s+/g, " ");

const normalizeValue = (raw: string) =>
  normalizeLabel(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseStoredUnits = (raw: string | null): ProductUnitOption[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item: unknown) => {
        if (typeof item === "string") {
          const label = normalizeLabel(item);
          const value = normalizeValue(label);
          return value && label ? { value, label } : null;
        }

        if (!item || typeof item !== "object") return null;

        const typed = item as { value?: unknown; label?: unknown; name?: unknown };
        const rawLabel = typed.label ?? typed.name;
        if (typeof rawLabel !== "string") return null;

        const label = normalizeLabel(rawLabel);
        const value =
          typeof typed.value === "string" && typed.value.trim()
            ? normalizeValue(typed.value)
            : normalizeValue(label);

        return value && label ? { value, label } : null;
      })
      .filter((item): item is ProductUnitOption => Boolean(item));
  } catch {
    return [];
  }
};

const dedupeByValue = (units: ProductUnitOption[]): ProductUnitOption[] => {
  const map = new Map<string, ProductUnitOption>();
  for (const unit of units) {
    const key = unit.value.toLowerCase();
    if (!map.has(key)) {
      map.set(key, unit);
    }
  }
  return Array.from(map.values());
};

export const getDefaultProductUnits = (): ProductUnitOption[] => [];

export const getStoredProductUnits = (companyId?: string | null): ProductUnitOption[] => {
  if (typeof window === "undefined") return [];
  const companyUnits = parseStoredUnits(localStorage.getItem(toStorageKey(companyId)));
  const defaultUnits =
    companyId && companyId !== "default"
      ? parseStoredUnits(localStorage.getItem(toStorageKey("default")))
      : [];
  return dedupeByValue([...defaultUnits, ...companyUnits]);
};

export const getProductUnits = (companyId?: string | null): ProductUnitOption[] => {
  return getStoredProductUnits(companyId);
};

export const isDefaultProductUnit = (_value: string): boolean => false;

export const addProductUnit = (
  companyId: string | null | undefined,
  rawLabel: string,
): { ok: boolean; message?: string; unit?: ProductUnitOption } => {
  if (typeof window === "undefined") {
    return { ok: false, message: "Units can only be updated in browser context." };
  }

  const label = normalizeLabel(rawLabel);
  const value = normalizeValue(rawLabel);
  if (!label || !value) {
    return { ok: false, message: "Please enter a valid unit name." };
  }

  const currentUnits = getStoredProductUnits(companyId);
  const duplicate = currentUnits.some(
    (item) =>
      item.value.toLowerCase() === value.toLowerCase() ||
      item.label.toLowerCase() === label.toLowerCase(),
  );

  if (duplicate) {
    return { ok: false, message: "Unit already exists." };
  }

  const stored = getStoredProductUnits(companyId);
  const unit = { value, label };
  const updated = dedupeByValue([...stored, unit]);
  localStorage.setItem(toStorageKey(companyId), JSON.stringify(updated));
  return { ok: true, unit };
};

export const removeProductUnit = (
  companyId: string | null | undefined,
  value: string,
): { ok: boolean; message?: string } => {
  if (typeof window === "undefined") {
    return { ok: false, message: "Units can only be updated in browser context." };
  }

  if (!value) {
    return { ok: false, message: "Invalid unit value." };
  }

  const stored = getStoredProductUnits(companyId);
  const filtered = stored.filter((item) => item.value.toLowerCase() !== value.toLowerCase());
  localStorage.setItem(toStorageKey(companyId), JSON.stringify(filtered));
  return { ok: true };
};

export const updateProductUnit = (
  companyId: string | null | undefined,
  oldValue: string,
  rawLabel: string,
): { ok: boolean; message?: string; unit?: ProductUnitOption } => {
  if (typeof window === "undefined") {
    return { ok: false, message: "Units can only be updated in browser context." };
  }

  if (!oldValue) {
    return { ok: false, message: "Invalid unit value." };
  }

  const label = normalizeLabel(rawLabel);
  const value = normalizeValue(rawLabel);
  if (!label || !value) {
    return { ok: false, message: "Please enter a valid unit name." };
  }

  const stored = getStoredProductUnits(companyId);
  const existing = stored.find((item) => item.value.toLowerCase() === oldValue.toLowerCase());
  if (!existing) {
    return { ok: false, message: "Unit not found." };
  }

  const currentUnits = getStoredProductUnits(companyId);
  const duplicate = currentUnits.some(
    (item) =>
      item.value.toLowerCase() !== oldValue.toLowerCase() &&
      (item.value.toLowerCase() === value.toLowerCase() ||
        item.label.toLowerCase() === label.toLowerCase()),
  );
  if (duplicate) {
    return { ok: false, message: "Unit already exists." };
  }

  const updated = stored.map((item) =>
    item.value.toLowerCase() === oldValue.toLowerCase() ? { value, label } : item,
  );
  const normalized = dedupeByValue(updated);
  localStorage.setItem(toStorageKey(companyId), JSON.stringify(normalized));
  return { ok: true, unit: { value, label } };
};
