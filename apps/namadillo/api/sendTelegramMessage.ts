import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
): Promise<VercelResponse> {
  if (request.method !== "POST") {
    return response.status(405).json({ message: "Method not allowed" });
  }

  const { message } = request.body;

  if (!message) {
    return response.status(400).json({ message: "Message is required" });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return response
      .status(500)
      .json({ message: "Telegram configuration missing" });
  }

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
        }),
      }
    );

    if (!telegramResponse.ok) {
      throw new Error("Telegram API response was not ok");
    }

    return response
      .status(200)
      .json({ message: "Notification sent successfully" });
  } catch (error) {
    console.error("Error sending telegram message:", error);
    return response
      .status(500)
      .json({ message: "Failed to send notification" });
  }
}
