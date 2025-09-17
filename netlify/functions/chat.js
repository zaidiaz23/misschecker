// netlify/functions/chat.js

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  // Add this right before: const response = await fetch(API_URL, {
  console.log("=== DEBUG AWS API CALL ===");
  console.log("API_URL:", API_URL);
  console.log("API_KEY length:", API_KEY ? API_KEY.length : 0);
  console.log(
    "API_KEY preview:",
    API_KEY ? API_KEY.substring(0, 10) + "..." : "MISSING"
  );
  console.log(
    "Request body:",
    JSON.stringify({
      message: requestBody.message,
      timestamp: new Date().toISOString(),
    })
  );
  console.log("Headers that will be sent:", {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY ? API_KEY.substring(0, 10) + "..." : "MISSING",
  });
  console.log("=== END DEBUG ===");

  try {
    // Get API details from environment variables
    const API_URL = process.env.AWS_API_GATEWAY_URL;
    const API_KEY = process.env.AWS_API_KEY;

    console.log("Environment check:", {
      hasApiUrl: !!API_URL,
      hasApiKey: !!API_KEY,
    });

    if (!API_URL || !API_KEY) {
      console.error("Missing environment variables");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Parse request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (error) {
      console.error("JSON parse error:", error);
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    // Validate message
    if (!requestBody.message || requestBody.message.trim().length === 0) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    if (requestBody.message.length > 285) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          error: "Message too long. Maximum 285 characters allowed.",
        }),
      };
    }

    console.log("Calling AWS API Gateway:", API_URL);

    // Use built-in fetch (Node.js 18+)
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
      body: JSON.stringify({
        message: requestBody.message,
        timestamp: new Date().toISOString(),
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("AWS API Error:", response.status, responseData);
      return {
        statusCode: response.status,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
        },
        body: JSON.stringify({
          error: "Failed to process request",
          details: responseData,
        }),
      };
    }

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Netlify function error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
