import { 
  auth, 
  db, 
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "../firebase";
import { Athlete, DistanceConfig, MatchHistoryItem, Club, VSC_DEFAULT_LOGO, SystemClub, ChatMessage } from "../types";

export interface TournamentData {
  id: string;
  tournamentId?: string;
  tournamentCode?: string;
  tournamentSeq?: number;
  matchName: string;
  creatorId: string;
  creatorEmail: string;
  createdAt: any;
  updatedAt: any;
  referees: string[]; // Email list of referees
  subAdmins?: string[]; // Email list of sub admins with direct admin permission
  isPublic: boolean;
  competitionMode: "individual" | "team";
  shotsCount: number;
  teamShotsCount: number;
  directMaxPoints?: number;
  teamDirectMaxPoints?: number;
  directMaxShots?: number;
  teamDirectMaxShots?: number;
  distances: DistanceConfig[];
  teamDistances: DistanceConfig[];
  athletes: Athlete[];
  teamAthletes: Athlete[];
  inputAthletes: Athlete[];
  teamInputAthletes: Athlete[];
  masterAthletes?: Athlete[];
  teamMasterAthletes?: Athlete[];
  masterCount?: number;
  startDate?: string;
  endDate?: string;
  tournamentType?: "individual" | "team" | "combined";
  bannerUrl?: string;
  avatarUrl?: string;
  viewCount?: number;
  laneCapacity?: number;
  clubs?: Club[];
  auditLog?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function isPlainObject(val: any): boolean {
  if (val === null || typeof val !== 'object') return false;
  const proto = Object.getPrototypeOf(val);
  return proto === null || proto === Object.prototype;
}

export function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null) return null as any;
  if (Array.isArray(obj)) {
    // Check if any element in this array is also an array (nested array)
    const hasNestedArray = obj.some(item => Array.isArray(item));
    if (hasNestedArray) {
      const mapObj: Record<string, any> = {};
      obj.forEach((item, idx) => {
        mapObj[String(idx)] = sanitizeFirestoreData(item);
      });
      return mapObj as any;
    }
    return obj.map(item => sanitizeFirestoreData(item)) as any;
  }
  if (isPlainObject(obj)) {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      cleaned[key] = sanitizeFirestoreData(val);
    }
    return cleaned;
  }
  return obj;
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isQuotaExceeded = (
    (error as any)?.code === "resource-exhausted" || 
    errMsg.includes("resource-exhausted") || 
    errMsg.includes("Quota exceeded") || 
    errMsg.includes("quota-exceeded") ||
    errMsg.includes("quota limit") ||
    errMsg.includes("quota")
  );

  if (isQuotaExceeded && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("firebase_quota_exceeded", { detail: errMsg }));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (!isQuotaExceeded) {
    throw new Error(JSON.stringify(errInfo));
  }
}

// ---------------- USER PROFILE HELPERS ----------------

export async function createUserProfile(uid: string, email: string, displayName: string, photoURL: string = "") {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef).catch(err => {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    });
    
    if (userSnap && !userSnap.exists()) {
      const isFirstAdmin = email === "nahnatofficial@gmail.com"; // Default global admin based on email
      await setDoc(userRef, {
        uid,
        email,
        displayName: displayName || email.split("@")[0],
        photoURL,
        role: isFirstAdmin ? "admin" : "user",
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
      });
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
}

export async function getUserProfile(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
  }
  return null;
}

// ---------------- TOURNAMENT HELPERS ----------------

/**
 * Calculates the next progressive tournament sequence ID based on all Firestore tournaments,
 * local history, and active state.
 */
export async function getNextTournamentSequenceId(): Promise<string> {
  let maxSeq = 0;

  // 1. Check local sequence from localStorage
  try {
    const localSeq = Number(localStorage.getItem("slingshot_active_tournament_seq")) || 0;
    if (localSeq > maxSeq) maxSeq = localSeq;

    const activeTourId = localStorage.getItem("slingshot_active_tournament_id") || "";
    const match = activeTourId.match(/G-(\d+)/i);
    if (match && Number(match[1])) {
      maxSeq = Math.max(maxSeq, Number(match[1]));
    }
  } catch (e) {
    console.warn("Error reading local tournament sequence:", e);
  }

  // 2. Query tournaments collection from Firestore
  try {
    const snap = await getDocs(collection(db, "tournaments"));
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const tId = data.tournamentId || data.tournamentCode || data.id || docSnap.id || "";
      const m1 = String(tId).match(/G-(\d+)/i);
      if (m1 && Number(m1[1])) {
        maxSeq = Math.max(maxSeq, Number(m1[1]));
      }
      if (typeof data.tournamentSeq === "number") {
        maxSeq = Math.max(maxSeq, data.tournamentSeq);
      }
    });
  } catch (err) {
    console.warn("Could not query tournaments for sequence id:", err);
  }

  const nextSeq = maxSeq + 1;
  return `G-${nextSeq.toString().padStart(4, "0")}`;
}

/**
 * Creates a new tournament in Firestore
 */
