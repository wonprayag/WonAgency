import { SubjectRecord, BatchRecord, User } from "../services/api";

export interface ScheduledClassItem {
  id: string; // unique key e.g. subjectId or subjectId-batchId
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  department: string;
  batchId?: string;
  batchName?: string;
  isBatch: boolean;
  mentor: string;
  mentorId?: string;
  room: string;
  days: string;
  timeSlot: string;
  startTime: string; // 24-hr e.g. "09:00"
  endTime: string;   // 24-hr e.g. "10:00"
  startMinutes: number;
  endMinutes: number;
  status: "LIVE_NOW" | "UPCOMING" | "COMPLETED";
  timeUntilMinutes: number; // positive if upcoming, 0 if live, negative if ended
  isUserEnrolled: boolean;
  isUserMentor: boolean;
}

export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];

/**
 * Checks if a day abbreviation (e.g. "Tue") matches a days string (e.g. "Mon, Tue, Fri" or "Tuesday")
 */
export function dayMatches(daysString?: string, targetDayShort?: string): boolean {
  if (!daysString || !targetDayShort) return false;
  const normalized = daysString.toLowerCase();
  const shortLower = targetDayShort.toLowerCase();

  if (normalized.includes("daily") || normalized.includes("all days") || normalized.includes("everyday")) {
    return true;
  }

  // Check short form
  if (normalized.includes(shortLower)) return true;

  // Check full day form
  const dayIndex = WEEKDAYS_SHORT.findIndex((d) => d.toLowerCase() === shortLower);
  if (dayIndex !== -1) {
    const fullLower = WEEKDAYS_FULL[dayIndex].toLowerCase();
    if (normalized.includes(fullLower)) return true;
  }

  return false;
}

/**
 * Parses time string like "09:30", "9:30 AM", "02:15 PM", "14:00" into minutes from midnight (0 - 1439).
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();

  // Range detection (e.g. "09:00 AM - 10:00 AM" -> extract first time)
  const parts = clean.split(/[-–—]/);
  const target = parts[0].trim();

  // Check for AM/PM
  const isPM = target.includes("PM");
  const isAM = target.includes("AM");
  const numOnly = target.replace(/[^0-9:]/g, "");
  const [hStr, mStr] = numOnly.split(":");
  let hours = parseInt(hStr || "0", 10);
  const minutes = parseInt(mStr || "0", 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + (isNaN(minutes) ? 0 : minutes);
}

/**
 * Extracts end time from a time range string or fallback to start + 60 minutes.
 */
export function parseEndTimeToMinutes(timeStr?: string, defaultDurationMinutes = 60): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();
  const parts = clean.split(/[-–—]/);

  if (parts.length > 1) {
    const endPart = parts[1].trim();
    return parseTimeToMinutes(endPart);
  }

  const startMinutes = parseTimeToMinutes(parts[0]);
  return Math.min(1439, startMinutes + defaultDurationMinutes);
}

/**
 * Converts "09:00" or 540 to formatted 12-hour string "09:00 AM"
 */
export function formatMinutesTo12h(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  const padM = m.toString().padStart(2, "0");
  const padH = displayH.toString().padStart(2, "0");
  return `${padH}:${padM} ${period}`;
}

/**
 * Converts minutes from midnight into formatted 24-hour string "HH:mm"
 */
