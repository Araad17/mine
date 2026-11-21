import axios from "axios";

const api = axios.create({
	baseURL: `${import.meta.env.VITE_API_URL || "https://mine-one-pi.vercel.app"}/api`,
});

api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (
			error.response?.status === 401 &&
			!location.pathname.startsWith("/login")
		) {
			localStorage.removeItem("token");
			location.href = "/login";
		}

		return Promise.reject(error);
	},
);

export default api;
