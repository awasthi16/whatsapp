import axios from "axios";
const API_BASE = process.env.REACT_APP_API_URL || "https://whatsapp-backend-en5o.onrender.com";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

export default api;


// https://whatsapp-backend-delta.vercel.app/

// const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
