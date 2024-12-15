export const sendTelegramMessage = async (message: string): Promise<void> => {
  try {
    const response = await fetch(
      "https://namada-telegram-api-service.vercel.app/api/telegram",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to send Telegram notification: ${JSON.stringify(errorData)}`
      );
    }
  } catch (error) {
    console.error("Error sending Telegram notification:", error);
    throw error;
  }
};