export async function createOnlineTournament(
  matchName: string,
  creatorId: string,
  creatorEmail: string,
  config: {
    tournamentId?: string;
    tournamentCode?: string;
    tournamentSeq?: number;
    competitionMode: "individual" | "team";
    tournamentType?: "individual" | "team" | "combined";
    shotsCount: number;
    teamShotsCount: number;
    laneCapacity?: number;
    directMaxPoints?: number;
    teamDirectMaxPoints?: number;
    directMaxShots?: number;
    teamDirectMaxShots?: number;
    distances: DistanceConfig[];
    teamDistances: DistanceConfig[];
    athletes: Athlete[];
    teamAthletes: Athlete[];
    inputAthletes: Athlete[];
    teamInputAthletes: Athlete[];
    masterAthletes?: Athlete[];
    teamMasterAthletes?: Athlete[];
    clubs?: Club[];
    avatarUrl?: string;
    bannerUrl?: string;
    referees?: string[];
    subAdmins?: string[];
    startDate?: string;
    endDate?: string;
  }
): Promise<string> {
  // 1. Fetch user profile and check for existing bans/restrictions
  const userProfile = await getUserProfile(creatorId);

  if (userProfile) {
    if (userProfile.isBanned) {
      throw new Error("BANNED");
    }
    if (userProfile.banUntil && typeof userProfile.banUntil === "number" && userProfile.banUntil > Date.now()) {
      throw new Error("RESTRICTED");
    }
  }

  // 2. Query all tournaments created by this user to verify spamming
  const tournamentsRef = collection(db, "tournaments");
  const q = query(tournamentsRef, where("creatorId", "==", creatorId));
  const querySnapshot = await getDocs(q).catch((err) => {
    console.error("Error checking spam query:", err);
    return null;
  });

  if (querySnapshot) {
    const userTournaments: { id: string; createdTime: number }[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let createdTime = Date.now();
      if (data.createdAt) {
        if (typeof data.createdAt.toMillis === "function") {
          createdTime = data.createdAt.toMillis();
        } else if (data.createdAt.seconds) {
          createdTime = data.createdAt.seconds * 1000;
        } else if (data.createdAt instanceof Date) {
          createdTime = data.createdAt.getTime();
        } else if (typeof data.createdAt === "number") {
          createdTime = data.createdAt;
        }
      }
      userTournaments.push({ id: docSnap.id, createdTime });
    });

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    const recentTournaments = userTournaments.filter((t) => t.createdTime >= tenMinutesAgo);

    // If they have created 4 or more, this new one would make it 5 in 10 minutes!
    if (recentTournaments.length >= 4) {
      const wasRestrictedBefore = userProfile?.wasRestrictedBefore === true;
      const userRef = doc(db, "users", creatorId);

      if (wasRestrictedBefore) {
        // Repeat offender: permanently ban
        await updateDoc(userRef, {
          isBanned: true,
          banReason: "Spamming tournament creation repeat offense"
        }).catch((err) => console.error("Error permanently banning user:", err));

        // Auto-delete all tournaments created by this spammer
        for (const tour of userTournaments) {
          await deleteDoc(doc(db, "tournaments", tour.id)).catch((err) =>
            console.error(`Error deleting tournament ${tour.id} during ban:`, err)
          );
        }

        throw new Error("SPAMMING_BANNED");
      } else {
        // First offense: restrict for 24 hours
        const banDuration = 24 * 60 * 60 * 1000;
        await updateDoc(userRef, {
          banUntil: Date.now() + banDuration,
          wasRestrictedBefore: true,
          banReason: "Spamming tournament creation (5 in 10 minutes)"
        }).catch((err) => console.error("Error restricting user:", err));

        // Auto-delete all tournaments created by this spammer
        for (const tour of userTournaments) {
          await deleteDoc(doc(db, "tournaments", tour.id)).catch((err) =>
            console.error(`Error deleting tournament ${tour.id} during restriction:`, err)
          );
        }

        throw new Error("SPAMMING_RESTRICTED");
      }
    }
  }

  // 3. Create the tournament payload and save
  const newId = `tour-${Date.now()}`;
  const tourRef = doc(db, "tournaments", newId);
  
  const {
    athletes = [],
    teamAthletes = [],
    inputAthletes = [],
    teamInputAthletes = [],
    masterAthletes = [],
    teamMasterAthletes = [],
    clubs = [],
    ...restConfig
  } = config;

  const payload: TournamentData = {
    id: newId,
    matchName: matchName || "Giải đấu mới",
    creatorId,
    creatorEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    referees: restConfig.referees || [], // Admin can add referee emails later
    subAdmins: restConfig.subAdmins || [], // Sub admins with full admin rights
    isPublic: true,
    ...restConfig,
    avatarUrl: restConfig.avatarUrl || VSC_DEFAULT_LOGO,
    bannerUrl: restConfig.bannerUrl || VSC_DEFAULT_LOGO,
    athletes: [],
    teamAthletes: [],
    inputAthletes: [],
    teamInputAthletes: [],
    masterAthletes: [],
    teamMasterAthletes: [],
    clubs: []
  };

  try {
    const sanitizedPayload = sanitizeFirestoreData(payload);
    await setDoc(tourRef, sanitizedPayload);

    // Save heavy sub-arrays in parallel independent root-level collections
    const payloadWrites = [
      setDoc(doc(db, "vsc_tournament_athletes", newId), { list: sanitizeFirestoreData(athletes) }),
      setDoc(doc(db, "vsc_tournament_team_athletes", newId), { list: sanitizeFirestoreData(teamAthletes) }),
      setDoc(doc(db, "vsc_tournament_input_athletes", newId), { list: sanitizeFirestoreData(inputAthletes) }),
      setDoc(doc(db, "vsc_tournament_team_input_athletes", newId), { list: sanitizeFirestoreData(teamInputAthletes) }),
      setDoc(doc(db, "vsc_tournament_master_athletes", newId), { list: sanitizeFirestoreData(masterAthletes) }),
      setDoc(doc(db, "vsc_tournament_team_master_athletes", newId), { list: sanitizeFirestoreData(teamMasterAthletes || []) }),
      setDoc(doc(db, "vsc_tournament_clubs", newId), { list: sanitizeFirestoreData(clubs) }),
    ];
    await Promise.all(payloadWrites);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tournaments/${newId}`);
  }
  return newId;
}

// Global in-memory queue & debounce trackers to prevent Firestore write stream exhaustion
const pendingTournamentUpdates: Record<string, Partial<TournamentData>> = {};
const pendingTournamentTimeouts: Record<string, any> = {};
const pendingTournamentPromises: Record<string, Array<{ resolve: () => void; reject: (err: any) => void }>> = {};

/**
 * Helper that performs the actual physical Firestore write
 */
async function executeActualOnlineTournamentUpdate(id: string, updates: Partial<TournamentData>) {
  const tourRef = doc(db, "tournaments", id);
  try {
    const snap = await getDoc(tourRef);
    if (!snap.exists()) {
      console.warn(`[updateOnlineTournament] Tournament ${id} does not exist. Skipping update.`);
      return;
    }
    const resolvedUpdates = { ...updates };
    if (resolvedUpdates.avatarUrl === "") {
      resolvedUpdates.avatarUrl = VSC_DEFAULT_LOGO;
    }
    if (resolvedUpdates.bannerUrl === "") {
      resolvedUpdates.bannerUrl = VSC_DEFAULT_LOGO;
    }

    // Extract heavy fields to write to independent root-level collections
    const hasAthletes = "athletes" in resolvedUpdates;
    const hasTeamAthletes = "teamAthletes" in resolvedUpdates;
    const hasInputAthletes = "inputAthletes" in resolvedUpdates;
    const hasTeamInputAthletes = "teamInputAthletes" in resolvedUpdates;
    const hasMasterAthletes = "masterAthletes" in resolvedUpdates;
    const hasTeamMasterAthletes = "teamMasterAthletes" in resolvedUpdates;
    const hasClubs = "clubs" in resolvedUpdates;
    const hasAuditLog = "auditLog" in resolvedUpdates;

    const subWrites: Promise<void>[] = [];
    
    if (hasAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.athletes || []) }));
      delete resolvedUpdates.athletes;
    }
    if (hasTeamAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_team_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.teamAthletes || []) }));
      delete resolvedUpdates.teamAthletes;
    }
    if (hasInputAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_input_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.inputAthletes || []) }));
      delete resolvedUpdates.inputAthletes;
    }
    if (hasTeamInputAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_team_input_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.teamInputAthletes || []) }));
      delete resolvedUpdates.teamInputAthletes;
    }
    if (hasMasterAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_master_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.masterAthletes || []) }));
      delete resolvedUpdates.masterAthletes;
    }
    if (hasTeamMasterAthletes) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_team_master_athletes", id), { list: sanitizeFirestoreData(resolvedUpdates.teamMasterAthletes || []) }));
      delete resolvedUpdates.teamMasterAthletes;
    }
    if (hasClubs) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_clubs", id), { list: sanitizeFirestoreData(resolvedUpdates.clubs || []) }));
      delete resolvedUpdates.clubs;
    }
    if (hasAuditLog) {
      subWrites.push(setDoc(doc(db, "vsc_tournament_audit_logs", id), { auditLog: resolvedUpdates.auditLog || "" }));
      delete resolvedUpdates.auditLog;
    }

    const sanitizedUpdates = sanitizeFirestoreData(resolvedUpdates);
    
    // Only update main tournament doc if there are other keys left
    if (Object.keys(sanitizedUpdates).length > 0) {
      await updateDoc(tourRef, {
        ...sanitizedUpdates,
        updatedAt: serverTimestamp()
      });
    }
    
    if (subWrites.length > 0) {
      await Promise.all(subWrites);
    }
  } catch (error: any) {
    if (error?.code === "not-found" || error?.message?.includes("No document to update")) {
      console.warn(`[updateOnlineTournament] Tournament ${id} not found for update.`);
      return;
    }
    handleFirestoreError(error, OperationType.UPDATE, `tournaments/${id}`);
    throw error;
  }
}

/**
 * Updates a tournament in Firestore (e.g. updating scores, configs, referees)
 * Fully debounced to aggregate rapid user events (e.g. fast score hits) and avoid write stream exhaustion!
 */
export function updateOnlineTournament(id: string, updates: Partial<TournamentData>): Promise<void> {
  if (!id) return Promise.resolve();

  // Merge the new updates into the queued updates for this tournament
  pendingTournamentUpdates[id] = {
    ...(pendingTournamentUpdates[id] || {}),
    ...updates
  };

  if (!pendingTournamentPromises[id]) {
    pendingTournamentPromises[id] = [];
  }

  const promise = new Promise<void>((resolve, reject) => {
    pendingTournamentPromises[id].push({ resolve, reject });
  });

  if (pendingTournamentTimeouts[id]) {
    clearTimeout(pendingTournamentTimeouts[id]);
  }

  pendingTournamentTimeouts[id] = setTimeout(async () => {
    const finalUpdates = pendingTournamentUpdates[id];
    const promisesToResolve = pendingTournamentPromises[id];

    delete pendingTournamentUpdates[id];
    delete pendingTournamentTimeouts[id];
    delete pendingTournamentPromises[id];

    try {
      await executeActualOnlineTournamentUpdate(id, finalUpdates);
      promisesToResolve.forEach((p) => p.resolve());
    } catch (err) {
      promisesToResolve.forEach((p) => p.reject(err));
    }
  }, 1000); // 1000ms debounce window completely throttles rapid scoring events

  return promise;
}

/**
 * Deletes an online tournament from Firestore
 */
export async function deleteOnlineTournament(id: string) {
  try {
    const tourRef = doc(db, "tournaments", id);
    await deleteDoc(tourRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tournaments/${id}`);
  }
}

