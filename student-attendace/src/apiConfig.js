// API Configuration for local development and Vercel cloud deployment
const API_BASE_URL =
  process.env.REACT_APP_API_URL !== undefined
    ? process.env.REACT_APP_API_URL
    : process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:5000";

export { API_BASE_URL };
export default API_BASE_URL;