export function formatMinutesTo24h(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Formats "09:00" (24h) and "10:00" (24h) into "09:00 - 10:00" (24-hour format)
 */
export function formatTimeRange(start24?: string, end24?: string): string {
  if (!start24) return "";
  const startM = parseTimeToMinutes(start24);
  const endM = end24 ? parseTimeToMinutes(end24) : startM + 60;
  return `${formatMinutesTo24h(startM)} - ${formatMinutesTo24h(endM)}`;
}

/**
 * Computes today's classes in real time from live subjects & batches.
 */
export function getTodaySchedule(
  subjects: SubjectRecord[],
  user?: User | null,
  nowDate: Date = new Date()
) {
  const todayDayIndex = nowDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const todayDayCode = WEEKDAYS_SHORT[todayDayIndex]; // "Tue"
  const todayDayFull = WEEKDAYS_FULL[todayDayIndex]; // "Tuesday"
  const currentMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  // Format e.g. "Tuesday, Nov 24"
  const formattedToday = nowDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const todayDateISO = nowDate.toISOString().split("T")[0];

  const todayClasses: ScheduledClassItem[] = [];

  for (const sub of subjects) {
    if (sub.status === "INACTIVE") continue;

    const isMentorForSub = Boolean(
      user &&
        (user.role === "SUPER_ADMIN" ||
          user.role === "ADMIN" ||
          sub.mentorId === user.id ||
          sub.mentor === user.name)
    );

    const isStudentEnrolledInSub = Boolean(
      user &&
        sub.enrolledMembers &&
        sub.enrolledMembers.some((m) => m.userId === user.id)
    );

    // CASE 1: Subject has batches
    if (sub.hasBatches && sub.batches && sub.batches.length > 0) {
      for (const batch of sub.batches) {
        if (batch.status === "INACTIVE") continue;

        const batchDays = batch.schedule?.days || sub.days;
        if (!dayMatches(batchDays, todayDayCode)) continue;

        const isUserInBatch = Boolean(
          user && batch.memberIds && batch.memberIds.includes(user.id)
        );

        const isBatchMentor = Boolean(
          user &&
            (isMentorForSub ||
              batch.mentorId === user.id ||
              batch.mentorName === user.name)
        );

        // If user is regular member, only show if they are assigned to this batch
        if (user && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && !isBatchMentor && !isUserInBatch) {
          continue;
        }

        const startM = batch.schedule?.startTime
          ? parseTimeToMinutes(batch.schedule.startTime)
          : parseTimeToMinutes(batch.schedule?.timeSlot || sub.timeSlot);

        const endM = batch.schedule?.endTime
          ? parseTimeToMinutes(batch.schedule.endTime)
          : parseEndTimeToMinutes(batch.schedule?.timeSlot || sub.timeSlot);

        let status: "LIVE_NOW" | "UPCOMING" | "COMPLETED" = "UPCOMING";
        if (currentMinutes >= startM && currentMinutes <= endM) {
          status = "LIVE_NOW";
        } else if (currentMinutes > endM) {
          status = "COMPLETED";
        }

        const timeUntilMinutes = status === "LIVE_NOW" ? 0 : startM - currentMinutes;

        todayClasses.push({
          id: `${sub._id || sub.id || sub.name}-${batch.id}`,
          subjectId: sub._id || sub.id || sub.name,
          subjectName: sub.name,
          subjectCode: sub.code,
          department: sub.department,
          batchId: batch.id,
          batchName: batch.name,
          isBatch: true,
          mentor: batch.mentorName || sub.mentor,
          mentorId: batch.mentorId || sub.mentorId,
          room: batch.schedule?.room || sub.room || "Room 101",
          days: batchDays,
          timeSlot: batch.schedule?.timeSlot || formatTimeRange(batch.schedule?.startTime, batch.schedule?.endTime) || sub.timeSlot,
          startTime: batch.schedule?.startTime || formatMinutesTo12h(startM),
          endTime: batch.schedule?.endTime || formatMinutesTo12h(endM),
          startMinutes: startM,
          endMinutes: endM,
          status,
          timeUntilMinutes,
          isUserEnrolled: isUserInBatch,
          isUserMentor: isBatchMentor,
        });
      }
    } else {
      // CASE 2: Single Class (no batches)
      if (dayMatches(sub.days, todayDayCode)) {
        // If regular member, check enrollment
        if (user && user.role !== "SUPER_ADMIN" && user.role !== "ADMIN" && !isMentorForSub && !isStudentEnrolledInSub) {
          continue;
        }

        const startM = sub.startTime
          ? parseTimeToMinutes(sub.startTime)
          : parseTimeToMinutes(sub.timeSlot);

        const endM = sub.endTime
          ? parseTimeToMinutes(sub.endTime)
          : parseEndTimeToMinutes(sub.timeSlot);

        let status: "LIVE_NOW" | "UPCOMING" | "COMPLETED" = "UPCOMING";
        if (currentMinutes >= startM && currentMinutes <= endM) {
          status = "LIVE_NOW";
        } else if (currentMinutes > endM) {
          status = "COMPLETED";
        }

        const timeUntilMinutes = status === "LIVE_NOW" ? 0 : startM - currentMinutes;

        todayClasses.push({
          id: sub._id || sub.id || sub.name,
          subjectId: sub._id || sub.id || sub.name,
          subjectName: sub.name,
          subjectCode: sub.code,
          department: sub.department,
          isBatch: false,
          mentor: sub.mentor,
          mentorId: sub.mentorId,
          room: sub.room || "Room 101",
          days: sub.days,
          timeSlot: sub.timeSlot || formatTimeRange(sub.startTime, sub.endTime),
          startTime: sub.startTime || formatMinutesTo12h(startM),
          endTime: sub.endTime || formatMinutesTo12h(endM),
          startMinutes: startM,
          endMinutes: endM,
          status,
          timeUntilMinutes,
          isUserEnrolled: isStudentEnrolledInSub,
          isUserMentor: isMentorForSub,
        });
      }
    }
  }

  // Sort today's classes chronologically
  todayClasses.sort((a, b) => a.startMinutes - b.startMinutes);

  // Active or next upcoming class
  const liveClass = todayClasses.find((c) => c.status === "LIVE_NOW");
  const nextUpcoming = todayClasses.find((c) => c.status === "UPCOMING");
  const lastFinished = todayClasses[todayClasses.length - 1] || null;

  const activeOrNextClass = liveClass || nextUpcoming || lastFinished || null;
  const hasClassesToday = todayClasses.length > 0;

  // Find next upcoming class on another day if no classes today or all completed
  let nextClassOtherDay: {
    subjectName: string;
    day: string;
    timeSlot: string;
    room: string;
    batchName?: string;
  } | null = null;

  if (!hasClassesToday || (todayClasses.every((c) => c.status === "COMPLETED"))) {
    // Scan the next 6 days in order
    for (let offset = 1; offset <= 7; offset++) {
      const nextDayIdx = (todayDayIndex + offset) % 7;
      const nextDayShort = WEEKDAYS_SHORT[nextDayIdx];
      const nextDayFull = WEEKDAYS_FULL[nextDayIdx];

      for (const sub of subjects) {
        if (sub.status === "INACTIVE") continue;

        if (sub.hasBatches && sub.batches && sub.batches.length > 0) {
          for (const b of sub.batches) {
            const bDays = b.schedule?.days || sub.days;
            if (dayMatches(bDays, nextDayShort)) {
              nextClassOtherDay = {
                subjectName: sub.name,
                day: nextDayFull,
                timeSlot: b.schedule?.timeSlot || sub.timeSlot,
                room: b.schedule?.room || sub.room,
                batchName: b.name,
              };
              break;
            }
          }
        } else if (dayMatches(sub.days, nextDayShort)) {
          nextClassOtherDay = {
            subjectName: sub.name,
            day: nextDayFull,
            timeSlot: sub.timeSlot,
            room: sub.room,
          };
          break;
        }
        if (nextClassOtherDay) break;
      }
      if (nextClassOtherDay) break;
    }
  }

  return {
    todayDayCode,
    todayDayFull,
    formattedToday,
    todayDateISO,
    hasClassesToday,
    todayClasses,
    activeOrNextClass,
    nextClassOtherDay,
  };
}
