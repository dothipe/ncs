import { Athlete } from "../types";
import { deviceStorage } from "../lib/storage";

export interface SavedAvatarMap {
  [key: string]: string;
}

export const saveAvatarsFromAthletes = (athletesToProcess: Athlete[]) => {
  if (!athletesToProcess || !Array.isArray(athletesToProcess)) return;
  try {
    const savedAvatarsStr = localStorage.getItem("slingshot_avatars") || "{}";
    const avatarMap: SavedAvatarMap = JSON.parse(savedAvatarsStr);
    let changed = false;

    athletesToProcess.forEach((athlete) => {
      if (athlete && athlete.id && athlete.avatarUrl && athlete.avatarUrl.startsWith("data:image")) {
        if (avatarMap[athlete.id] !== athlete.avatarUrl) {
          avatarMap[athlete.id] = athlete.avatarUrl;
          changed = true;
        }
      }
    });

    if (changed) {
      localStorage.setItem("slingshot_avatars", JSON.stringify(avatarMap));
      deviceStorage.set("slingshot_avatars", avatarMap);
    }
  } catch (e) {
    console.warn("Storage quota exceeded even for central avatars list:", e);
  }
};

export function stripBase64Avatars<T>(data: T): T {
  if (!data) return data;
  try {
    const clone = JSON.parse(JSON.stringify(data));
    
    const cleanAthlete = (athlete: Athlete) => {
      if (athlete && athlete.avatarUrl && athlete.avatarUrl.startsWith("data:image")) {
        athlete.avatarUrl = `local-avatar:${athlete.id}`;
      }
    };

    if (Array.isArray(clone)) {
      clone.forEach((item: any) => {
        if (item && typeof item === "object") {
          if ("scores" in item && "id" in item) {
            cleanAthlete(item as Athlete);
          } else if ("athletes" in item) {
            if (Array.isArray(item.athletes)) {
              item.athletes.forEach(cleanAthlete);
            }
          }
        }
      });
    } else if (typeof clone === "object") {
      if ("scores" in (clone as any) && "id" in (clone as any)) {
        cleanAthlete(clone as unknown as Athlete);
      }
    }
    return clone;
  } catch (e) {
    return data;
  }
}

export function restoreBase64Avatars<T>(data: T): T {
  if (!data) return data;
  try {
    const savedAvatarsStr = localStorage.getItem("slingshot_avatars");
    if (!savedAvatarsStr) return data;
    const avatarMap: SavedAvatarMap = JSON.parse(savedAvatarsStr);

    const restoreAthlete = (athlete: Athlete) => {
      if (athlete && athlete.avatarUrl && athlete.avatarUrl.startsWith("local-avatar:")) {
        const id = athlete.avatarUrl.substring("local-avatar:".length);
        if (avatarMap[id]) {
          athlete.avatarUrl = avatarMap[id];
        } else {
          athlete.avatarUrl = "";
        }
      }
    };

    if (Array.isArray(data)) {
      data.forEach((item: any) => {
        if (item && typeof item === "object") {
          if ("scores" in item && "id" in item) {
            restoreAthlete(item as Athlete);
          } else if ("athletes" in item) {
            if (Array.isArray(item.athletes)) {
              item.athletes.forEach(restoreAthlete);
            }
          }
        }
      });
    } else if (typeof data === "object") {
      if ("scores" in (data as any) && "id" in (data as any)) {
        restoreAthlete(data as unknown as Athlete);
      }
    }
    return data;
  } catch (e) {
    return data;
  }
}

export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b)) return false;
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    } else {
      if (Array.isArray(b)) return false;
      if (a === null || b === null) return false;

      const keysA = Object.keys(a).filter(k => a[k] !== undefined && a[k] !== null && a[k] !== "");
      const keysB = Object.keys(b).filter(k => b[k] !== undefined && b[k] !== null && b[k] !== "");

      if (keysA.length !== keysB.length) return false;

      for (const k of keysA) {
        if (!deepEqual(a[k], b[k])) return false;
      }
      return true;
    }
  }

  const strA = a === undefined || a === null ? "" : String(a);
  const strB = b === undefined || b === null ? "" : String(b);
  return strA === strB;
}

export const isTournamentEndedPast30Days = (endDateStr?: string, startDateStr?: string): boolean => {
  const targetDateStr = endDateStr || startDateStr;
  if (!targetDateStr) return false;
  
  const parts = targetDateStr.split("-");
  if (parts.length !== 3) return false;
  
  const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 23, 59, 59, 999);
  const now = new Date();
  
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  return (now.getTime() - dateObj.getTime()) > thirtyDaysInMs;
};

export const getLatestAvatar = (
  name: string,
  defaultAvatar: string,
  systemAthletes: Athlete[],
  clubs?: any[]
): string => {
  if (!name) return defaultAvatar;
  const cleanName = name.trim().toLowerCase();
  
  // 1. Check in systemAthletes
  if (systemAthletes && Array.isArray(systemAthletes)) {
    const ath = systemAthletes.find(a => a && a.name && a.name.trim().toLowerCase() === cleanName);
    if (ath && ath.avatarUrl) return ath.avatarUrl;
  }

  // 2. Check in clubs
  if (clubs && Array.isArray(clubs)) {
    const club = clubs.find(c => c && c.name && c.name.trim().toLowerCase() === cleanName);
    if (club && (club.logoUrl || club.avatarUrl)) return club.logoUrl || club.avatarUrl;
  }

  // 3. Fallback to global window helper if present
  if (typeof window !== "undefined" && (window as any).getVscSystemAthleteAvatar) {
    const globalAv = (window as any).getVscSystemAthleteAvatar(name);
    if (globalAv) return globalAv;
  }

  return defaultAvatar;
};

