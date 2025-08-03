import http from 'http';
import type { NextFunction, Request, Response } from "express";
import express from 'express';
import { createServer as viteCreateServer } from 'vite';
import { fileURLToPath } from "url";
import { drizzle } from 'drizzle-orm/mysql2';
import 'dotenv/config';
import path from "path";

import { eq, sql } from 'drizzle-orm';
import { songsTable } from './db/schema.ts';

const db = drizzle(process.env.DATABASE_URL!);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = (process.env.ENVIRONMENT!) === 'dev';
if (isDev) {
    console.log("Development environment");
}

async function startDevServer() {
    const app = express();

    // Routes
    app.use(express.json());
    //app.use('/api/custom', (req, res) => {
    //    res.json({ message: 'This is from Express!' });
    //});

    app.get("/api/hello", async (req: Request, res: Response) => {
        const songs = await db.select().from(songsTable);
        console.log('Getting all users from the database!   : ', songs)

        res.json(songs);
    });

    app.get('/api/updateSongPlayed/:id', async (req: Request, res: Response) => {
        const songId = req.params.id;
        const v = await db.update(songsTable)
                            .set({
                                play_count: sql`${songsTable.play_count} + 1`,
                                date_played: sql`NOW()`
                            })
                            .where(eq(songsTable.cdnpath, songId));
        res.json(v);
    });

    // logger for GET/POST requests
    const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
    };

    app.use(loggerMiddleware);

    // Vite
    // run vite as middleware (along with server) so that we don't need to run express + vite separately
    const vite = await viteCreateServer({
        server: { middlewareMode: true, allowedHosts: true },
        appType: 'custom'
    });

    app.use(vite.middlewares);

    // Takeoff
    const server = http.createServer(app);
    server.listen(process.env.PORT!);

    // API proxy?
    //viteServer.middlewares.use('/api', (req, res) => {
    //    // Proxy to Express
    //    req.url = req.url.replace(/^\/api/, '');
    //    app(req, res);
    //});

    console.log(`Express server running on port ${process.env.PORT!}`);
};


startDevServer().catch(err => {
  console.error('Failed to start development server:', err);
  process.exit(1);
});
