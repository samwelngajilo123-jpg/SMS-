// netlify/functions/inbound-sms.js
// Set this URL as your "Callback URL" in the Africa's Talking dashboard
// (SMS > SMS Callback URL): https://<your-site>.netlify.app/.netlify/functions/inbound-sms
//
// AT posts application/x-www-form-urlencoded data with fields like:
// from, to, text, date, id, linkId, networkCode

const querystring = require("querystring");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  const contentType = event.headers["content-type"] || "";

  try {
    if (contentType.includes("application/json")) {
      data = JSON.parse(event.body || "{}");
    } else {
      // Africa's Talking sends form-encoded by default
      data = querystring.parse(event.body || "");
    }
  } catch (e) {
    console.error("Failed to parse inbound payload:", e);
    return { statusCode: 400, body: "Bad Request" };
  }

  console.log("Inbound SMS received:", data);

  // TODO: plug in your own logic here, e.g.:
  // - save to a database (Netlify doesn't persist state between calls)
  // - forward to Slack/email
  // - trigger an auto-reply via the send-sms function

  // Africa's Talking just needs a 200 response to acknowledge receipt
  return {
    statusCode: 200,
    body: "OK",
  };
};
