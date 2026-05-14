export const isBlank = (value) => String(value ?? "").trim() === "";
export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
export const hasNoSpaces = (value) => !/\s/.test(String(value || ""));
export const minLength = (value, length) => String(value || "").length >= length;
export const positiveNumber = (value) => Number(value) > 0;
export const nonNegativeNumber = (value) => Number(value) >= 0;
export const isDateRangeValid = (start, end) => !start || !end || new Date(end) >= new Date(start);

export const validateRequired = (fields, data) => {
  const missing = fields.find(({ key }) => isBlank(data[key]));
  return missing ? `El campo ${missing.label} es obligatorio.` : null;
};