/**
 * Subscribes to real-time list of tournaments sorted by latest createdAt.
 * Automatically and reactively merges decoupled athlete, master athlete, and team collections!
 */
export function subscribeToTournamentsList(callback: (tournaments: TournamentData[]) => void) {
  const collectionRef = collection(db, "tournaments");
  const q = query(collectionRef, orderBy("createdAt", "desc"));
  
  let rawTournaments: TournamentData[] = [];
  const decoupledData: {
    athletes: Record<string, any[]>;
    teamAthletes: Record<string, any[]>;
    inputAthletes: Record<string, any[]>;
    teamInputAthletes: Record<string, any[]>;
    masterAthletes: Record<string, any[]>;
    teamMasterAthletes: Record<string, any[]>;
    clubs: Record<string, any[]>;
  } = {
    athletes: {},
    teamAthletes: {},
    inputAthletes: {},
    teamInputAthletes: {},
    masterAthletes: {},
    teamMasterAthletes: {},
    clubs: {},
  };

  const emit = () => {
    const list: TournamentData[] = rawTournaments.map(t => {
      const id = t.id;
      return {
        ...t,
        athletes: (t.athletes && t.athletes.length > 0) ? t.athletes : (decoupledData.athletes[id] || []),
        teamAthletes: (t.teamAthletes && t.teamAthletes.length > 0) ? t.teamAthletes : (decoupledData.teamAthletes[id] || []),
        inputAthletes: (t.inputAthletes && t.inputAthletes.length > 0) ? t.inputAthletes : (decoupledData.inputAthletes[id] || []),
        teamInputAthletes: (t.teamInputAthletes && t.teamInputAthletes.length > 0) ? t.teamInputAthletes : (decoupledData.teamInputAthletes[id] || []),
        masterAthletes: (t.masterAthletes && t.masterAthletes.length > 0) ? t.masterAthletes : (decoupledData.masterAthletes[id] || []),
        teamMasterAthletes: (t.teamMasterAthletes && t.teamMasterAthletes.length > 0) ? t.teamMasterAthletes : (decoupledData.teamMasterAthletes[id] || []),
        clubs: (t.clubs && t.clubs.length > 0) ? t.clubs : (decoupledData.clubs[id] || []),
      };
    });
    callback(list);
  };

  const unsubs: (() => void)[] = [];

  // 1. Listen to main tournaments
  unsubs.push(
    onSnapshot(q, (snapshot) => {
      const list: TournamentData[] = [];
      const seen = new Set<string>();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as TournamentData;
        const id = data.id || docSnap.id;
        if (id && !seen.has(id)) {
          seen.add(id);
          list.push({
            ...data,
            id,
            athletes: data.athletes || [],
            teamAthletes: data.teamAthletes || [],
            inputAthletes: data.inputAthletes || [],
            teamInputAthletes: data.teamInputAthletes || [],
            masterAthletes: data.masterAthletes || [],
            teamMasterAthletes: data.teamMasterAthletes || [],
            clubs: data.clubs || []
          });
        }
      });
      rawTournaments = list;
      emit();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "tournaments");
    })
  );

  // 2. Listen to decoupled payloads collections
  const payloadCollections: { key: keyof typeof decoupledData; coll: string }[] = [
    { key: "masterAthletes", coll: "vsc_tournament_master_athletes" },
    { key: "athletes", coll: "vsc_tournament_athletes" },
    { key: "teamAthletes", coll: "vsc_tournament_team_athletes" },
    { key: "teamMasterAthletes", coll: "vsc_tournament_team_master_athletes" },
    { key: "inputAthletes", coll: "vsc_tournament_input_athletes" },
    { key: "teamInputAthletes", coll: "vsc_tournament_team_input_athletes" },
    { key: "clubs", coll: "vsc_tournament_clubs" },
  ];

  payloadCollections.forEach(({ key, coll }) => {
    try {
      unsubs.push(
        onSnapshot(collection(db, coll), (snap) => {
          const map: Record<string, any[]> = {};
          snap.forEach(docSnap => {
            map[docSnap.id] = docSnap.data()?.list || [];
          });
          decoupledData[key] = map;
          emit();
        }, (err) => {
          console.warn(`Could not subscribe to collection ${coll}:`, err);
        })
      );
    } catch (e) {
      console.warn(`Failed to attach snapshot listener for ${coll}:`, e);
    }
  });

  return () => {
    unsubs.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        // ignore
      }
    });
  };
}

