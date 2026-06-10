const axios = require("axios");

const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";

async function Log(stack, level, pkg, message) {
  const token = process.env.AUTH_TOKEN || process.env.LOG_API_TOKEN;

  try {
    const response = await axios.post(
      LOG_API_URL,
      {
        stack,
        level,
        package: pkg,
        message: message.substring(0, 48), // API max is 48 chars
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    // Don't crash the app if logging fails (e.g. expired token)
    console.warn(`[Log warn] ${err.response?.data?.message || err.message}`);
  }
}

module.exports = { Log };
