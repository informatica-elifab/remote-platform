import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
    throw new Error(
        "Faltan SUPABASE_URL o SUPABASE_SECRET_KEY"
    );
}

export const supabase = createClient(url, secretKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});