/**
 * Subscribes to a single tournament documents in real-time.
 * Robust reactive merge across subcollections that supports both new decoupled format and old unified format.
 */
export function subscribeToTournamentDoc(id: string, callback: (tournament: TournamentData | null, hasPendingWrites: boolean) => void) {
  const mainRef = doc(db, "tournaments", id);
  
  let unsubMain: (() => void) | null = null;
  const subUnsubs: Record<string, () => void> = {};
  
  let mainData: TournamentData | null = null;
  let mainPending = false;
  
  const payloadData: Record<string, any> = {
    athletes: [],
    teamAthletes: [],
    inputAthletes: [],
    teamInputAthletes: [],
    masterAthletes: [],
    teamMasterAthletes: [],
    clubs: [],
    auditLog: "",
  };
  
  const fireMergedCallback = () => {
    if (!mainData) return;
    
    // Merge only if mainData doesn't already contain inline lists (backwards compatibility check)
    const merged = { ...mainData };
    
    if (!merged.athletes || merged.athletes.length === 0) {
      merged.athletes = payloadData.athletes || [];
    }
    if (!merged.teamAthletes || merged.teamAthletes.length === 0) {
      merged.teamAthletes = payloadData.teamAthletes || [];
    }
    if (!merged.inputAthletes || merged.inputAthletes.length === 0) {
      merged.inputAthletes = payloadData.inputAthletes || [];
    }
    if (!merged.teamInputAthletes || merged.teamInputAthletes.length === 0) {
      merged.teamInputAthletes = payloadData.teamInputAthletes || [];
    }
    if (!merged.masterAthletes || merged.masterAthletes.length === 0) {
      merged.masterAthletes = payloadData.masterAthletes || [];
    }
    if (!merged.teamMasterAthletes || merged.teamMasterAthletes.length === 0) {
      merged.teamMasterAthletes = payloadData.teamMasterAthletes || [];
    }
    if (!merged.clubs || merged.clubs.length === 0) {
      merged.clubs = payloadData.clubs || [];
    }
    if (!merged.auditLog) {
      merged.auditLog = payloadData.auditLog || "";
    }
    
    callback(merged, mainPending);
  };

  const setupPayloadListeners = () => {
    const payloadConfigs = [
      { key: "athletes", rootColl: "vsc_tournament_athletes", legacyField: "athletes" },
      { key: "teamAthletes", rootColl: "vsc_tournament_team_athletes", legacyField: "teamAthletes" },
      { key: "inputAthletes", rootColl: "vsc_tournament_input_athletes", legacyField: "inputAthletes" },
      { key: "teamInputAthletes", rootColl: "vsc_tournament_team_input_athletes", legacyField: "teamInputAthletes" },
      { key: "masterAthletes", rootColl: "vsc_tournament_master_athletes", legacyField: "masterAthletes" },
      { key: "teamMasterAthletes", rootColl: "vsc_tournament_team_master_athletes", legacyField: "teamMasterAthletes" },
      { key: "clubs", rootColl: "vsc_tournament_clubs", legacyField: "clubs" },
      { key: "auditLog", rootColl: "vsc_tournament_audit_logs", legacyField: "auditLog" },
    ];

    payloadConfigs.forEach(({ key, rootColl, legacyField }) => {
      if (subUnsubs[key]) return; // already listening
      
      const rootDocRef = doc(db, rootColl, id);
      subUnsubs[key] = onSnapshot(rootDocRef, (snap) => {
        if (snap.exists()) {
          if (key === "auditLog") {
            payloadData[key] = snap.data()?.auditLog || "";
          } else {
            payloadData[key] = snap.data()?.list || [];
          }
          fireMergedCallback();
        } else {
          // Fallback to legacy payloads subcollection inside tournaments/{id}/payloads/
          const subDocRef = doc(db, "tournaments", id, "payloads", legacyField);
          getDoc(subDocRef).then((legacySnap) => {
            if (legacySnap.exists()) {
              if (key === "auditLog") {
                payloadData[key] = legacySnap.data()?.auditLog || "";
              } else {
                payloadData[key] = legacySnap.data()?.list || [];
              }
            } else {
              payloadData[key] = key === "auditLog" ? "" : [];
            }
            fireMergedCallback();
          }).catch(() => {
            payloadData[key] = key === "auditLog" ? "" : [];
            fireMergedCallback();
          });
        }
      }, (err) => {
        // Fallback quietly on permission/access issue
        payloadData[key] = key === "auditLog" ? "" : [];
        fireMergedCallback();
      });
    });
  };

  unsubMain = onSnapshot(mainRef, (docSnap) => {
    mainPending = docSnap.metadata.hasPendingWrites;
    if (docSnap.exists()) {
      mainData = docSnap.data() as TournamentData;
      
      // If the tournament document is using the old unified style, we don't need independent collections
      const isUnified = (mainData.athletes && mainData.athletes.length > 0) || 
                        (mainData.teamAthletes && mainData.teamAthletes.length > 0);
                        
      if (!isUnified) {
        setupPayloadListeners();
      }
      
      fireMergedCallback();
    } else {
      callback(null, mainPending);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `tournaments/${id}`);
  });

  return () => {
    if (unsubMain) unsubMain();
    Object.values(subUnsubs).forEach((unsub) => unsub());
  };
}

/**
 * Updates an existing user profile in Firestore
 */
export async function updateUserProfile(uid: string, profileData: {
  displayName?: string;
  avatarUrl?: string;
  cccd?: string;
  birthDate?: string;
  address?: string;
  province?: string;
  club?: string;
  lastDisplayNameUpdate?: string;
  gearSlingName?: string;
  gearForkWidth?: string;
  gearBandSpec?: string;
  gearAmmoSize?: string;
  gearStance?: string;
}) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Fetches a user profile by their email
 */
export async function getUserProfileByEmail(email: string) {
  try {
    if (!email) return null;
    const trimmedEmail = email.trim();
    const cleanEmail = trimmedEmail.toLowerCase();
    
    // 1. Try exact match
    const q1 = query(collection(db, "users"), where("email", "==", trimmedEmail));
    const snapshot1 = await getDocs(q1);
    if (!snapshot1.empty) {
      return snapshot1.docs[0].data();
    }
    
    // 2. Try exact lowercase match
    const q2 = query(collection(db, "users"), where("email", "==", cleanEmail));
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      return snapshot2.docs[0].data();
    }

    // 3. Fallback: Search all users in-memory with case-insensitive check
    const snapshotAll = await getDocs(collection(db, "users"));
    const foundDoc = snapshotAll.docs.find(d => {
      const data = d.data();
      return data.email && data.email.toLowerCase().trim() === cleanEmail;
    });
    if (foundDoc) {
      return foundDoc.data();
    }
  } catch (error) {
    console.error("Error fetching user profile by email:", error);
  }
  return null;
}

