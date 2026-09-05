// netlify/functions/delivery-report.js
// Set this as your "Delivery Report Callback URL" in the Africa's Talking dashboard:
// https://<your-site>.netlify.app/.netlify/functions/delivery-report
//
// AT posts fields like: id, status, phoneNumber, networkCode, failureReason, retryCount

const querystring = require("querystring");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  const contentType = event.headers["content-type"] || "";

  try {
    data = contentType.includes("application/json")
      ? JSON.parse(event.body || "{}")
      : querystring.parse(event.body || "");
  } catch (e) {
    console.error("Failed to parse delivery report:", e);
    return { statusCode: 400, body: "Bad Request" };
  }

  console.log("Delivery report:", data);

  return { statusCode: 200, body: "OK" };
};
