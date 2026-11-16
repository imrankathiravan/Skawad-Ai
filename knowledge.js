/* Public facts only. Update the source page/data.js before adding school facts here.
   eventId links reviewed overlapping records; it does not verify that an event occurred. */
function schoolDateRange(value) {
    const months = ["januari", "februari", "mac", "april", "mei", "jun", "julai", "ogos", "september", "oktober", "november", "disember"];
    const match = String(value).trim().toLowerCase().match(/^(\d{1,2})(?:\s*(?:[-–—]|hingga)\s*(\d{1,2}))?\s+([a-z]+)\s+(\d{4})$/);
    if (!match) return null;
    const month = months.indexOf(match[3]);
    const year = Number(match[4]), first = Number(match[1]), last = Number(match[2] || match[1]);
    const valid = day => month >= 0 && day >= 1 && new Date(Date.UTC(year, month, day)).getUTCMonth() === month;
    if (!valid(first) || !valid(last) || first > last) return null;
    const iso = day => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { start: iso(first), end: iso(last) };
}

function schoolAnnouncementGroups(items) {
    const groups = new Map();
    const clean = value => String(value).normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
    for (const item of items) {
        const dates = schoolDateRange(item.date);
        const period = dates ? dates.start + "/" + dates.end : clean(item.date);
        // Same dates alone never prove that two different activities are one event.
        const identity = item.eventId ? "event:" + item.eventId : "text:" + clean(item.title) + "/" + clean(item.message);
        const key = identity + "/" + period;
        if (!groups.has(key)) groups.set(key, { ...item, dates, isEvent: !!item.eventId });
    }
    return Array.from(groups.values());
}

const schoolKnowledge = {
    school: { source: "index.html", name: schoolData.schoolName, shortName: schoolData.shortName },
    academic: {
        source: "akademik.html",
        years: [1, 2, 3, 4, 5, 6].map(year => ({ year, level: year <= 3 ? 1 : 2,
            page: year === 2 ? "tahun2.html" : null })),
        lesson: { source: "bm-tahun2.html", year: 2, subject: "Bahasa Melayu",
            topic: "Kata Nama Am", definition: "Kata nama am ialah perkataan yang digunakan untuk menamakan orang, haiwan, tempat dan benda secara umum.",
            examples: "guru, kucing, sekolah, buku", homework: null },
        subjects: ["Bahasa Melayu", "English", "Bahasa Tamil", "Pendidikan Muzik", "Matematik", "Sains", "Pendidikan Islam", "Pendidikan Moral", "Pendidikan Seni Visual", "Pendidikan Jasmani"]
    },
    cocurricular: { source: "data.js", announcements: schoolData.announcements.filter(item => /perkhemahan/i.test(item.title)) },
    pdpr: { source: null, details: null },
    calendar: { source: "data.js", fullCalendar: null },
    announcements: { source: "data.js", items: schoolData.announcements }
};
