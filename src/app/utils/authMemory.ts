/** JWT + rol UI solo en memoria (nunca localStorage). Cookie httpOnly = persistencia. */

type MemoryAdminRole = "admin" | "support";

let memoryAccessToken: string | null = null;
let memoryAdminRole: MemoryAdminRole | null = null;

export function setAdminMemoryToken(token: string | null) {
  memoryAccessToken =
    token && token !== "null" && token !== "undefined" ? token : null;
}

export function getAdminMemoryToken(): string | null {
  return memoryAccessToken;
}

export function clearAdminMemoryToken() {
  memoryAccessToken = null;
}

export function setAdminMemoryRole(role: MemoryAdminRole | null) {
  memoryAdminRole = role;
}

export function getAdminMemoryRole(): MemoryAdminRole | null {
  return memoryAdminRole;
}

export function clearAdminMemoryRole() {
  memoryAdminRole = null;
}

export function clearAdminMemorySession() {
  memoryAccessToken = null;
  memoryAdminRole = null;
}