/**
 * Searches the database to find the linked Google avatar of an athlete strictly by their email.
 * This is 100% focused on the email and does not match by name, ID or any other data.
 */
export async function findLinkedEmailAndAvatarForAthlete(
  athleteId: string,
  athleteName: string,
  athleteEmail?: string
): Promise<{ email: string; avatarUrl: string } | null> {
  const cleanEmail = athleteEmail ? athleteEmail.trim().toLowerCase() : "";
  if (!cleanEmail) return null;

  // 1. Try finding in the "users" collection first
  const profile = await getUserProfileByEmail(cleanEmail);
  if (profile && (profile.avatarUrl || profile.photoURL)) {
    return {
      email: cleanEmail,
      avatarUrl: profile.avatarUrl || profile.photoURL
    };
  }

  // 2. Fallback: Search in "vsc_system_athletes" collection for any athlete matching this email
  try {
    const athletesSnap = await getDocs(collection(db, "vsc_system_athletes"));
    const foundAthleteDoc = athletesSnap.docs.find(d => {
      const data = d.data();
      return data.email && data.email.trim().toLowerCase() === cleanEmail && data.avatarUrl && !data.avatarUrl.includes("avatar-preset") && !data.avatarUrl.includes("vsc_default_logo");
    });
    if (foundAthleteDoc) {
      return {
        email: cleanEmail,
        avatarUrl: foundAthleteDoc.data().avatarUrl
      };
    }
  } catch (err) {
    console.error("Error searching matching athlete avatar:", err);
  }

  // 3. Fallback: Generate a high quality Dicebear Avatar using seed email as the ultimate email-locked fallback!
  return {
    email: cleanEmail,
    avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(cleanEmail)}`
  };
}

/**
 * Saves VSC System Athletes to Cloud Firestore
 * Decoupled into individual documents where the document ID is the athlete ID!
 * Automatically handles additions, updates, and deletions.
 */
export async function saveVscSystemAthletes(athletes: Athlete[]) {
  try {
    // 1. Write/update each athlete in the array as an individual document
    const writes = athletes.map((athlete) => {
      if (!athlete || !athlete.id) return Promise.resolve();
      const docRef = doc(db, "vsc_system_athletes", athlete.id);
      return setDoc(docRef, sanitizeFirestoreData(athlete));
    });
    await Promise.all(writes);

    // 2. Perform deletion of any athlete document that is no longer in the list
    const incomingIds = new Set(athletes.map(a => a.id.trim().toLowerCase()));
    const colRef = collection(db, "vsc_system_athletes");
    const snapshot = await getDocs(colRef);
    const deletePromises: Promise<void>[] = [];
    
    snapshot.forEach((docSnap) => {
      const docId = docSnap.id;
      if (docId === "global") return; // Keep or skip global
      if (!incomingIds.has(docId.trim().toLowerCase())) {
        deletePromises.push(deleteDoc(doc(db, "vsc_system_athletes", docId)));
      }
    });
    
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "vsc_system_athletes");
  }
}

/**
 * Fetches VSC System Athletes from Cloud Firestore
 * Reads from individual documents inside "vsc_system_athletes" with migration fallback.
 */
export async function getVscSystemAthletes(): Promise<Athlete[]> {
  try {
    const colRef = collection(db, "vsc_system_athletes");
    const querySnapshot = await getDocs(colRef);
    const list: Athlete[] = [];
    querySnapshot.forEach((docSnap) => {
      if (docSnap.id === "global") return;
      list.push(docSnap.data() as Athlete);
    });
    
    // If the collection is empty except maybe the legacy global doc, migrate it
    if (list.length === 0) {
      const globalSnap = await getDoc(doc(db, "vsc_system_athletes", "global"));
      if (globalSnap.exists()) {
        const data = globalSnap.data();
        const legacyAthletes = (data?.athletes || []) as Athlete[];
        if (legacyAthletes.length > 0) {
          await saveVscSystemAthletes(legacyAthletes);
          // Clear global doc after migration
          await setDoc(doc(db, "vsc_system_athletes", "global"), { athletes: [], migrated: true });
          return legacyAthletes;
        }
      }
    }
    return list;
  } catch (error) {
    console.error("Error reading VSC system athletes from Firestore:", error);
  }
  return [];
}

/**
 * Subscribes in real-time to VSC System Athletes stored in Cloud Firestore
 */
export function subscribeToVscSystemAthletes(callback: (athletes: Athlete[]) => void) {
  const colRef = collection(db, "vsc_system_athletes");
  return onSnapshot(colRef, (snapshot) => {
    const list: Athlete[] = [];
    snapshot.forEach((docSnap) => {
      if (docSnap.id === "global") return;
      list.push(docSnap.data() as Athlete);
    });
    
    // Trigger auto-migration on empty list
    if (list.length === 0) {
      getVscSystemAthletes().then((migratedList) => {
        if (migratedList && migratedList.length > 0) {
          callback(migratedList);
        } else {
          callback([]);
        }
      });
    } else {
      callback(list);
    }
  }, (error) => {
    console.warn("VSC system athletes subscription failed, falling back gracefully:", error);
  });
}

/**
 * Subscribes in real-time to all VSC System Clubs
 */
export function subscribeToVscSystemClubs(callback: (clubs: Club[]) => void) {
  const collectionRef = collection(db, "vsc_system_clubs");
  const q = query(collectionRef, orderBy("name", "asc"));
  return onSnapshot(q, (snapshot) => {
    const list: Club[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as Club);
    });
    callback(list);
  }, (error) => {
    console.warn("VSC system clubs subscription failed with order, falling back to unordered:", error);
    return onSnapshot(collectionRef, (snapshot) => {
      const list: Club[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Club);
      });
      callback(list);
    }, (err2) => {
      console.error("VSC system clubs subscription failed completely:", err2);
    });
  });
}

/**
 * Saves or updates a club in the system-wide collection
 */
export async function saveVscSystemClub(club: Club) {
  try {
    const docRef = doc(db, "vsc_system_clubs", club.id);
    const updatedClub = {
      ...club,
      avatarUrl: club.avatarUrl || VSC_DEFAULT_LOGO
    };
    await setDoc(docRef, sanitizeFirestoreData(updatedClub));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `vsc_system_clubs/${club.id}`);
  }
}

/**
 * Synchronizes an athlete's team name in the global system athletes list
 */
export async function syncAthleteClubInGlobalList(email: string, clubName: string): Promise<void> {
  if (!email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const athletes = await getVscSystemAthletes();
    const existingIndex = athletes.findIndex(
      (a) => a.email && a.email.trim().toLowerCase() === cleanEmail
    );
    if (existingIndex !== -1) {
      athletes[existingIndex].team = clubName || "Tự do";
      await saveVscSystemAthletes(athletes);
    }
  } catch (err) {
    console.error("Failed to sync athlete club in global list:", err);
  }
}

/**
 * Deletes a club from the system-wide collection
 */
export async function deleteVscSystemClub(clubId: string) {
  try {
    const docRef = doc(db, "vsc_system_clubs", clubId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const clubData = snap.data() as SystemClub;
      const members = clubData.members || [];
      
      // Update each member
      for (const member of members) {
        if (member.userId && !member.userId.startsWith("unlinked-")) {
          try {
            const userRef = doc(db, "users", member.userId);
            await updateDoc(userRef, { club: "" });
          } catch (e) {
            console.warn(`Failed to clear club from user ${member.userId}:`, e);
          }
        }
        if (member.email) {
          await syncAthleteClubInGlobalList(member.email, "Tự do");
        }
      }
    }
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `vsc_system_clubs/${clubId}`);
  }
}

/**
 * Subscribes to all users in real-time for QLTV admin management
 */
export function subscribeToAllUsers(callback: (users: any[]) => void) {
  const usersRef = collection(db, "users");
  return onSnapshot(usersRef, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        ...data,
        uid: docSnap.id
      });
    });
    callback(list);
  }, (error) => {
    console.error("Error subscribing to users list:", error);
  });
}

/**
 * Translates anti-spam or ban errors into localized user-friendly messages
 */
export function getFriendlyErrorMessage(err: any, language: "vi" | "en" = "vi"): string {
  const errMsg = err?.message || String(err);
  if (
    errMsg.includes("resource-exhausted") || 
    errMsg.includes("Quota exceeded") || 
    errMsg.includes("quota-exceeded") || 
    errMsg.includes("quota limit") || 
    errMsg.includes("quota")
  ) {
    return language === "en"
      ? "Firebase Quota Exceeded: The free-tier daily write/read limit for this cloud database has been reached.\n- The daily free quota resets tomorrow (afternoon VN time).\n- NO DATA IS LOST! Your scores, athletes, and settings are automatically saved locally on this device and can be sync'd later.\n- Manage your project limits here: https://console.firebase.google.com/project/gen-lang-client-0768276535/firestore/databases/ai-studio-2edda41e-6b05-428e-b489-4034b2252242/data?openUpgradeDialog=true"
      : "Vượt Quá Giới Hạn Quota Firebase: Cơ sở dữ liệu đám mây đã đạt giới hạn ghi/đọc miễn phí hàng ngày.\n- Hạn ngạch miễn phí hàng ngày sẽ tự động đặt lại vào ngày mai (khoảng chiều hàng ngày theo giờ VN).\n- KHÔNG MẤT DỮ LIỆU! Toàn bộ điểm số, danh sách VĐV, và cài đặt được tự động lưu offline an toàn trên thiết bị này và sẽ đồng bộ lại sau.\n- Bạn có thể quản lý hạn ngạch cơ sở dữ liệu tại đây: https://console.firebase.google.com/project/gen-lang-client-0768276535/firestore/databases/ai-studio-2edda41e-6b05-428e-b489-4034b2252242/data?openUpgradeDialog=true";
  }
  if (errMsg.includes("BANNED")) {
    return language === "en"
      ? "Your account has been permanently banned from creating tournaments due to spamming."
      : "Tài khoản của bạn đã bị khóa vĩnh viễn khỏi quyền tạo giải đấu do vi phạm chính sách spam.";
  }
  if (errMsg.includes("RESTRICTED")) {
    return language === "en"
      ? "Your account is temporarily restricted from creating tournaments for 24 hours."
      : "Tài khoản của bạn đang bị hạn chế tạm thời khỏi quyền tạo giải đấu trong vòng 24 giờ.";
  }
  if (errMsg.includes("SPAMMING_BANNED")) {
    return language === "en"
      ? "Critical: You have continued to spam tournament creation! Your account is now permanently banned, and all your created tournaments have been cleared."
      : "Nghiêm trọng: Bạn tiếp tục tạo giải đấu quá nhanh! Tài khoản của bạn hiện đã bị KHÓA VĨNH VIỄN và tất cả giải đấu cũ của bạn đã được dọn dẹp vĩnh viễn.";
  }
  if (errMsg.includes("SPAMMING_RESTRICTED")) {
    return language === "en"
      ? "Alert: You are creating tournaments too quickly! (5 tournaments in 10 minutes). Your account has been restricted for 24 hours, and all your created tournaments have been cleared."
      : "Cảnh báo: Bạn đang tạo giải quá nhanh! (5 giải trong 10 phút). Tài khoản của bạn đã bị hạn chế tạo giải trong 24 giờ, tất cả giải đấu cũ của bạn đã được dọn dẹp khỏi hệ thống.";
  }
  return errMsg;
}

/**
 * Updates a user profile as an administrator (including custom roles & clubs)
 */
export async function updateUserProfileAdmin(uid: string, profileData: {
  displayName?: string;
  photoURL?: string;
  club?: string;
  role?: string;
  isBanned?: boolean;
  banUntil?: number | null;
  wasRestrictedBefore?: boolean;
  banReason?: string;
}) {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, sanitizeFirestoreData(profileData));
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Deletes a user profile as an administrator
 */
export async function deleteUserProfileAdmin(uid: string) {
  try {
    const userRef = doc(db, "users", uid);
    await deleteDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

// ---------------- SYSTEM CLUB OPERATIONS ----------------

/**
 * Creates a new official SystemClub in Firestore
 */
export async function createSystemClub(
  name: string,
  logoUrl: string,
  province: string,
  leaderId: string,
  leaderName: string,
  leaderEmail: string,
  description: string = "",
  bannerUrl: string = ""
): Promise<string> {
  const clubId = `club-${Date.now()}`;
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const newClub: SystemClub = {
    id: clubId,
    name,
    logoUrl: logoUrl || VSC_DEFAULT_LOGO,
    bannerUrl: bannerUrl || "",
    province,
    leaderId: leaderId || "",
    leaderName: leaderName || "Chưa có",
    leaderEmail: leaderEmail || "",
    description,
    createdAt: serverTimestamp(),
    members: leaderId ? [
      {
        userId: leaderId,
        athleteId: "",
        name: leaderName || "Trưởng CLB",
        email: leaderEmail,
        role: "leader",
        joinedAt: new Date().toISOString()
      }
    ] : [],
    pendingRequests: []
  };

  if (leaderId && leaderEmail && newClub.members.length > 0) {
    try {
      const athletes = await getVscSystemAthletes();
      const matched = athletes.find(a => a.email?.trim().toLowerCase() === leaderEmail.trim().toLowerCase());
      if (matched) {
        newClub.members[0].athleteId = matched.id;
      }
    } catch (e) {
      console.warn("Failed to find leader athlete profile:", e);
    }
  }

  try {
    const sanitized = sanitizeFirestoreData(newClub);
    await setDoc(clubRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `vsc_system_clubs/${clubId}`);
  }

  if (leaderId) {
    try {
      const userRef = doc(db, "users", leaderId);
      const userSnap = await getDoc(userRef);
      let shouldUpdateUserClub = true;
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData?.role === "admin" && userData?.club) {
          shouldUpdateUserClub = false;
        }
      }
      if (shouldUpdateUserClub) {
        await updateDoc(userRef, { club: name });
      }
    } catch (e) {
      console.warn("Failed to update user's club in profile:", e);
    }
  }

  return clubId;
}

/**
 * Submits a join request to a SystemClub
 */
export async function requestToJoinClub(
  clubId: string,
  userId: string,
  athleteId: string,
  name: string,
  email: string
): Promise<void> {
  const clubsSnap = await getDocs(collection(db, "vsc_system_clubs")).catch(err => {
    handleFirestoreError(err, OperationType.LIST, "vsc_system_clubs");
    throw err;
  });

  for (const d of clubsSnap.docs) {
    const club = d.data() as SystemClub;
    if (club.members?.some(m => m.userId === userId)) {
      throw new Error("ALREADY_IN_CLUB");
    }
    if (club.pendingRequests?.some(r => r.userId === userId)) {
      throw new Error("ALREADY_REQUESTED");
    }
  }

  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  const pending = clubData.pendingRequests || [];

  if (pending.some(r => r.userId === userId)) {
    return;
  }

  pending.push({
    userId,
    athleteId: athleteId || "",
    name,
    email,
    requestedAt: new Date().toISOString()
  });

  await updateDoc(clubRef, {
    pendingRequests: sanitizeFirestoreData(pending)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });
}

/**
 * Cancels a pending join request to a SystemClub
 */
export async function cancelJoinRequest(clubId: string, userId: string): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) return;
  const clubData = clubSnap.data() as SystemClub;
  const pending = (clubData.pendingRequests || []).filter(r => r.userId !== userId);
  await updateDoc(clubRef, {
    pendingRequests: sanitizeFirestoreData(pending)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });
}

/**
 * Handles a join request: approves or rejects
 */
export async function handleClubJoinRequest(
  clubId: string,
  requestUserId: string,
  action: "approve" | "reject"
): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  const pending = clubData.pendingRequests || [];
  const members = clubData.members || [];

  const requestIndex = pending.findIndex(r => r.userId === requestUserId);
  if (requestIndex === -1) {
    throw new Error("REQUEST_NOT_FOUND");
  }

  const request = pending[requestIndex];
  pending.splice(requestIndex, 1);

  if (action === "approve") {
    members.push({
      userId: request.userId,
      athleteId: request.athleteId,
      name: request.name,
      email: request.email,
      role: "member",
      joinedAt: new Date().toISOString()
    });

    try {
      const userRef = doc(db, "users", request.userId);
      await updateDoc(userRef, { club: clubData.name });
    } catch (e) {
      console.warn("Failed to update user profile club name:", e);
    }

    if (request.email) {
      await syncAthleteClubInGlobalList(request.email, clubData.name);
    }
  }

  await updateDoc(clubRef, {
    pendingRequests: sanitizeFirestoreData(pending),
    members: sanitizeFirestoreData(members)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });
}

/**
 * Voluntarily leaves a SystemClub
 */
export async function leaveClub(clubId: string, userId: string): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  let members = clubData.members || [];

  const userMember = members.find(m => m.userId === userId);
  if (userMember && userMember.role === "leader" && members.length > 1) {
    throw new Error("LEADER_MUST_TRANSFER");
  }

  members = members.filter(m => m.userId !== userId);

  if (members.length === 0) {
    await deleteDoc(clubRef).catch(err => {
      handleFirestoreError(err, OperationType.DELETE, `vsc_system_clubs/${clubId}`);
    });
  } else {
    await updateDoc(clubRef, {
      members: sanitizeFirestoreData(members)
    }).catch(err => {
      handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
    });
  }

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    let userEmail = "";
    if (userSnap.exists()) {
      userEmail = userSnap.data()?.email || "";
    }
    await updateDoc(userRef, { club: "" });
    if (userEmail) {
      await syncAthleteClubInGlobalList(userEmail, "Tự do");
    }
  } catch (e) {
    console.warn("Failed to clear club from user profile:", e);
  }
}

/**
 * Removes a member from a SystemClub (Kick)
 */
export async function kickClubMember(clubId: string, userId: string): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  let members = clubData.members || [];
  members = members.filter(m => m.userId !== userId);

  await updateDoc(clubRef, {
    members: sanitizeFirestoreData(members)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });

  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    let userEmail = "";
    if (userSnap.exists()) {
      userEmail = userSnap.data()?.email || "";
    }
    await updateDoc(userRef, { club: "" });
    if (userEmail) {
      await syncAthleteClubInGlobalList(userEmail, "Tự do");
    }
  } catch (e) {
    console.warn("Failed to clear club from user profile:", e);
  }
}

/**
 * Adds an athlete directly by system Athlete ID
 */
export async function addClubMemberDirectly(
  clubId: string,
  athleteId: string,
  systemAthletes: Athlete[]
): Promise<void> {
  const athlete = systemAthletes.find(a => a.id.trim().toLowerCase() === athleteId.trim().toLowerCase());
  if (!athlete) {
    throw new Error("ATHLETE_NOT_FOUND");
  }

  const clubsSnap = await getDocs(collection(db, "vsc_system_clubs")).catch(err => {
    handleFirestoreError(err, OperationType.LIST, "vsc_system_clubs");
    throw err;
  });

  for (const d of clubsSnap.docs) {
    const club = d.data() as SystemClub;
    if (club.members?.some(m => m.athleteId === athlete.id || (athlete.email && m.email === athlete.email))) {
      throw new Error("ATHLETE_ALREADY_IN_CLUB");
    }
  }

  let targetUserId = "";
  if (athlete.email) {
    const q = query(collection(db, "users"), where("email", "==", athlete.email.trim().toLowerCase()));
    const userSnap = await getDocs(q);
    if (!userSnap.empty) {
      targetUserId = userSnap.docs[0].id;
    }
  }

  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  const members = clubData.members || [];

  if (members.some(m => m.athleteId === athlete.id)) {
    return;
  }

  members.push({
    userId: targetUserId || `unlinked-${Date.now()}`,
    athleteId: athlete.id,
    name: athlete.name,
    email: athlete.email || "",
    role: "member",
    joinedAt: new Date().toISOString()
  });

  await updateDoc(clubRef, {
    members: sanitizeFirestoreData(members)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });

  if (targetUserId) {
    try {
      const userRef = doc(db, "users", targetUserId);
      await updateDoc(userRef, { club: clubData.name });
    } catch (e) {
      console.warn("Failed to update user profile club:", e);
    }
  }
  if (athlete.email) {
    await syncAthleteClubInGlobalList(athlete.email, clubData.name);
  }
}

/**
 * Transfers ownership of the SystemClub to another official member
 */
export async function transferClubLeadership(clubId: string, newLeaderUserId: string): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  const members = clubData.members || [];

  const currentLeader = members.find(m => m.role === "leader");
  const newLeader = members.find(m => m.userId === newLeaderUserId);

  if (!newLeader) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  if (currentLeader) {
    currentLeader.role = "member";
  }
  newLeader.role = "leader";

  await updateDoc(clubRef, {
    leaderId: newLeader.userId,
    leaderName: newLeader.name,
    leaderEmail: newLeader.email,
    members: sanitizeFirestoreData(members)
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });
}

/**
 * Updates SystemClub profile details
 */
export async function updateClubProfile(
  clubId: string,
  updates: {
    name: string;
    logoUrl: string;
    bannerUrl?: string;
    province: string;
    description?: string;
  }
): Promise<void> {
  const clubRef = doc(db, "vsc_system_clubs", clubId);
  const clubSnap = await getDoc(clubRef);
  if (!clubSnap.exists()) {
    throw new Error("CLUB_NOT_FOUND");
  }

  const clubData = clubSnap.data() as SystemClub;
  const oldName = clubData.name;
  const newName = updates.name.trim();

  await updateDoc(clubRef, {
    name: newName,
    logoUrl: updates.logoUrl || VSC_DEFAULT_LOGO,
    bannerUrl: updates.bannerUrl || "",
    province: updates.province,
    description: updates.description || ""
  }).catch(err => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_system_clubs/${clubId}`);
  });

  if (oldName !== newName) {
    const members = clubData.members || [];
    for (const member of members) {
      if (member.userId && !member.userId.startsWith("unlinked-")) {
        try {
          const userRef = doc(db, "users", member.userId);
          await updateDoc(userRef, { club: newName });
        } catch (e) {
          console.warn(`Failed to update member ${member.userId} club name:`, e);
        }
      }
    }
  }
}

