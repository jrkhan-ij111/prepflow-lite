import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw4E2keOB8KM2Iw066TiWjumUg7ucoLCw",
  authDomain: "prepflow-lite.firebaseapp.com",
  projectId: "prepflow-lite",
  storageBucket: "prepflow-lite.firebasestorage.app",
  messagingSenderId: "1001199935446",
  appId: "1:1001199935446:web:55f2dd642fc83dc54ece77"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);