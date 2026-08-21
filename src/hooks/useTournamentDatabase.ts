import React, { useState, useEffect, useRef } from "react";
import { subscribeToTournamentDoc, updateOnlineTournament, TournamentData } from "../lib/firebaseService";
import { deepEqual, isTournamentEndedPast30Days } from "../utils/avatarHelpers";
import { Athlete } from "../types";

interface UseTournamentDatabaseProps {
  activeHistoryId: string | null;
  currentUser: any;
  isGlobalAdmin: boolean;
  userRole: string;
  dbHasPendingWrites: boolean;
  setDbHasPendingWrites: (pending: boolean) => void;
  
  // Local state values to sync/publish
  matchName: string;
  startDate: string;
  endDate: string;
  distances: any[];
  shotsCount: number;
  athletes: any[];
  teamDistances: any[];
  teamShotsCount: number;
  teamAthletes: any[];
  inputAthletes: any[];
  teamInputAthletes: any[];
  directMaxPoints: number | undefined;
  teamDirectMaxPoints: number | undefined;
  directMaxShots: number;
  teamDirectMaxShots: number;
  masterAthletes: any[];
  bannerUrl: string;
  avatarUrl: string;
  laneCapacity: number;
  participatingClubs: any[];
  activeTab: string;
  isSpectatorModeOverridden: boolean;
  VSC_DEFAULT_LOGO: string;
  currentTournamentDoc: TournamentData | null;
  isTournamentConfigLoaded: boolean;
  loadedTournamentIdRef: React.MutableRefObject<string | null>;

