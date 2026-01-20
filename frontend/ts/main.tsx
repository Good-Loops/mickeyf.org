/**
 * Application bootstrap entry point.
 *
 * Responsibilities:
 * - Creates the React root and mounts `<App />` into the DOM.
 * - Establishes top-level providers (router, auth) required across routes.
 * - Performs one-time global initialization (Firebase) used by downstream modules.
 *
 * Ownership boundary: this file composes bootstrap concerns only; app logic lives in feature modules, hooks, and
 * services.
 */
/// <reference types="vite/client" />

import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import App from "@/App";
import "../sass/style.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<BrowserRouter>
    	<AuthProvider>
			<App />
    	</AuthProvider>
  	</BrowserRouter>
);
import { initializeApp } from 'firebase/app';

/**
 * Firebase configuration sourced from Vite env vars.
 */
const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
	authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_FIREBASE_APP_ID,
	measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
initializeApp(firebaseConfig);
