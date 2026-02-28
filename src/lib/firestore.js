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
  await updateDoc(doc(db, "hikes", hikeId), { status: "ended" });
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
    const closest = findClosestLeader(location.lat, location.lng, leaders);
    const incident = {
      hikeId,
      hikerId: hiker.id,
      hikerName: hiker.name,
      hikerMedicalInfo: hiker.medicalInfo || {},
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
 * @returns {Promise<string|null>}
 */
export async function joinAsLeader(hikeId, userId, name, phone = "") {
  try {
    const ref = await addDoc(collection(db, "leaders"), {
      userId,
      hikeId,
      groupId: null,
      name,
      phone,
      isActive: true,
      lastLocation: null,
    });
    return ref.id;
  } catch (err) {
    console.error("joinAsLeader:", err);
    return null;
  }
}

/**
 * Create leader docs when creating a hike. Call after createHike.
 * @param {string} hikeId
 * @param {Array<{ id: string; name: string; leaderId: string; color: string }>} groups
 * @param {Array<{ userId: string; name: string; phone: string }>} leaderProfiles
 */
export async function createLeadersForHike(hikeId, groups, leaderProfiles = []) {
  const profileMap = Object.fromEntries(leaderProfiles.map((p) => [p.userId, p]));
  for (const g of groups || []) {
    if (!g.leaderId) continue;
    const profile = profileMap[g.leaderId] || { name: "Leader", phone: "" };
    try {
      await addDoc(collection(db, "leaders"), {
        userId: g.leaderId,
        hikeId,
        groupId: g.id,
        name: profile.name,
        phone: profile.phone,
        isActive: false,
        lastLocation: null,
      });
    } catch (err) {
      console.error("createLeadersForHike:", err);
    }
  }
}
