import { v4 as uuidv4 } from "uuid";

const PUSH_TOKEN_KEY = "ekam.webPush.token";
const PUSH_DEVICE_ID_KEY = "ekam.webPush.deviceId";
const PUSH_PAUSED_KEY = "ekam.webPush.paused";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredPushToken() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(PUSH_TOKEN_KEY);
}

export function setStoredPushToken(token: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PUSH_TOKEN_KEY, token);
}

export function getOrCreatePushDeviceId() {
  if (!canUseStorage()) return `web-${uuidv4()}`;

  const existing = window.localStorage.getItem(PUSH_DEVICE_ID_KEY);
  if (existing) return existing;

  const next = `web-${uuidv4()}`;
  window.localStorage.setItem(PUSH_DEVICE_ID_KEY, next);
  return next;
}

export function isPushPaused() {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(PUSH_PAUSED_KEY) === "true";
}

export function setPushPaused(paused: boolean) {
  if (!canUseStorage()) return;
  if (paused) window.localStorage.setItem(PUSH_PAUSED_KEY, "true");
  else window.localStorage.removeItem(PUSH_PAUSED_KEY);
}

export function clearStoredPushRegistration() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(PUSH_TOKEN_KEY);
}
