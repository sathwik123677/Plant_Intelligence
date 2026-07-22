import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000/api";
const API_KEY_STORAGE_KEY = "plant_intel_gemini_key";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const key = getStoredApiKey();
  if (key) config.headers["X-Gemini-Key"] = key;
  return config;
});

export function getStoredApiKey() {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

export function setStoredApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORAGE_KEY, key);
  else localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function uploadDocument(file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  return client
    .post("/documents/upload/", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded / evt.total) * 100));
      },
    })
    .then((res) => res.data);
}

export function listDocuments() {
  return client.get("/documents/").then((res) => res.data);
}

export function clearAllDocuments() {
  return client.post("/documents/clear/").then((res) => res.data);
}

export function sendChatMessage(message, sessionId) {
  return client
    .post("/chat/", { message, session_id: sessionId })
    .then((res) => res.data);
}

export function queryGraph(question) {
  return client.post("/graph/query/", { question }).then((res) => res.data);
}

export function getGraphSummary() {
  return client.get("/graph/summary/").then((res) => res.data);
}

export default client;
