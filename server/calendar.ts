import { CalendarEvent } from '../src/types';

const MONTH_MAP: { [key: string]: number } = {
  januari: 0, january: 0,
  februari: 1, february: 1,
  maret: 2, march: 2,
  april: 3,
  mei: 4, may: 4,
  juni: 5, june: 5,
  juli: 6, july: 6,
  agustus: 7, august: 7,
  september: 8,
  oktober: 9, october: 9,
  november: 10,
  desember: 11, december: 11
};

export function parseCalendarDateRange(tanggal: string, bulan: string, year: number = 2026): { startDays: number[], endDays: number[], month: number } {
  const cleanBulan = bulan.toLowerCase().trim();
  const monthIdx = MONTH_MAP[cleanBulan] !== undefined ? MONTH_MAP[cleanBulan] : -1;
  
  if (monthIdx === -1) {
    return { startDays: [], endDays: [], month: -1 };
  }

  // Parse tanggal like "1 - 3" or "10" or " 1 - 3 "
  const rangeMatch = tanggal.replace(/\s+/g, '').match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return {
      startDays: [parseInt(rangeMatch[1], 10)],
      endDays: [parseInt(rangeMatch[2], 10)],
      month: monthIdx
    };
  }

  const singleMatch = tanggal.trim().match(/^(\d+)$/);
  if (singleMatch) {
    const day = parseInt(singleMatch[1], 10);
    return {
      startDays: [day],
      endDays: [day],
      month: monthIdx
    };
  }

  // Fallback if formatting is irregular, try to extract all numbers
  const numbers = tanggal.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    return {
      startDays: [parseInt(numbers[0], 10)],
      endDays: [parseInt(numbers[numbers.length - 1], 10)],
      month: monthIdx
    };
  } else if (numbers && numbers.length === 1) {
    return {
      startDays: [parseInt(numbers[0], 10)],
      endDays: [parseInt(numbers[0], 10)],
      month: monthIdx
    };
  }

  return { startDays: [], endDays: [], month: monthIdx };
}

export function evaluateSchoolStatus(events: CalendarEvent[], targetDate: Date = new Date()): { status: 'LIBUR' | 'WFH' | 'NORMAL'; activeEvent?: CalendarEvent } {
  const currentMonth = targetDate.getMonth();
  const currentDay = targetDate.getDate();
  const currentYear = targetDate.getFullYear();

  for (const event of events) {
    const { startDays, endDays, month } = parseCalendarDateRange(event.tanggal, event.bulan, currentYear);
    if (month === currentMonth && startDays.length > 0) {
      const start = startDays[0];
      const end = endDays[0];
      if (currentDay >= start && currentDay <= end) {
        const desc = event.kegiatan_lower || event.kegiatan.toLowerCase();
        if (desc.includes('libur')) {
          return { status: 'LIBUR', activeEvent: event };
        }
        if (desc.includes('wfh')) {
          return { status: 'WFH', activeEvent: event };
        }
      }
    }
  }

  return { status: 'NORMAL' };
}
