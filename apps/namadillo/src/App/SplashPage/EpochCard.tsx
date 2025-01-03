import { chainStatusAtom } from "atoms/chain";
import { useAtomValue } from "jotai";
import React, { useEffect, useState } from "react";

// Defines the structure of the time breakdown (days, hours, minutes, seconds).
interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Describes the portion of the JSON containing epoch-related info.
interface HeightInfo {
  epoch?: number;
  epochProgress?: string;
  epochEndTime?: string;
}

// Main structure of the fetched JSON chunk.
interface NamadaEventsData {
  heightInfo?: HeightInfo;
}

const SSE_URL = "https://explorer75.org/namada/events-root";
const DEFAULT_TIME_LEFT = "--:--:--";

const EpochCard: React.FC = () => {
  // If you still want to use chainStatus for some fallback:
  const chainStatus = useAtomValue(chainStatusAtom);

  const [epoch, setEpoch] = useState<string>(
    chainStatus?.epoch?.toString() || "-"
  );
  const [timeLeft, setTimeLeft] = useState<string>(DEFAULT_TIME_LEFT);
  const [progress, setProgress] = useState<number>(0);

  // parse an ISO date string into a JS Date
  const parseISOTime = (isoString: string): Date => new Date(isoString);

  // Returns days/hours/mins/secs until futureDate
  const getTimeRemaining = (futureDate: Date): TimeParts => {
    const total = futureDate.getTime() - Date.now();
    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(total / (1000 * 60 * 60 * 24)),
      hours: Math.floor((total / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((total / (1000 * 60)) % 60),
      seconds: Math.floor((total / 1000) % 60),
    };
  };

  // Formats days/hours/mins/secs into a string
  const formatTime = (timeParts: TimeParts): string => {
    const { days, hours, minutes, seconds } = timeParts;
    const dStr = days > 0 ? `${days}d ` : "";
    const hStr = hours < 10 ? `0${hours}` : hours.toString();
    const mStr = minutes < 10 ? `0${minutes}` : minutes.toString();
    const sStr = seconds < 10 ? `0${seconds}` : seconds.toString();
    return `${dStr}${hStr}:${mStr}:${sStr}`;
  };

  useEffect(() => {
    // Create the SSE connection
    const eventSource = new EventSource(SSE_URL);

    eventSource.onmessage = (event) => {
      // Each chunk looks like `data: {"heightInfo":{"epoch":...}}`
      // so event.data is the JSON after the "data: " prefix
      try {
        const data: NamadaEventsData = JSON.parse(event.data);
        const heightInfo = data.heightInfo;
        if (heightInfo) {
          if (heightInfo.epoch !== undefined) {
            setEpoch(heightInfo.epoch.toString());
          }
          if (heightInfo.epochEndTime && heightInfo.epochProgress) {
            // Calculate time left
            const endDate = parseISOTime(heightInfo.epochEndTime);
            const remainingParts = getTimeRemaining(endDate);
            setTimeLeft(formatTime(remainingParts));

            // epochProgress might be something like "83.2"—just store it as a number
            const progressVal = parseFloat(heightInfo.epochProgress);
            setProgress(isNaN(progressVal) ? 0 : progressVal);
          }
        }
      } catch (err) {
        console.error("Error parsing SSE chunk:", err);
      }
    };

    eventSource.onerror = (err) => {
      // This will fire if there's an error with the SSE stream
      console.error("SSE error:", err);
    };

    // Cleanup: close stream on unmount
    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="p-6 bg-[#261b51] border-4 border-[#3f65a3] rounded-lg max-w-sm">
      <h2 className="text-xl font-semibold text-[#3f65a3]">Current Epoch</h2>

      {timeLeft !== DEFAULT_TIME_LEFT && (
        <>
          <div className="flex justify-between">
            <p className="text-3xl font-bold text-[#48b9d2] mt-4">{epoch}</p>
            <div className="mt-4 text-white">
              <p className="text-lg font-semibold">Next Epoch:</p>
              <p className="text-2xl font-semibold">{timeLeft}</p>
            </div>
          </div>
          <div className="relative w-full h-3 bg-[#3f65a3] rounded-md mt-4">
            <div
              className="absolute h-3 bg-[#48b9d2] rounded-md transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-white mt-2 text-right">
            {progress.toFixed(1)}% Complete
          </p>
        </>
      )}
    </div>
  );
};

export default EpochCard;
