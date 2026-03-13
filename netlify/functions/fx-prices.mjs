import { getStore } from "@netlify/blobs";

export default async function handler(req) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=3600",
  };

  try {
    const store = getStore("fx-rates");
    const data = await store.get("latest", { type: "json" });

    if (!data) {
      return new Response(
        JSON.stringify({ error: "No FX data stored yet. Trigger fetch-fx manually from Netlify dashboard." }),
        { status: 404, headers }
      );
    }

    return new Response(JSON.stringify(data), { status: 200, headers });

  } catch (err) {
    console.error("[fx-prices] Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers }
    );
  }
}

export const config = {
  path: "/api/fx-prices",
};
