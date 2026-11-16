/* Public facts only. Update the source page/data.js before adding school facts here. */
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
