import type { Appearance } from './types';

export const basicAppearanceFields = [
  ['background', 'Background color', 'color', '--qc-background'],
  ['text_color', 'Text color', 'color', '--qc-text'],
  ['secondary_text_color', 'Secondary text color', 'color', '--qc-secondary'],
  ['border_color', 'Border color', 'color', '--qc-border-color'],
  ['border_width', 'Border width', 'number', '--qc-border-width', 0, 8],
  ['border_radius', 'Corner radius', 'number', '--qc-radius', 0, 48],
  ['padding', 'Padding', 'number', '--qc-padding', 0, 48],
  ['title_size', 'Title font size', 'number', '--qc-title-size', 10, 36],
  ['value_size', 'Value font size', 'number', '--qc-value-size', 10, 48],
  ['shadow', 'Shadow', 'shadow', '--qc-shadow'],
] as const;

export const advancedAppearanceFields = [
  ['hover_color', 'Hover background', 'color', '--qc-hover'],
  ['pressed_color', 'Pressed background', 'color', '--qc-pressed'],
  ['focus_color', 'Focus outline', 'color', '--qc-focus'],
  ['heating_color', 'Heating color', 'color', '--qc-heating-override'],
  ['cooling_color', 'Cooling color', 'color', '--qc-cooling-override'],
  ['warning_color', 'Warning color', 'color', '--qc-warning'],
  ['success_color', 'On status color', 'color', '--qc-success'],
  ['inactive_color', 'Off status color', 'color', '--qc-inactive'],
] as const;

export const appearanceFields = [...basicAppearanceFields, ...advancedAppearanceFields] as const;

type AppearanceField = typeof appearanceFields[number];

function validateSetting(field: AppearanceField, setting: unknown) {
  const [key, , kind] = field;
  if (kind === 'number') {
    validateSize(key, setting, field[4], field[5]);
    return;
  }
  const property = kind === 'color' ? 'color' : 'box-shadow';
  if (typeof setting === 'string' && setting.trim() && CSS.supports(property, setting)) return;
  throw new Error(`${key} must be a valid CSS ${kind === 'color' ? 'color' : 'box shadow'}.`);
}

function validateSize(key: string, value: unknown, min: number, max: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max) return;
  throw new Error(`${key} must be between ${min} and ${max} pixels.`);
}

export function validateAppearance(value: unknown): asserts value is Appearance | undefined {
  if (value === undefined) return;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('appearance must be an object.');
  for (const [key, setting] of Object.entries(value)) {
    const field = appearanceFields.find(f => f[0] === key);
    if (!field) throw new Error(`Unknown appearance option: ${key}`);
    validateSetting(field, setting);
  }
}

export function applyAppearance(host: HTMLElement, appearance?: Appearance) {
  for (const [key, , type, variable] of appearanceFields) {
    const value = appearance?.[key];
    if (value === undefined) host.style.removeProperty(variable);
    else host.style.setProperty(variable, type === 'number' ? `${value}px` : String(value));
  }
}
