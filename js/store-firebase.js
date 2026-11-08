// Backend real: Firebase (Firestore + Authentication) — plano gratuito "Spark".
import { CONFIG } from "./config.js";

const B = "https://www.gstatic.com/firebasejs/10.14.1/";
const { initializeApp } = await import(B + "firebase-app.js");
const A = await import(B + "firebase-auth.js");
const F = await import(B + "firebase-firestore.js");

const app = initializeApp(CONFIG.firebase);
const auth = A.getAuth(app);
const db = F.getFirestore(app);

const authReady = new Promise(res => { const off = A.onAuthStateChanged(auth, () => { off(); res(); }); });
const pollOf = s => ({ id: s.id, ...s.data() });

async function checkAdmin(user) {
  if (!user || user.isAnonymous) return false;
  try { return (await F.getDoc(F.doc(db, "admins", user.uid))).exists(); } catch { return false; }
}

function clean(data) {
  const out = { ...data };
  if (out.options) {
    out.options = out.options.map(o => ({ id: o.id, name: String(o.name || "").trim(), detail: String(o.detail || "").trim() }));
    out.optionIds = out.options.map(o => o.id);
  }
  return out;
}

export default {
  mode: "firebase",

  watchPolls(cb, onErr) {
    return F.onSnapshot(F.collection(db, "polls"), snap => cb(snap.docs.map(pollOf)), onErr);
  },
  watchPoll(id, cb, onErr) {
    return F.onSnapshot(F.doc(db, "polls", id), s => cb(s.exists() ? pollOf(s) : null), onErr);
  },

  // ---- eleitor (login anônimo: 1 voto por aparelho/navegador) ----
  async voterId() {
    await authReady;
    if (!auth.currentUser) await A.signInAnonymously(auth);
    return auth.currentUser.uid;
  },
  async myVote(pid) {
    const uid = await this.voterId();
    const s = await F.getDoc(F.doc(db, "polls", pid, "votes", uid));
    return s.exists() ? s.data().option : null;
  },
  async vote(pid, option) {
    const uid = await this.voterId();
    await F.setDoc(F.doc(db, "polls", pid, "votes", uid), { option, at: F.serverTimestamp() });
  },

  // ---- organização ----
  onAuth(cb) {
    return A.onAuthStateChanged(auth, async u => {
      if (!u || u.isAnonymous) return cb(null);
      cb({ uid: u.uid, email: u.email, isAdmin: await checkAdmin(u) });
    });
  },
  login(email, pw) { return A.signInWithEmailAndPassword(auth, email, pw); },
  logout() { return A.signOut(auth); },

  async createPoll(data) {
    const ref = await F.addDoc(F.collection(db, "polls"), {
      ...clean(data), status: "draft", reveal: false, showLive: false, results: null, createdAt: F.serverTimestamp(),
    });
    return ref.id;
  },
  updatePoll(id, patch) { return F.updateDoc(F.doc(db, "polls", id), clean(patch)); },
  async deletePoll(id) { await this.resetVotes(id); await F.deleteDoc(F.doc(db, "polls", id)); },

  watchVotes(pid, cb, onErr) {
    return F.onSnapshot(F.collection(db, "polls", pid, "votes"), snap => {
      const counts = {};
      snap.forEach(d => { const o = d.data().option; counts[o] = (counts[o] || 0) + 1; });
      cb(counts);
    }, onErr);
  },
  // ---- reações ao vivo (emojis que voam no telão) ----
  async react(e) {
    await this.voterId();
    await F.addDoc(F.collection(db, "reactions"), { e, at: F.serverTimestamp() });
  },
  watchReactions(cb) {
    let first = true;
    const q = F.query(F.collection(db, "reactions"), F.orderBy("at", "desc"), F.limit(15));
    return F.onSnapshot(q, snap => {
      if (first) { first = false; return; }
      snap.docChanges().forEach(ch => { if (ch.type === "added") cb(ch.doc.data().e); });
    }, () => {});
  },
  async clearReactions() {
    const snap = await F.getDocs(F.collection(db, "reactions"));
    let batch = F.writeBatch(db), n = 0;
    for (const d of snap.docs) { batch.delete(d.ref); if (++n % 450 === 0) { await batch.commit(); batch = F.writeBatch(db); } }
    await batch.commit();
    return n;
  },

  async resetVotes(pid) {
    const snap = await F.getDocs(F.collection(db, "polls", pid, "votes"));
    let batch = F.writeBatch(db), n = 0;
    for (const d of snap.docs) {
      batch.delete(d.ref);
      if (++n % 450 === 0) { await batch.commit(); batch = F.writeBatch(db); }
    }
    await batch.commit();
  },
};
