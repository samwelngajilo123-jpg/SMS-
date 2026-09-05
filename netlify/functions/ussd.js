// netlify/functions/ussd.js
//
// Set this as your USSD Callback URL in the Africa's Talking dashboard:
// https://<your-site>.netlify.app/.netlify/functions/ussd
//
// Africa's Talking POSTs form-encoded fields on every step of the session:
//   sessionId, serviceCode, phoneNumber, text
//
// "text" accumulates the user's choices separated by "*", e.g.:
//   ""        -> user just dialed the code (first screen)
//   "1"       -> user chose option 1 on the first screen
//   "1*Hello" -> user chose option 1, then typed "Hello"
//
// Response must start with:
//   "CON ..." -> show another screen, session continues
//   "END ..." -> show final message, session closes

const querystring = require("querystring");
const { getStore } = require("@netlify/blobs");
const africastalking = require("africastalking");

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

async function sendSms(to, message) {
  const AT = africastalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });
  const options = { to: [to], message };
  if (process.env.AT_SENDER_ID) options.from = process.env.AT_SENDER_ID;
  return AT.SMS.send(options);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const contentType = event.headers["content-type"] || "";
  const params = contentType.includes("application/json")
    ? JSON.parse(event.body || "{}")
    : querystring.parse(event.body || "");

  const { sessionId, phoneNumber, text = "" } = params;

  const input = text.trim();
  const steps = input === "" ? [] : input.split("*");

  let response;

  if (steps.length === 0) {
    // First screen — the menu shown the moment someone dials the code
    response = "CON Welcome!\n1. Send a message\n2. About this service";
  } else if (steps[0] === "1" && steps.length === 1) {
    // They chose "Send a message" — ask them to type it
    response = "CON Please type your message:";
  } else if (steps[0] === "1" && steps.length === 2) {
    // They typed the message — forward it as a real SMS, then log it
    const message = steps[1];
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;

    try {
      if (adminPhone) {
        // The actual SMS send that makes this a real notification, not just a database write
        await sendSms(adminPhone, `USSD message from ${phoneNumber}:\n${message}`);
      } else {
        console.warn("ADMIN_PHONE_NUMBER not set — message stored but no SMS was sent.");
      }
    } catch (err) {
      console.error("Failed to send SMS for USSD message:", err);
      // Still log it below and confirm to the user, so they aren't stuck on an AT/network hiccup
    }

    try {
      const store = messagesStore();
      const record = {
        phoneNumber,
        message,
        sessionId,
        channel: "ussd",
        receivedAt: new Date().toISOString(),
      };
      // Key by timestamp+sessionId so entries never collide
      await store.setJSON(`${Date.now()}-${sessionId}`, record);
    } catch (err) {
      console.error("Failed to store USSD message:", err);
    }

    response = "END Thank you! Your message has been sent.";
  } else if (steps[0] === "2") {
    response = "END This service lets you send a message without needing SMS credit or internet.";
  } else {
    response = "END Invalid option. Please dial again.";
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "text/plain" },
    body: response,
  };
};
