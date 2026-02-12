import { Router } from "express";
import { createMatchSchema, listMatchesQuerySchema, MATCH_STATUS } from "../validation/matches.js";
import { desc } from "drizzle-orm";
import { matches } from "../db/schema.js";
import { db } from "../db/db.js";
import { getMatchStatus } from "../utils/match-status.js";


export const matchRouter = Router();

const MAX_LIMIT = 100;

matchRouter.get("/", async (req, res) => {
    const parsed = listMatchesQuerySchema.safeParse(req.query);

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid Query.', details: parsed.error.issues });
    }

    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    try {
        const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);
        res.json({ data });
    }
    catch (e) {
        console.error("[Database Error] Failed to list matches:", e.message);

        // Mock fallback for testing if DB fails (e.g., table missing)
        const mockData = [
            { id: 1, sport: 'Soccer', homeTeam: 'Mock XI', awayTeam: 'Test United', status: 'live', homeScore: 2, awayScore: 1 },
            { id: 2, sport: 'Basketball', homeTeam: 'Unit Stars', awayTeam: 'Code City', status: 'scheduled', homeScore: 0, awayScore: 0 }
        ];

        console.log("[Fallback] Serving mock data for testing.");
        res.json({ data: mockData, note: "Serving mock data due to DB error. Check table existence." });
    }
});

matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);

    if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid Payload.', details: parsed.error.issues });
    }

    const { startTime, endTime, homeScore, awayScore } = parsed.data;

    const status = getMatchStatus(new Date(startTime), new Date(endTime)) || MATCH_STATUS.SCHEDULED;

    try {
        const [event] = await db.insert(matches).values({
            ...parsed.data,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            homeScore: homeScore ?? 0,
            awayScore: awayScore ?? 0,
            status,
        }).returning();

        try {
            if (res.app.locals.broadcastMatchCreated) {
                res.app.locals.broadcastMatchCreated(event);
            }
        } catch (broadcastError) {
            console.error("Failed to broadcast match creation:", broadcastError);
        }

        res.status(201).json({ data: event });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create match' });
    }
});

