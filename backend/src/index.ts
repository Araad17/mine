import "dotenv/config";
import express, {
	type NextFunction,
	type Request,
	type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { requireAuth, requireSuper } from "./auth.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import lookupRoutes from "./routes/lookups.js";
import shipmentRoutes from "./routes/shipments.js";
import statementRoutes from "./routes/statement.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", requireAuth, requireSuper, userRoutes);
app.use("/api/shipments", requireAuth, shipmentRoutes);
app.use("/api/statement", requireAuth, statementRoutes);
app.use("/api", requireAuth, lookupRoutes); // /materials, /receivers

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
	if (err instanceof ZodError)
		return res.status(400).json({
			error: err.issues.map((i) => i.message).join("، ") || "داده نامعتبر",
		});
	console.error(err);
	res.status(500).json({ error: "خطای سرور" });
});

export default app;

if (!process.env.VERCEL) {
	const port = Number(process.env.PORT) || 4000;
	app.listen(port, () => {
		console.log(`API on http://localhost:${port}`);
	});
}
