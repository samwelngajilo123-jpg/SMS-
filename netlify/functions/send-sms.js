// netlify/functions/send-sms.js
// POST { "to": "+2557XXXXXXXX", "message": "Reply text" }
// Optional header: x-send-secret: <SEND_SMS_SECRET>

const africastalking = require("africastalking");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const secret = process.env.SEND_SMS_SECRET;
  if (secret && event.headers["x-send-secret"] !== secret) {
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { to, message } = payload;
  if (!to || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "'to' and 'message' are required" }),
    };
  }

  const AT = africastalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  });

  const options = {
    to: Array.isArray(to) ? to : [to],
    message,
  };
  if (process.env.AT_SENDER_ID) {
    options.from = process.env.AT_SENDER_ID;
  }

  try {
    const result = await AT.SMS.send(options);
    return { statusCode: 200, body: JSON.stringify({ success: true, result }) };
  } catch (error) {
    console.error("AT send error:", error);
    return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
