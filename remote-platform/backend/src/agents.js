import { supabase } from "./supabase.js";

const connectedAgents = new Map();

export function registerAgentSocket(io, socket) {

    socket.on("agent:register", async (data, callback) => {

        try {

            const {
                deviceId,
                hostname,
                osName,
                osVersion,
                agentVersion
            } = data ?? {};

            if (!deviceId || !hostname) {
                callback?.({
                    ok: false,
                    error: "deviceId y hostname son obligatorios"
                });

                return;
            }

            socket.data.deviceId = deviceId;

            connectedAgents.set(deviceId, socket.id);

            const ip =
                socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim()
                ?? socket.handshake.address;

            const { error } = await supabase
                .from("devices")
                .upsert(
                    {
                        device_id: deviceId,
                        hostname,
                        os_name: osName ?? null,
                        os_version: osVersion ?? null,
                        agent_version: agentVersion ?? null,
                        last_ip: ip,
                        status: "online",
                        last_seen: new Date().toISOString()
                    },
                    {
                        onConflict: "device_id"
                    }
                );

            if (error) {
                console.error("Supabase register error:", error);

                callback?.({
                    ok: false,
                    error: "database_error"
                });

                return;
            }

            console.log(
                `[AGENT ONLINE] ${hostname} (${deviceId})`
            );

            callback?.({
                ok: true
            });

            io.emit("device:online", {
                deviceId,
                hostname
            });

        } catch (error) {

            console.error("agent:register error:", error);

            callback?.({
                ok: false,
                error: "internal_error"
            });
        }
    });


    socket.on("agent:heartbeat", async (data, callback) => {

        const deviceId =
            socket.data.deviceId ??
            data?.deviceId;

        if (!deviceId) {
            callback?.({
                ok: false,
                error: "device_not_registered"
            });

            return;
        }

        const { error } = await supabase
            .from("devices")
            .update({
                status: "online",
                last_seen: new Date().toISOString()
            })
            .eq("device_id", deviceId);

        if (error) {
            console.error("Heartbeat error:", error);
        }

        callback?.({
            ok: !error
        });
    });


    socket.on("disconnect", async (reason) => {

        const deviceId = socket.data.deviceId;

        if (!deviceId) {
            return;
        }

        connectedAgents.delete(deviceId);

        console.log(
            `[AGENT OFFLINE] ${deviceId} - ${reason}`
        );

        await supabase
            .from("devices")
            .update({
                status: "offline",
                last_seen: new Date().toISOString()
            })
            .eq("device_id", deviceId);

        io.emit("device:offline", {
            deviceId
        });
    });
}

export function isAgentOnline(deviceId) {

    return connectedAgents.has(deviceId);
}

export function getAgentSocketId(deviceId) {

    return connectedAgents.get(deviceId);
}