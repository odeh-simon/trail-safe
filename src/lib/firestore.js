import {
  signInAnonymously,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { findClosestLeader } from "@/lib/haversine";

/**
 * Signs in anonymously, creates user doc if first time
 * @returns {Promise<import("firebase/auth").User>}
 */
export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  const { user } = await signInAnonymously(auth);
  return user;
}

/**
 * @param {string} uid
 * @param {{ name?: string; role?: string; phone?: string }} data
 * @returns {Promise<null>}
 */
export async function setUserProfile(uid, { name, role, phone }) {
  try {
    const data = { uid, createdAt: new Date() };
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (phone !== undefined) data.phone = phone;
    await setDoc(doc(db, "users", uid), data, { merge: true });
  } catch (err) {
    console.error("setUserProfile:", err);
    return null;
  }
}

/**
 * @param {string} uid
 * @returns {Promise<string|null>}
 */
export async function getUserRole(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data().role : null;
  } catch (err) {
    console.error("getUserRole:", err);
    return null;
  }
}

/**
 * @param {object} hikeData
 * @returns {Promise<string|null>}
 */
export async function createHike(hikeData) {
  try {
    const ref = await addDoc(collection(db, "hikes"), {
      ...hikeData,
      status: "upcoming",
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error("createHike:", err);
    return null;
  }
}

/**
 * @param {string} hikeId
 */
export async function startHike(hikeId) {
  await updateDoc(doc(db, "hikes", hikeId), { status: "active" });
}

/**
 * @param {string} hikeId
 */
export async function endHike(hikeId) {
  try {
    await updateDoc(doc(db, "hikes", hikeId), { status: "ended" });

    const hikersSnap = await getDocs(
      query(collection(db, "hikers"), where("hikeId", "==", hikeId))
    );
    for (const h of hikersSnap.docs) {
      const userId = h.data().userId;
      if (userId) {
        await setDoc(doc(db, "users", userId), { role: null }, { merge: true });
      }
    }

    const leadersSnap = await getDocs(
      query(collection(db, "leaders"), where("hikeId", "==", hikeId))
    );
    for (const l of leadersSnap.docs) {
      const userId = l.data().userId;
      if (userId) {
        await setDoc(doc(db, "users", userId), { role: null }, { merge: true });
      }
    }
  } catch (err) {
    console.error("endHike:", err);
  }
}

/**
 * @param {object} hikerData
 * @returns {Promise<string|null>}
 */
export async function registerHiker(hikerData) {
  try {
    const ref = await addDoc(collection(db, "hikers"), {
      ...hikerData,
      checkedIn: false,
      checkedOut: false,
      lastLocation: null,
      registeredAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error("registerHiker:", err);
    return null;
  }
}

/**
 * @param {string} hikerId
 * @param {{ lat: number; lng: number; accuracy?: number }} location
 */
export async function checkInHiker(hikerId, location) {
  try {
    const hikerSnap = await getDoc(doc(db, "hikers", hikerId));
    const hikeId = hikerSnap.data()?.hikeId;
    if (hikeId) {
      const hikeSnap = await getDoc(doc(db, "hikes", hikeId));
      if (hikeSnap.data()?.status !== "active") {
        console.warn("checkInHiker: hike is not active, blocking check-in");
        return;
      }
    }
    await updateDoc(doc(db, "hikers", hikerId), {
      checkedIn: true,
      checkedInAt: serverTimestamp(),
      lastLocation: { ...location, timestamp: new Date() },
    });
  } catch (err) {
    console.error("checkInHiker:", err);
  }
}

/**
 * Re-check-in after checkout
 * @param {string} hikerId
 * @param {{ lat: number; lng: number; accuracy?: number }} [location]
 */
export async function reCheckInHiker(hikerId, location = null) {
  try {
    await updateDoc(doc(db, "hikers", hikerId), {
      checkedOut: false,
      checkedOutAt: null,
      lastLocation: location ? { ...location, timestamp: new Date() } : null,
    });
  } catch (err) {
    console.error("reCheckInHiker:", err);
  }
}

/**
 * @param {string} hikerId
 */
export async function checkOutHiker(hikerId) {
  try {
    await updateDoc(doc(db, "hikers", hikerId), {
      checkedOut: true,
      checkedOutAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("checkOutHiker:", err);
  }
}

/**
 * @param {object} params
 * @param {string} params.hikeId
 * @param {object} params.hiker
 * @param {string} params.type
 * @param {string} [params.note]
 * @param {{ lat: number; lng: number }} params.location
 * @param {Array} params.leaders
 * @returns {Promise<string|null>}
 */
export async function fireSOSIncident({ hikeId, hiker, type, note, location, leaders }) {
  try {
    const hikerSnap = await getDoc(doc(db, "hikers", hiker.id));
    const hikerData = hikerSnap.data() || {};
    const closest = findClosestLeader(location.lat, location.lng, leaders);
    const incident = {
      hikeId,
      hikerId: hiker.id,
      hikerName: hiker.name,
      hikerMedicalInfo: {
        ...(hiker.medicalInfo || {}),
        emergencyContact: hikerData.emergencyContact || {},
      },
      type,
      note: note || "",
      coordinates: location,
      assignedLeaderId: closest?.userId ?? null,
      assignedLeaderName: closest?.name ?? null,
      closestLeaderDistanceMeters: closest?.distanceMeters ?? null,
      status: "active",
      firedAt: serverTimestamp(),
      respondingAt: null,
      resolvedAt: null,
      timeline: [
        { event: "SOS fired", timestamp: new Date(), actorId: hiker.userId },
      ],
    };
    const ref = await addDoc(collection(db, "incidents"), incident);
    return ref.id;
  } catch (err) {
    console.error("fireSOSIncident:", err);
    return null;
  }
}

/**
 * @param {string} incidentId
 * @param {string} leaderId
 * @param {string} leaderName
 */
export async function respondToIncident(incidentId, leaderId, leaderName) {
  try {
    await updateDoc(doc(db, "incidents", incidentId), {
      assignedLeaderId: leaderId,
      assignedLeaderName: leaderName,
      status: "responding",
      respondingAt: serverTimestamp(),
      timeline: arrayUnion({
        event: "Leader responding",
        timestamp: new Date(),
        actorId: leaderId,
      }),
    });
  } catch (err) {
    console.error("respondToIncident:", err);
  }
}

/**
 * @param {string} incidentId
 * @param {string} actorId
 */
/**
 * Subscribe to a single incident
 * @param {string} incidentId
 * @param {(incident: object|null) => void} callback
 * @returns {() => void} Unsubscribe
 */
export function subscribeToIncident(incidentId, callback) {
  return onSnapshot(doc(db, "incidents", incidentId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function resolveIncident(incidentId, actorId = "") {
  try {
    const snap = await getDoc(doc(db, "incidents", incidentId));
    const data = snap.data() || {};
    const aid = actorId || data.assignedLeaderId || "";
    await updateDoc(doc(db, "incidents", incidentId), {
      status: "resolved",
      resolvedAt: serverTimestamp(),
      timeline: arrayUnion({
        event: "Incident resolved",
        timestamp: new Date(),
        actorId: aid,
      }),
    });
  } catch (err) {
    console.error("resolveIncident:", err);
  }
}

/**
 * @param {string} hikeId
 * @returns {Promise<Array>}
 */
export async function getActiveLeaders(hikeId) {
  try {
    const q = query(
      collection(db, "leaders"),
      where("hikeId", "==", hikeId),
      where("isActive", "==", true)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("getActiveLeaders:", err);
    return [];
  }
}

/**
 * @param {string} leaderId
 * @param {{ lat: number; lng: number; accuracy?: number }} location
 */
export async function updateLeaderLocation(leaderId, location) {
  try {
    await updateDoc(doc(db, "leaders", leaderId), {
      lastLocation: { ...location, timestamp: new Date() },
    });
  } catch (err) {
    console.error("updateLeaderLocation:", err);
  }
}

/**
 * Join as leader for a hike - creates leader doc
 * @param {string} hikeId
 * @param {string} userId
 * @param {string} name
 * @param {string} [phone]
 * @param {string} [roleTitle]
 * @returns {Promise<string|null>}
 */
export async function joinAsLeader(hikeId, userId, name, phone = "", roleTitle = "") {
  try {
    const q = query(
      collection(db, "leaders"),
      where("userId", "==", userId),
      where("hikeId", "==", hikeId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return existing.docs[0].id;

    const ref = await addDoc(collection(db, "leaders"), {
      userId,
      hikeId,
      groupId: null,
      name,
      phone,
      roleTitle,
      isActive: true,
      status: "available",
      lastLocation: null,
      joinedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error("joinAsLeader:", err);
    return null;
  }
}

/**
 * Assign a leader to a group
 * @param {string} leaderId - Firestore doc ID of the leader
 * @param {string|null} groupId
 */
export async function assignLeaderToGroup(leaderId, groupId) {
  try {
    await updateDoc(doc(db, "leaders", leaderId), { groupId });
  } catch (err) {
    console.error("assignLeaderToGroup:", err);
  }
}

/**
 * Auto-assign unassigned leaders to groups that have no leader
 * @param {string} hikeId
 * @param {Array<{ id: string }>} groups
 */
export async function autoAssignLeaders(hikeId, groups = []) {
  try {
    const q = query(collection(db, "leaders"), where("hikeId", "==", hikeId));
    const snap = await getDocs(q);
    const leaders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const unassignedLeaders = leaders.filter((l) => !l.groupId);
    const unledGroups = groups.filter((g) => !leaders.find((l) => l.groupId === g.id));

    for (let i = 0; i < Math.min(unassignedLeaders.length, unledGroups.length); i++) {
      await assignLeaderToGroup(unassignedLeaders[i].id, unledGroups[i].id);
    }
  } catch (err) {
    console.error("autoAssignLeaders:", err);
  }
}
