import 'dotenv/config';
import express from 'express';
import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';
import http from 'http';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';


const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

app.use(securityMiddleware());

app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running ON ${baseUrl}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'not set (defaulting to development)'}`);
    console.log(`WebSocket server is running ON ${baseUrl.replace('http', 'ws')}/ws`);
});
