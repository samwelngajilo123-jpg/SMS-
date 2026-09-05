// netlify/functions/messages.js
// GET -> returns all messages received via USSD, newest first
// Optional header: x-dashboard-secret: <DASHBOARD_SECRET>

const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = process.env.DASHBOARD_SECRET;
  if (secret && event.headers["x-dashboard-secret"] !== secret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  try {
    const store = getStore("ussd-messages");
    const { blobs } = await store.list();

    const messages = await Promise.all(
      blobs.map(async (b) => await store.get(b.key, { type: "json" }))
    );

    // Newest first
    messages.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: messages.length, messages }),
    };
  } catch (err) {
    console.error("Failed to list messages:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
