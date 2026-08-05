import {
  setDoc,
  collection,
  getDocs,
  orderBy,
  query,
  doc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
  uploadBytes,
  deleteObject,
} from "firebase/storage";

import { db, storage } from "./firebase";
import type { ScrapbookEntry } from "../types";

export function subscribeToSnapshots(
  callback: (snapshots: ScrapbookEntry[]) => void,
): Unsubscribe {
  const q = query(collection(db, "scrapbook"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (querySnapshot) => {
    const snapshots = querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as Omit<ScrapbookEntry, "id">),
    }));

    callback(snapshots);
  });
}

export async function uploadSnapshot(
  blob: Blob,
  width: number,
  height: number,
): Promise<ScrapbookEntry> {
  const id = crypto.randomUUID();

  const now = new Date();

  const storagePath = `scrapbook/${now.getFullYear()}/${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}/${id}.png`;

  const storageRef = ref(storage, storagePath);

  console.log("Uploading snapshot...", {
    storagePath,
    sizeKB: Math.round(blob.size / 1024),
  });

  try {
    await uploadBytes(storageRef, blob);
    console.log("✅ uploadBytes succeeded");
  } catch (error) {
    console.error("❌ uploadBytes failed", error);
    throw error;
  }

  let imageUrl: string;

  try {
    imageUrl = await getDownloadURL(storageRef);
    console.log("✅ getDownloadURL succeeded");
  } catch (error) {
    console.error("❌ getDownloadURL failed", error);
    throw error;
  }

  const entry: ScrapbookEntry = {
    id,
    imageUrl,
    storagePath,
    createdAt: Date.now(),
    width,
    height,
  };

  try {
    await setDoc(doc(db, "scrapbook", id), entry);
    console.log("✅ Firestore write succeeded");
  } catch (error) {
    console.error("❌ Firestore write failed", error);
    throw error;
  }

  return entry;
}

export async function getSnapshots(): Promise<ScrapbookEntry[]> {
  try {
    const q = query(collection(db, "scrapbook"), orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as Omit<ScrapbookEntry, "id">),
    }));
  } catch (error) {
    console.error("❌ getSnapshots failed", error);
    throw error;
  }
}

export async function deleteSnapshot(entry: ScrapbookEntry) {
  const storageRef = ref(storage, entry.storagePath);

  await deleteObject(storageRef);

  await deleteDoc(doc(db, "scrapbook", entry.id));
}
