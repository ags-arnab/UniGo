import React, { useState, useEffect } from 'react';
import { OrderStatus } from '@/models/cafeteria'; // Assuming OrderStatus is exported from models
import { Chip } from "@heroui/chip";
import { Timer } from 'lucide-react';

interface PickupTimerProps {
  readyAt: Date | string | null | undefined;
  status: OrderStatus;
}

const PICKUP_WINDOW_MINUTES = 30;

// Helper function to format remaining seconds into MM:SS
const formatTimeLeft = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const PickupTimer: React.FC<PickupTimerProps> = ({ readyAt, status }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    // Keep timer running if status is 'ready' OR 'partially_delivered' and readyAt is set
    if ((status === 'ready' || status === 'partially_delivered') && readyAt) {
      const readyTime = new Date(readyAt);
      const expiryTime = new Date(readyTime.getTime() + PICKUP_WINDOW_MINUTES * 60 * 1000);

      const updateTimer = () => {
        const now = new Date();
        const remainingMillis = expiryTime.getTime() - now.getTime();

        if (remainingMillis <= 0) {
          setTimeLeft(0);
          if (intervalId) clearInterval(intervalId);
        } else {
          setTimeLeft(remainingMillis / 1000);
        }
      };

      // Initial calculation
      updateTimer();

      // Update every second
      intervalId = setInterval(updateTimer, 1000);

    } else {
      // Reset timer if status is not 'ready' or readyAt is missing
      setTimeLeft(null);
    }

    // Cleanup function to clear interval on unmount or prop change
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [readyAt, status]); // Rerun effect if readyAt or status changes

  // Don't render anything if timer isn't applicable or has expired
  if (timeLeft === null || timeLeft <= 0) {
    return null;
  }

  // Determine chip color based on time left (e.g., warning when under 5 mins)
  const chipColor = timeLeft < 5 * 60 ? "warning" : "success";

  return (
    <div className="mt-2">
      <Chip
        color={chipColor}
        variant="flat"
        size="sm"
        startContent={<Timer size={14} className="mr-1" />}
      >
        Pickup within: {formatTimeLeft(timeLeft)}
      </Chip>
    </div>
  );
};

export default PickupTimer;