/**
 * ==========================================
 * 💬 REAL-TIME CHAT SERVICE (TOURNAMENTS & PK)
 * ==========================================
 */

/**
 * Subscribes to real-time chat messages for a specific room.
 * roomIds: "pk_lobby" | `pk_match_${challengeId}` | `tournament_${tournamentId}`
 */
export function subscribeChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void,
  limitCount: number = 80
): () => void {
  try {
    const chatColl = collection(db, "vsc_chat_messages");
    const q = query(
      chatColl,
      where("roomId", "==", roomId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let createdAtMs = 0;
          if (data.createdAt?.toMillis) {
            createdAtMs = data.createdAt.toMillis();
          } else if (typeof data.createdAt === "number") {
            createdAtMs = data.createdAt;
          } else if (data.createdAt) {
            createdAtMs = new Date(data.createdAt).getTime() || 0;
          }

          msgs.push({
            id: docSnap.id,
            roomId: data.roomId,
            senderUid: data.senderUid || "",
            senderName: data.senderName || "Ẩn danh",
            senderEmail: data.senderEmail,
            senderAvatar: data.senderAvatar,
            senderRole: data.senderRole || "user",
            senderBadge: data.senderBadge,
            senderClub: data.senderClub,
            content: data.content || "",
            createdAt: createdAtMs || Date.now(),
            isPinned: Boolean(data.isPinned),
            pinnedBy: data.pinnedBy,
            reactions: data.reactions || {},
            replyTo: data.replyTo
          });
        });

        // Sort chronologically (oldest to newest)
        msgs.sort((a, b) => {
          const tA = typeof a.createdAt === "number" ? a.createdAt : 0;
          const tB = typeof b.createdAt === "number" ? b.createdAt : 0;
          return tA - tB;
        });

        // Limit to latest limitCount messages
        const sliced = msgs.length > limitCount ? msgs.slice(msgs.length - limitCount) : msgs;
        callback(sliced);
      },
      (error) => {
        console.warn(`[Firestore] Chat error for room ${roomId}:`, error);
        callback([]);
      }
    );
  } catch (err) {
    console.error(`Failed to subscribe to chat room ${roomId}:`, err);
    return () => {};
  }
}

