// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDXR4yZlGVYq9QgYh7TudohxO3jx9LJhVc",
  authDomain: "medconnect-3e21a.firebaseapp.com",
  projectId: "medconnect-3e21a",
  storageBucket: "medconnect-3e21a.firebasestorage.app",
  messagingSenderId: "580471172629",
  appId: "1:580471172629:web:3033dc5616590228c0e81c",
  measurementId: "G-B72L4EQPQ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

export const db = getFirestore(app);
export const storage = getStorage(app);