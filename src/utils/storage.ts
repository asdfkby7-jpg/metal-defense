import { GameState, CustomImageMap, CustomNameMap } from '../types';

const STORAGE_KEY = 'vampire_dungeon_game_state_v1';
const CUSTOM_IMAGES_KEY = 'vampire_dungeon_custom_images_v1';
const CUSTOM_NAMES_KEY = 'vampire_dungeon_custom_names_v1';

export function saveGameState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state to localStorage', e);
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load game state', e);
  }
  return null;
}

export function saveCustomImage(key: string, dataUrl: string): void {
  try {
    const existing = loadCustomImages();
    existing[key] = dataUrl;
    localStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save custom image', e);
  }
}

export function resetCustomImage(key: string): void {
  try {
    const existing = loadCustomImages();
    delete existing[key];
    localStorage.setItem(CUSTOM_IMAGES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to reset custom image', e);
  }
}

export function loadCustomImages(): CustomImageMap {
  try {
    const raw = localStorage.getItem(CUSTOM_IMAGES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load custom images', e);
  }
  return {};
}

export function saveCustomName(key: string, name: string): void {
  try {
    const existing = loadCustomNames();
    existing[key] = name;
    localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to save custom name', e);
  }
}

export function resetCustomName(key: string): void {
  try {
    const existing = loadCustomNames();
    delete existing[key];
    localStorage.setItem(CUSTOM_NAMES_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Failed to reset custom name', e);
  }
}

export function loadCustomNames(): CustomNameMap {
  try {
    const raw = localStorage.getItem(CUSTOM_NAMES_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to load custom names', e);
  }
  return {};
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CUSTOM_IMAGES_KEY);
  localStorage.removeItem(CUSTOM_NAMES_KEY);
}

export function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}
