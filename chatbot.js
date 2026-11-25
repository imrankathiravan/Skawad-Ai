/* Deterministic, offline assistant. Conversation state lives only in this page. */
function createSchoolAssistant({ now = () => new Date() } = {}) {
    let context = null;
    let language = "ms";
    const normalize = value => String(value).normalize("NFKC").toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const has = (query, phrases) => phrases.some(phrase => (" " + query + " ").includes(" " + phrase + " "));
    const choose = (ms, en, ta) => language === "en" ? en : language === "ta" ? (ta || ms) : ms;
    const unavailable = () => choose(
        "Maklumat ini belum tersedia dalam sistem SKAWAD AI.",
        "This information is not available in SKAWAD AI.",
        "இந்தத் தகவல் SKAWAD AI அமைப்பில் இன்னும் கிடைக்கவில்லை.");
    const cite = (reply, ...paths) => reply + "\n\n" + choose("Sumber: ", "Source: ", "ஆதாரம்: ") +
        paths.map(path => schoolKnowledge.sources[path]).join(" · ") + ".";
    const today = () => {
        const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now());
        const value = type => parts.find(part => part.type === type).value;
        return `${value("year")}-${value("month")}-${value("day")}`;
    };
    const format = (item, day) => {
        if (!item.isEvent) return choose("Pengumuman pada ", "Announcement dated ", "அறிவிப்பு தேதி ") + item.date + ":\n" + item.title + "\n" + item.message;
        if (!item.dates) return item.title + "\n" + unavailable();
        const dates = language === "ms" ? item.date.replace(/\s*[-–—]\s*/u, " hingga ") : item.date;
        const past = day > item.dates.end;
        const timing = past
            ? choose("Tempoh yang dijadualkan telah berakhir.", "The scheduled period has ended.", "திட்டமிடப்பட்ட காலம் முடிந்துவிட்டது.")
            : day >= item.dates.start
                ? choose("Hari ini dalam tempoh yang dijadualkan.", "Today is within the scheduled period.", "இன்று திட்டமிடப்பட்ட காலத்திற்குள் உள்ளது.")
                : "";
        const introduction = item.title + choose(" dijadualkan berlangsung pada ",
            past ? " was scheduled for " : " is scheduled for ", " திட்டமிடப்பட்ட தேதி: ") + dates + ".";
        return timing ? introduction + "\n" + timing : introduction;
    };
    const announcements = (items, ...sources) => {
        const groups = schoolAnnouncementGroups(items);
        const day = today();
        return groups.length ? cite(groups.map(item => format(item, day)).join("\n\n"), ...sources) : unavailable();
    };
    function answer(question) {
        const q = normalize(question);
        if (!q) return unavailable();
        if (/\p{Script=Tamil}/u.test(q)) language = "ta";
        else if (has(q, ["what", "when", "where", "how", "school name", "school calendar", "announcements", "announcement", "notice", "camping", "camp", "calendar", "academics", "homework", "year", "thanks", "hello", "english", "mathematics", "student", "pupil", "school contact", "school phone", "school email", "school address", "school location", "cocurricular"])) language = "en";
        else if (has(q, ["apa", "bila", "mana", "siapa", "tahun", "pengumuman", "perkhemahan", "kokurikulum", "akademik", "takwim", "pdpr", "terima kasih", "bahasa melayu", "hubungi", "telefon sekolah", "lokasi sekolah"])) language = "ms";
        // Never search for or echo personal records, even when a school topic is mentioned.
        if (has(q, ["murid", "pupil", "student", "students", "மாணவர்", "மாணவர்கள்"]) &&
            has(q, ["alamat", "address", "telefon", "phone", "ic", "markah", "marks", "rekod", "records", "senarai", "list", "kehadiran", "attendance", "வருகை", "தொலைபேசி", "மதிப்பெண்", "முகவரி", "பட்டியல்"])) {
            context = null; return unavailable();
        }
        if (has(q, ["hello", "hi", "hai", "salam", "வணக்கம்"])) return choose("Hai! Saya boleh bantu tentang sekolah, akademik, kokurikulum, PdPR, takwim dan pengumuman.", "Hello! Ask me about the school, academics, cocurricular activities, PdPR, calendar or announcements.", "வணக்கம்! பள்ளி மற்றும் அறிவிப்புகள் பற்றிக் கேளுங்கள்.");
        if (has(q, ["thanks", "thank you", "terima kasih", "நன்றி"])) return choose("Sama-sama!", "You're welcome!", "நன்றி!");
        if (has(q, ["reset", "mula semula", "topik baru"])) { context = null; return choose("Baik, apakah soalan anda?", "What would you like to ask?", "உங்கள் கேள்வி என்ன?"); }
        let topic = null;
        if (has(q, ["pdpr", "home learning", "pembelajaran di rumah"])) topic = "pdpr";
        else if (has(q, ["perkhemahan", "camp", "camping", "kem", "முகாம்"])) topic = "camp";
        else if (has(q, ["takwim", "calendar", "kalendar", "பள்ளி நாட்காட்டி"])) topic = "calendar";
        else if (has(q, ["kokurikulum", "cocurricular", "co curricular", "uniform", "beruniform", "இணைப்பாடச் செயல்பாடுகள்"])) topic = "cocurricular";
        else if (has(q, ["pengumuman", "announcement", "announcements", "notice", "notices", "aktiviti terkini", "அறிவிப்பு", "அறிவிப்புகள்"])) topic = "announcements";
        else if (has(q, ["akademik", "academic", "academics", "tahun", "year", "darjah", "grade", "standard", "homework", "kerja rumah", "kata nama", "nota", "lesson", "latihan", "bahasa melayu", "matematik", "mathematics", "sains", "பாடம்", "ஆண்டு", "வீட்டுப்பாடம்"])) topic = "academic";
        else if (has(q, ["hubungi", "telefon sekolah", "alamat sekolah", "emel sekolah", "school contact",
            "school phone", "school email", "school address", "பள்ளியின் தொலைபேசி", "பள்ளியின் முகவரி"])) topic = "contact";
        else if (has(q, ["nama sekolah", "school name", "name of the school", "skawad itu apa", "what is skawad",
            "info sekolah", "school information", "lokasi sekolah", "di mana sekolah", "school location",
            "where is the school", "பள்ளியின் பெயர்", "பள்ளி பெயர்", "பள்ளி எங்கே", "பள்ளியின் இருப்பிடம்"])) topic = "school";
        const followup = has(q, ["bila", "when", "tarikh", "date", "maklumat lanjut", "tell me more", "more details", "contoh", "examples", "di mana", "where", "pukul", "time", "siapa", "who", "bagaimana", "how", "எப்போது", "எங்கே"])
            || /^(dan |and |what about |bagaimana pula )?(tahun |year )?[1-6]$/.test(q);
        if (!topic && followup && context) topic = context.topic;
        if (!topic) { context = null; return unavailable(); }
        const previous = context;
        context = { topic };
        if (topic === "school") {
            const school = schoolKnowledge.school;
            if (has(q, ["alamat", "address", "contact", "telefon", "phone", "guru besar", "headteacher", "principal",
                "visi", "misi", "vision", "mission", "முகவரி", "தலைமையாசிரியர்"])) return unavailable();
            if (has(q, ["lokasi", "lokasi sekolah", "di mana", "where", "school location", "எங்கே", "பள்ளியின் இருப்பிடம்"])) {
                return school.location ? cite(school.name + choose(" terletak di ", " is in ", " அமைந்துள்ள இடம்: ") + school.location + ".", school.source) : unavailable();
            }
            if (followup && !has(q, ["more details", "maklumat lanjut", "tell me more"])) return unavailable();
            return cite(choose("Nama sekolah ialah ", "The school name is ", "பள்ளியின் பெயர் ") +
                school.name + " (" + school.shortName + ").", school.source);
        }
        if (topic === "pdpr" || topic === "contact") return unavailable();
        if (topic === "camp" || topic === "cocurricular") {
            if (has(q, ["where", "mana", "lokasi", "venue", "pukul", "time", "who", "siapa", "how", "bagaimana", "yuran", "fee", "bawa", "bring", "எங்கே", "இடம்", "நேரம்", "யார்", "கட்டணம்"])) return unavailable();
            const { announcements: items, source } = schoolKnowledge.cocurricular;
            return topic === "camp"
                ? announcements(items, schoolKnowledge.calendar.source, schoolKnowledge.announcements.source)
                : announcements(items, source, schoolKnowledge.announcements.source);
        }
        if (topic === "calendar") {
            if (has(q, ["penuh", "full", "lengkap", "முழு", "exam", "peperiksaan", "தேர்வு"])) return unavailable();
            return announcements(schoolKnowledge.calendar.events, schoolKnowledge.calendar.source);
        }
        if (topic === "announcements") {
            if (followup && !has(q, ["more details", "maklumat lanjut", "tell me more"])) return unavailable();
            return announcements(schoolKnowledge.announcements.items, schoolKnowledge.announcements.source);
        }
        const match = q.match(/(?:tahun|year|darjah|grade|standard|ஆண்டு)\s*([1-6])(?!\d)/) || q.match(/^(?:dan |and |what about |bagaimana pula )?([1-6])$/);
        const year = match ? Number(match[1]) : previous && previous.topic === "academic" ? previous.year : null;
        context.year = year;
        const academic = schoolKnowledge.academic;
        const lesson = academic.lesson;
        if (has(q, ["homework", "kerja rumah", "வீட்டுப்பாடம்"]) || (year && year !== lesson.year)) return unavailable();
        if (has(q, ["matematik", "mathematics", "sains", "science", "english", "tamil", "muzik", "islam", "moral", "seni", "jasmani", "exam", "peperiksaan", "jadual", "schedule", "when", "bila", "tarikh", "date", "where", "mana", "who", "siapa"])) return unavailable();
        if (!year && !has(q, ["kata nama am", "kata nama"])) return cite(choose(
            "Portal Akademik menyenaraikan Tahun 1–6. Bahan yang tersedia ialah Bahasa Melayu Tahun 2: Kata Nama Am. Tahun berapa?",
            "The academic portal lists Years 1–6. Available material: Year 2 Bahasa Melayu, Kata Nama Am. Which year?",
            "ஆண்டு 1–6 பட்டியலிடப்பட்டுள்ளன. ஆண்டு 2 Bahasa Melayu பாடம் உள்ளது. எந்த ஆண்டு?"), academic.source);
        return cite(choose("Bahasa Melayu Tahun 2: ", "Year 2 Bahasa Melayu: ", "ஆண்டு 2 Bahasa Melayu: ") +
            lesson.topic + ".\n" + lesson.definition + choose("\nContoh: ", "\nExamples: ", "\nஎடுத்துக்காட்டுகள்: ") + lesson.examples + ".", lesson.source);
    }
    return { answer };
}