/**
 * Sends a new chat message to Firestore.
 */
export async function sendChatMessage(
  message: {
    roomId: string;
    senderUid: string;
    senderName: string;
    senderEmail?: string;
    senderAvatar?: string;
    senderRole?: "admin" | "btc" | "referee" | "athlete" | "user";
    senderBadge?: string;
    senderClub?: string;
    content: string;
    replyTo?: {
      id: string;
      senderName: string;
      content: string;
    };
  }
): Promise<string> {
  const cleanContent = (message.content || "").trim();
  if (!cleanContent) {
    throw new Error("Tin nhắn không được để trống");
  }

  const chatColl = collection(db, "vsc_chat_messages");
  const docRef = doc(chatColl);

  const payload: Record<string, any> = {
    roomId: message.roomId,
    senderUid: message.senderUid,
    senderName: message.senderName || "Xạ thủ",
    senderEmail: message.senderEmail || "",
    senderAvatar: message.senderAvatar || "",
    senderRole: message.senderRole || "user",
    senderBadge: message.senderBadge || "",
    senderClub: message.senderClub || "",
    content: cleanContent,
    createdAt: serverTimestamp(),
    isPinned: false,
    reactions: {}
  };

  if (message.replyTo) {
    payload.replyTo = message.replyTo;
  }

  await setDoc(docRef, sanitizeFirestoreData(payload)).catch((err) => {
    handleFirestoreError(err, OperationType.CREATE, `vsc_chat_messages/${docRef.id}`);
  });

  return docRef.id;
}

