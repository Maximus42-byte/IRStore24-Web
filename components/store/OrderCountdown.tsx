"use client";

import { useEffect, useState } from "react";

import styles from "../../app/account/orders/[order_number]/page.module.css";

type OrderCountdownProps = {
  expiresAt: string;
};

type RemainingTime = {
  expired: boolean;
  hours: number;
  minutes: number;
  seconds: number;
};

function calculateRemainingTime(
  expiresAt: string,
): RemainingTime {
  const difference =
    new Date(expiresAt).getTime() - Date.now();

  if (difference <= 0) {
    return {
      expired: true,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };
  }

  const totalSeconds = Math.floor(
    difference / 1000,
  );

  const hours = Math.floor(
    totalSeconds / 3600,
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );

  const seconds =
    totalSeconds % 60;

  return {
    expired: false,
    hours,
    minutes,
    seconds,
  };
}

function pad(value: number) {
  return value
    .toString()
    .padStart(2, "0");
}

export default function OrderCountdown({
  expiresAt,
}: OrderCountdownProps) {
  const [remaining, setRemaining] =
    useState<RemainingTime | null>(null);

  useEffect(() => {
    function updateCountdown() {
      setRemaining(
        calculateRemainingTime(expiresAt),
      );
    }

    updateCountdown();

    const interval = window.setInterval(
      updateCountdown,
      1000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [expiresAt]);

  /*
   * During server rendering and the first client render,
   * render the exact same markup.
   *
   * The real countdown starts only after hydration.
   */
  if (remaining === null) {
    return (
      <div className={styles.countdown}>
        <span className={styles.countdownLabel}>
          زمان باقی‌مانده برای تکمیل خرید
        </span>

        <strong className={styles.countdownTime}>
          --:--:--
        </strong>
      </div>
    );
  }

  if (remaining.expired) {
    return (
      <div className={styles.countdownExpired}>
        زمان Reservation به پایان رسیده است.
      </div>
    );
  }

  return (
    <div className={styles.countdown}>
      <span className={styles.countdownLabel}>
        زمان باقی‌مانده برای تکمیل خرید
      </span>

      <strong className={styles.countdownTime}>
        {pad(remaining.hours)}:
        {pad(remaining.minutes)}:
        {pad(remaining.seconds)}
      </strong>

      <span className={styles.countdownHint}>
        بعد از پایان این زمان سفارش در Backend منقضی
        می‌شود و موجودی رزروشده برمی‌گردد.
      </span>
    </div>
  );
}