if (typeof document !== "undefined" && document.getElementById("chatForm")) {
    const assistant = createSchoolAssistant();
    const form = document.getElementById("chatForm");
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");
    const suggestions = document.querySelector(".suggested-questions");
    const viewport = window.visualViewport;
    const scrollToLatest = () => { messages.scrollTop = messages.scrollHeight; };

    // On mobile, the keyboard can resize or pan the visual viewport only.
    if (viewport && document.body.classList.contains("chat-page")) {
        function fitConversation() {
            const nearBottom = messages.scrollHeight - messages.clientHeight - messages.scrollTop <= 8;
            document.body.style.setProperty("--chat-viewport-height", viewport.height + "px");
            document.body.style.setProperty("--chat-viewport-top", viewport.offsetTop + "px");
            if (nearBottom) scrollToLatest();
        }
        viewport.addEventListener("resize", fitConversation);
        viewport.addEventListener("scroll", fitConversation);
        window.addEventListener("pageshow", fitConversation);
        fitConversation();
    }

    function addMessage(message, sender) {
        const bubble = document.createElement("div");
        bubble.className = sender === "user" ? "user-message" : "bot-message";
        bubble.textContent = message;
        messages.appendChild(bubble);
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question) return;
        if (suggestions && !suggestions.hidden) {
            if (suggestions.contains(document.activeElement)) input.focus({ preventScroll: true });
            suggestions.hidden = true;
        }
        addMessage(question, "user");
        input.value = "";
        addMessage(assistant.answer(question), "bot");
        scrollToLatest();
    });
    window.askSuggestion = question => { input.value = question; form.requestSubmit(); };
}
