import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import { supabase } from "./supabase.js";
import {
    registerAgentSocket,
    isAgentOnline
} from "./agents.js";


const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "*"
}));

app.use(express.json());


const httpServer = createServer(app);


const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    }
});


app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        service: "remote-platform-backend",
        timestamp: new Date().toISOString()
    });
});


app.get("/api/devices", async (req, res) => {

    const { data, error } = await supabase
        .from("devices")
        .select("*")
        .order("hostname");

    if (error) {
        console.error(error);

        return res.status(500).json({
            error: "database_error"
        });
    }

    const devices = data.map(device => ({
        ...device,

        connected: isAgentOnline(
            device.device_id
        )
    }));

    res.json(devices);
});


io.on("connection", socket => {

    console.log(
        `[SOCKET CONNECTED] ${socket.id}`
    );

    registerAgentSocket(io, socket);
});


const port =
    Number(process.env.PORT) || 3000;


httpServer.listen(
    port,
    "0.0.0.0",
    () => {

        console.log(
            `Backend listening on port ${port}`
        );
    }
);