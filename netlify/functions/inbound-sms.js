// netlify/functions/inbound-sms.js
//
// Set this as your "Callback URL" in the Africa's Talking dashboard under
// SMS settings: https://<your-site>.netlify.app/.netlify/functions/inbound-sms
//
// This captures any SMS sent directly to your Africa's Talking number and
// logs it into the same store the dashboard reads from — so the dashboard
// shows every message that becomes an SMS, whether it started as a USSD
// session or arrived as a normal text.

const querystring = require("querystring");
const { getStore } = require("@netlify/blobs");

// Netlify Blobs is usually auto-configured, but some deploy methods don't
// inject that context automatically — so we fall back to explicit credentials
// (NETLIFY_SITE_ID + NETLIFY_API_TOKEN) if they're set.
function messagesStore() {
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_API_TOKEN) {
    return getStore({
      name: "ussd-messages",
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_API_TOKEN,
    });
  }
  return getStore("ussd-messages");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const contentType = event.headers["content-type"] || "";
  let data;
  try {
    data = contentType.includes("application/json")
      ? JSON.parse(event.body || "{}")
      : querystring.parse(event.body || "");
  } catch (e) {
    console.error("Failed to parse inbound SMS payload:", e);
    return { statusCode: 400, body: "Bad Request" };
  }

  // Africa's Talking sends: from, to, text, date, id, linkId, networkCode
  const { from, text, id } = data;

  try {
    const store = messagesStore();
    const record = {
      phoneNumber: from,
      message: text,
      sessionId: id || null,
      channel: "sms",
      receivedAt: new Date().toISOString(),
    };
    await store.setJSON(`${Date.now()}-${id || "sms"}`, record);
  } catch (err) {
    console.error("Failed to store inbound SMS:", err);
  }

  // AT just needs a 200 to acknowledge receipt
  return { statusCode: 200, body: "OK" };
};