  // Setters to update local states from DB snapshots
  setMatchName: React.Dispatch<React.SetStateAction<string>>;
  setHeaderTempName: React.Dispatch<React.SetStateAction<string>>;
  setStartDate: React.Dispatch<React.SetStateAction<string>>;
  setEndDate: React.Dispatch<React.SetStateAction<string>>;
  setBannerUrl: React.Dispatch<React.SetStateAction<string>>;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  setTournamentType: React.Dispatch<React.SetStateAction<"individual" | "team" | "combined">>;
  setCompetitionMode: React.Dispatch<React.SetStateAction<"individual" | "team">>;
  setShotsCount: React.Dispatch<React.SetStateAction<number>>;
  setTeamShotsCount: React.Dispatch<React.SetStateAction<number>>;
  setLaneCapacity: React.Dispatch<React.SetStateAction<number>>;
  setDistances: React.Dispatch<React.SetStateAction<any[]>>;
  setTeamDistances: React.Dispatch<React.SetStateAction<any[]>>;
  setAthletes: React.Dispatch<React.SetStateAction<any[]>>;
  setTeamAthletes: React.Dispatch<React.SetStateAction<any[]>>;
  setInputAthletes: React.Dispatch<React.SetStateAction<any[]>>;
  setTeamInputAthletes: React.Dispatch<React.SetStateAction<any[]>>;
  setMasterAthletes: React.Dispatch<React.SetStateAction<any[]>>;
  setDirectMaxPoints: React.Dispatch<React.SetStateAction<number | undefined>>;
  setTeamDirectMaxPoints: React.Dispatch<React.SetStateAction<number | undefined>>;
  setDirectMaxShots: React.Dispatch<React.SetStateAction<number>>;
  setTeamDirectMaxShots: React.Dispatch<React.SetStateAction<number>>;
  setActiveTab: React.Dispatch<React.SetStateAction<any>>;
  setCurrentTournamentDoc: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setIsTournamentConfigLoaded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const useTournamentDatabase = ({
  activeHistoryId,
  currentUser,
  isGlobalAdmin,
  userRole,
  dbHasPendingWrites,
  setDbHasPendingWrites,

  matchName,
  startDate,
  endDate,
  distances,
  shotsCount,
  athletes,
  teamDistances,
  teamShotsCount,
  teamAthletes,
  inputAthletes,
  teamInputAthletes,
  directMaxPoints,
  teamDirectMaxPoints,
  directMaxShots,
  teamDirectMaxShots,
  masterAthletes,
  bannerUrl,
  avatarUrl,
  laneCapacity,
  participatingClubs,
  activeTab,
  isSpectatorModeOverridden,
  VSC_DEFAULT_LOGO,
  currentTournamentDoc,
  isTournamentConfigLoaded,
  loadedTournamentIdRef,

  setMatchName,
  setHeaderTempName,
  setStartDate,
  setEndDate,
  setBannerUrl,
  setAvatarUrl,
  setTournamentType,
  setCompetitionMode,
  setShotsCount,
  setTeamShotsCount,
  setLaneCapacity,
  setDistances,
  setTeamDistances,
  setAthletes,
  setTeamAthletes,
  setInputAthletes,
  setTeamInputAthletes,
  setMasterAthletes,
  setDirectMaxPoints,
  setTeamDirectMaxPoints,
  setDirectMaxShots,
  setTeamDirectMaxShots,
  setActiveTab,
  setCurrentTournamentDoc,
  setIsTournamentConfigLoaded,
}: UseTournamentDatabaseProps) => {
  
  const isSpectatorModeOverriddenRef = useRef(false);

  useEffect(() => {
    isSpectatorModeOverriddenRef.current = isSpectatorModeOverridden;
  }, [isSpectatorModeOverridden]);

  // Subscribe to real-time online document shifts
  useEffect(() => {
    setCurrentTournamentDoc(null);
    setIsTournamentConfigLoaded(false);

    if (!activeHistoryId || !activeHistoryId.startsWith("tour-")) {
      loadedTournamentIdRef.current = null;
      return;
    }

    let isFirstSnapshotOfSubscription = true;

    const unsubscribe = subscribeToTournamentDoc(activeHistoryId, (docVal, pending) => {
      setDbHasPendingWrites(pending);
      if (docVal) {
        setCurrentTournamentDoc(docVal);
        
        const isNewLoad = isFirstSnapshotOfSubscription;
        if (isFirstSnapshotOfSubscription) {
          isFirstSnapshotOfSubscription = false;
        }
        if (isNewLoad) {
          loadedTournamentIdRef.current = activeHistoryId;
        }

        const isOnlineTour = activeHistoryId?.startsWith("tour-");
        const hasEnded = isOnlineTour && isTournamentEndedPast30Days(docVal.endDate, docVal.startDate);

        const shouldOverwriteConfig = true;

        if (shouldOverwriteConfig) {
          if (docVal.matchName) {
            setMatchName((prev) => prev === docVal.matchName ? prev : docVal.matchName);
            setHeaderTempName((prev) => prev === docVal.matchName ? prev : docVal.matchName);
          }
          if (docVal.startDate !== undefined) {
            setStartDate((prev) => prev === (docVal.startDate || "") ? prev : (docVal.startDate || ""));
          }
          if (docVal.endDate !== undefined) {
            setEndDate((prev) => prev === (docVal.endDate || "") ? prev : (docVal.endDate || ""));
          }
          if (docVal.bannerUrl !== undefined) {
            setBannerUrl((prev) => prev === (docVal.bannerUrl || VSC_DEFAULT_LOGO) ? prev : (docVal.bannerUrl || VSC_DEFAULT_LOGO));
          }
          if (docVal.avatarUrl !== undefined) {
            setAvatarUrl((prev) => prev === (docVal.avatarUrl || VSC_DEFAULT_LOGO) ? prev : (docVal.avatarUrl || VSC_DEFAULT_LOGO));
          }
          if (docVal.tournamentType) {
            setTournamentType((prev) => {
              if (prev === docVal.tournamentType) return prev;
              return docVal.tournamentType;
            });
          } else if (docVal.competitionMode) {
            const fallback = docVal.competitionMode === "team" ? "team" : "combined";
            setTournamentType((prev) => {
              if (prev === fallback) return prev;
              return fallback;
            });
          }
          if (docVal.competitionMode) {
            const isCombined = docVal.tournamentType === "combined";
            if (!isSpectatorModeOverriddenRef.current && !isCombined) {
              setCompetitionMode((prev) => prev === docVal.competitionMode ? prev : docVal.competitionMode);
            }
          }
          if (docVal.shotsCount) {
            setShotsCount((prev) => prev === docVal.shotsCount ? prev : docVal.shotsCount);
          }
          if (docVal.teamShotsCount) {
            setTeamShotsCount((prev) => prev === docVal.teamShotsCount ? prev : docVal.teamShotsCount);
          }
          if (docVal.laneCapacity !== undefined && docVal.laneCapacity !== null) {
            setLaneCapacity((prev) => {
              if (prev === docVal.laneCapacity) return prev;
              return docVal.laneCapacity;
            });
          }
          if (docVal.distances) {
            setDistances((prev) => deepEqual(prev, docVal.distances) ? prev : docVal.distances);
          }
          if (docVal.teamDistances) {
            setTeamDistances((prev) => deepEqual(prev, docVal.teamDistances) ? prev : docVal.teamDistances);
          }
        }

        setAthletes((prev) => deepEqual(prev, docVal.athletes || []) ? prev : (docVal.athletes || []));
        setTeamAthletes((prev) => deepEqual(prev, docVal.teamAthletes || []) ? prev : (docVal.teamAthletes || []));
        setInputAthletes((prev) => deepEqual(prev, docVal.inputAthletes || []) ? prev : (docVal.inputAthletes || []));
        setTeamInputAthletes((prev) => deepEqual(prev, docVal.teamInputAthletes || []) ? prev : (docVal.teamInputAthletes || []));
        setMasterAthletes((prev) => {
          const rawTarget = docVal.masterAthletes && docVal.masterAthletes.length > 0
            ? docVal.masterAthletes
            : (docVal.athletes || []);
          const cleanedTarget = rawTarget.map((a: Athlete) => ({
            ...a,
            scores: {},
            soloHits: {},
            soloRounds: {},
            calledBy: "",
          }));
          return deepEqual(prev, cleanedTarget) ? prev : cleanedTarget;
        });
        if (docVal.directMaxPoints !== undefined) {
          const target = docVal.directMaxPoints !== null ? docVal.directMaxPoints : undefined;
          setDirectMaxPoints((prev) => prev === target ? prev : target);
        }
        if (docVal.teamDirectMaxPoints !== undefined) {
          const target = docVal.teamDirectMaxPoints !== null ? docVal.teamDirectMaxPoints : undefined;
          setTeamDirectMaxPoints((prev) => prev === target ? prev : target);
        }
        if (docVal.directMaxShots !== undefined) {
          const target = docVal.directMaxShots !== null ? docVal.directMaxShots : 10;
          setDirectMaxShots((prev) => prev === target ? prev : target);
        }
        if (docVal.teamDirectMaxShots !== undefined) {
          const target = docVal.teamDirectMaxShots !== null ? docVal.teamDirectMaxShots : 10;
          setTeamDirectMaxShots((prev) => prev === target ? prev : target);
        }

        setIsTournamentConfigLoaded(true);
      } else {
        setCurrentTournamentDoc(null);
      }
    });

    return () => unsubscribe();
  }, [activeHistoryId, currentUser, isGlobalAdmin]);

  // Cloud state publisher effect (Debounced to aggregate scoring events)
  useEffect(() => {
    if (!activeHistoryId || !activeHistoryId.startsWith("tour-")) return;
    if (dbHasPendingWrites) return;
    if (loadedTournamentIdRef.current !== activeHistoryId) return;
    if (currentTournamentDoc?.id !== activeHistoryId) return;
    if (userRole !== "admin" && userRole !== "referee") return;
    if (!isTournamentConfigLoaded || !currentTournamentDoc) return;
    
    if (userRole === "admin") {
      if (!matchName || !matchName.trim()) return;
      if (currentTournamentDoc.matchName && matchName.trim() !== currentTournamentDoc.matchName.trim() && !matchName.trim()) return;
      if ((!athletes || athletes.length === 0) && currentTournamentDoc.athletes && currentTournamentDoc.athletes.length > 0) return;
      if ((!masterAthletes || masterAthletes.length === 0) && currentTournamentDoc.masterAthletes && currentTournamentDoc.masterAthletes.length > 0) return;
      if ((!teamAthletes || teamAthletes.length === 0) && currentTournamentDoc.teamAthletes && currentTournamentDoc.teamAthletes.length > 0) return;
      if ((!distances || distances.length === 0) && currentTournamentDoc.distances && currentTournamentDoc.distances.length > 0) return;
    }

    const isDifferent = userRole === "admin"
      ? (
          !deepEqual(matchName, currentTournamentDoc?.matchName) ||
          !deepEqual(startDate, currentTournamentDoc?.startDate) ||
          !deepEqual(endDate, currentTournamentDoc?.endDate) ||
          !deepEqual(distances, currentTournamentDoc?.distances) ||
          !deepEqual(shotsCount, currentTournamentDoc?.shotsCount) ||
          !deepEqual(athletes, currentTournamentDoc?.athletes) ||
          !deepEqual(teamDistances, currentTournamentDoc?.teamDistances) ||
          !deepEqual(teamShotsCount, currentTournamentDoc?.teamShotsCount) ||
          !deepEqual(teamAthletes, currentTournamentDoc?.teamAthletes) ||
          !deepEqual(inputAthletes, currentTournamentDoc?.inputAthletes) ||
          !deepEqual(teamInputAthletes, currentTournamentDoc?.teamInputAthletes) ||
          !deepEqual(directMaxPoints, currentTournamentDoc?.directMaxPoints) ||
          !deepEqual(teamDirectMaxPoints, currentTournamentDoc?.teamDirectMaxPoints) ||
          !deepEqual(directMaxShots, currentTournamentDoc?.directMaxShots) ||
          !deepEqual(teamDirectMaxShots, currentTournamentDoc?.teamDirectMaxShots) ||
          !deepEqual(masterAthletes, currentTournamentDoc?.masterAthletes) ||
          !deepEqual(bannerUrl, currentTournamentDoc?.bannerUrl) ||
          !deepEqual(avatarUrl, currentTournamentDoc?.avatarUrl) ||
          !deepEqual(participatingClubs, currentTournamentDoc?.clubs) ||
          laneCapacity !== currentTournamentDoc?.laneCapacity
        )
      : (
          !deepEqual(inputAthletes, currentTournamentDoc?.inputAthletes) ||
          !deepEqual(teamInputAthletes, currentTournamentDoc?.teamInputAthletes)
        );

    if (!isDifferent) return;

    const timer = setTimeout(async () => {
      try {
        const payload: Partial<TournamentData> = userRole === "admin"
          ? {
              matchName,
              startDate,
              endDate,
              distances,
              shotsCount,
              athletes,
              teamDistances,
              teamShotsCount,
              teamAthletes,
              inputAthletes,
              teamInputAthletes,
              directMaxPoints,
              teamDirectMaxPoints,
              directMaxShots,
              teamDirectMaxShots,
              masterAthletes,
              bannerUrl,
              avatarUrl,
              laneCapacity,
              clubs: participatingClubs
            }
          : {
              inputAthletes,
              teamInputAthletes
            };
        await updateOnlineTournament(activeHistoryId, payload);
      } catch (err) {
        console.error("Cloud synchronization failed:", err);
      }
    }, 850);

    return () => clearTimeout(timer);
  }, [
    activeHistoryId,
    userRole,
    matchName,
    startDate,
    endDate,
    distances,
    shotsCount,
    athletes,
    teamDistances,
    teamShotsCount,
    teamAthletes,
    inputAthletes,
    teamInputAthletes,
    directMaxPoints,
    teamDirectMaxPoints,
    directMaxShots,
    teamDirectMaxShots,
    masterAthletes,
    bannerUrl,
    avatarUrl,
    laneCapacity,
    currentTournamentDoc,
    isTournamentConfigLoaded,
    participatingClubs,
    dbHasPendingWrites
  ]);

  // Action hook to automatically redirect unauthorized spectators
  useEffect(() => {
    if (userRole === "spectator") {
      if (activeTab === "scoring" || activeTab === "input_scores" || activeTab === "athletes" || activeTab === "settings" || activeTab === "history") {
        setActiveTab("dashboard");
      }
    } else if (userRole === "referee") {
      if (activeTab === "athletes" || activeTab === "settings" || activeTab === "history") {
        setActiveTab("input_scores");
      }
    }
  }, [userRole, activeTab]);
};
