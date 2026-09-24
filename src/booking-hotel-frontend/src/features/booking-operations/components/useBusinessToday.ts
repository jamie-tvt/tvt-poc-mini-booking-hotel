"use client";

import { useEffect, useState } from "react";
import { getServerSkewMs } from "@/features/booking/services/serverClock";
import { todayVn } from "@/lib/utils/stay";

/** "Hôm nay" theo đồng hồ nghiệp vụ của backend (có thể bị dời bằng công cụ demo). */
export function useBusinessToday(): string {
  const [today, setToday] = useState(() => todayVn());
  useEffect(() => {
    let alive = true;
    void getServerSkewMs().then((skew) => alive && setToday(todayVn(skew)));
    return () => {
      alive = false;
    };
  }, []);
  return today;
}