/**
 * Pins or unpins a chat message in a room.
 */
export async function togglePinChatMessage(
  messageId: string,
  isPinned: boolean,
  pinnedByName?: string
): Promise<void> {
  const msgRef = doc(db, "vsc_chat_messages", messageId);
  await updateDoc(msgRef, {
    isPinned,
    pinnedBy: isPinned ? (pinnedByName || "BTC") : null
  }).catch((err) => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_chat_messages/${messageId}`);
  });
}

/**
 * Toggles an emoji reaction on a message.
 */
export async function toggleMessageReaction(
  messageId: string,
  emoji: string,
  userUid: string
): Promise<void> {
  const msgRef = doc(db, "vsc_chat_messages", messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) return;

  const data = snap.data();
  const reactions: Record<string, string[]> = data.reactions || {};
  const currentUids: string[] = reactions[emoji] || [];

  if (currentUids.includes(userUid)) {
    reactions[emoji] = currentUids.filter((u) => u !== userUid);
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }
  } else {
    reactions[emoji] = [...currentUids, userUid];
  }

  await updateDoc(msgRef, {
    reactions
  }).catch((err) => {
    handleFirestoreError(err, OperationType.UPDATE, `vsc_chat_messages/${messageId}`);
  });
}

/**
 * Deletes a chat message.
 */
export async function deleteChatMessage(messageId: string): Promise<void> {
  const msgRef = doc(db, "vsc_chat_messages", messageId);
  await deleteDoc(msgRef).catch((err) => {
    handleFirestoreError(err, OperationType.DELETE, `vsc_chat_messages/${messageId}`);
  });
}


