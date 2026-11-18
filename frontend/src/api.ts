import axios from "axios";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "/api",
});
api.interceptors.response.use(
	(r) => r,
	(e) => {
		if (e.response?.status === 401 && !location.pathname.startsWith("/login")) {
			localStorage.removeItem("token");
			location.href = "/login";
		}
		return Promise.reject(e);
	},
);
export default api;
