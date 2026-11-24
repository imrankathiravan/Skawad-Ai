/* Deterministic, offline assistant. Conversation state lives only in this page. */
function createSchoolAssistant({ now = () => new Date() } = {}) {
    let context = null;
    let language = "ms";
    const normalize = value => String(value).normalize("NFKC").toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const has = (query, phrases) => phrases.some(phrase => (" " + query + " ").includes(" " + phrase + " "));
    const choose = (ms, en, ta) => language === "en" ? en : language === "ta" ? (ta || ms) : ms;
    const unavailable = () => choose(
        "Maaf, maklumat ini belum tersedia. Sila tanya pihak sekolah untuk kepastian.",
        "Sorry, this information is not available yet. Please check with the school.",
        "மன்னிக்கவும், இந்தத் தகவல் தற்போது கிடைக்கவில்லை. பள்ளியைத் தொடர்பு கொள்ளவும்.");
    const today = () => {
        const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now());
        const value = type => parts.find(part => part.type === type).value;
        return `${value("year")}-${value("month")}-${value("day")}`;
    };
    const confirmation = () => choose("Maklumat ini belum disahkan oleh pihak sekolah. Sila semak dengan pihak sekolah untuk kepastian.", "This information has not been confirmed by the school. Please check with the school.", "இந்தத் தகவல் பள்ளியால் உறுதிப்படுத்தப்படவில்லை. பள்ளியிடம் கேட்டறியவும்.");
    const format = item => {
        if (!item.isEvent) return choose("Pengumuman pada ", "Announcement dated ", "அறிவிப்பு தேதி ") + item.date + ":\n" + item.title + "\n" + item.message;
        let timing = choose("Tarikh aktiviti ini belum dapat dipastikan.", "The event dates are unclear.", "நிகழ்வின் தேதிகள் தெளிவாக இல்லை.");
        if (item.dates) {
            const day = today();
            timing = day > item.dates.end
                ? choose("Tarikh ini sudah berlalu. Pelaksanaan aktiviti ini belum disahkan.", "These dates have passed. We cannot confirm whether the event took place.", "இந்தத் தேதிகள் கடந்துவிட்டன. நிகழ்வு நடந்ததா என்பது உறுதிப்படுத்தப்படவில்லை.")
                : day < item.dates.start
                    ? choose("Tarikh ini akan datang. Sila semak dengan pihak sekolah sama ada rancangan ini masih diteruskan.", "These dates are upcoming. Please check with the school whether the plan is still going ahead.", "இந்தத் தேதிகள் இனி வரவுள்ளன. திட்டத்தைப் பள்ளியிடம் உறுதிசெய்யவும்.")
                    : choose("Hari ini dalam tempoh yang dijadualkan. Sila semak dengan pihak sekolah sama ada aktiviti ini berlangsung.", "Today is within the scheduled dates. Please check with the school whether the event is taking place.", "இன்று திட்டமிட்ட தேதிகளுக்குள் உள்ளது. நிகழ்வைப் பள்ளியிடம் உறுதிசெய்யவும்.");
        }
        return item.title + choose(" dijadualkan pada ", " was scheduled for ", " திட்டமிட்ட தேதி: ") + item.date + ".\n" + timing;
    };
    const announcements = items => {
        const groups = schoolAnnouncementGroups(items);
        return groups.length ? groups.map(format).join("\n\n") + "\n\n" + confirmation() : unavailable();
    };
    function answer(question) {
        const q = normalize(question);
        if (!q) return unavailable();
        if (/\p{Script=Tamil}/u.test(q)) language = "ta";
        else if (has(q, ["what", "when", "where", "how", "school name", "school calendar", "announcements", "announcement", "notice", "camping", "camp", "calendar", "academics", "homework", "year", "thanks", "hello", "english", "mathematics", "student", "pupil"])) language = "en";
        else if (has(q, ["apa", "bila", "mana", "siapa", "tahun", "pengumuman", "perkhemahan", "kokurikulum", "akademik", "takwim", "pdpr", "terima kasih", "bahasa melayu"])) language = "ms";
        // Never search for or echo personal records, even when a school topic is mentioned.
        if (has(q, ["murid", "pupil", "student", "மாணவர்"]) && has(q, ["alamat", "address", "telefon", "phone", "ic", "markah", "marks", "rekod", "records", "senarai", "list"])) {
            context = null; return unavailable();
        }
        if (has(q, ["hello", "hi", "hai", "salam", "வணக்கம்"])) return choose("Hai! Saya boleh bantu tentang sekolah, akademik, kokurikulum, PdPR, takwim dan pengumuman.", "Hello! Ask me about the school, academics, cocurricular activities, PdPR, calendar or announcements.", "வணக்கம்! பள்ளி மற்றும் அறிவிப்புகள் பற்றிக் கேளுங்கள்.");
        if (has(q, ["thanks", "thank you", "terima kasih", "நன்றி"])) return choose("Sama-sama!", "You're welcome!", "நன்றி!");
        if (has(q, ["reset", "mula semula", "topik baru"])) { context = null; return choose("Baik, apakah soalan anda?", "What would you like to ask?", "உங்கள் கேள்வி என்ன?"); }
        let topic = null;
        if (has(q, ["pdpr", "home learning", "pembelajaran di rumah"])) topic = "pdpr";
        else if (has(q, ["perkhemahan", "camp", "camping", "kem", "முகாம்"])) topic = "camp";
        else if (has(q, ["takwim", "calendar", "kalendar", "பள்ளி நாட்காட்டி"])) topic = "calendar";
        else if (has(q, ["kokurikulum", "cocurricular", "co curricular", "uniform", "beruniform"])) topic = "cocurricular";
        else if (has(q, ["pengumuman", "announcement", "announcements", "notice", "notices", "aktiviti terkini", "அறிவிப்பு", "அறிவிப்புகள்"])) topic = "announcements";
        else if (has(q, ["akademik", "academic", "academics", "tahun", "year", "darjah", "grade", "standard", "homework", "kerja rumah", "kata nama", "nota", "lesson", "latihan", "bahasa melayu", "matematik", "mathematics", "sains", "பாடம்"])) topic = "academic";
        else if (has(q, ["nama sekolah", "school name", "name of the school", "skawad itu apa", "what is skawad", "info sekolah", "school information", "பள்ளியின் பெயர்", "பள்ளி பெயர்"])) topic = "school";
        const followup = has(q, ["bila", "when", "tarikh", "date", "maklumat lanjut", "tell me more", "more details", "contoh", "examples", "di mana", "where", "pukul", "time", "siapa", "who", "bagaimana", "how", "எப்போது"])
            || /^(dan |and |what about |bagaimana pula )?(tahun |year )?[1-6]$/.test(q);
        if (!topic && followup && context) topic = context.topic;
        if (!topic) { context = null; return unavailable(); }
        const previous = context;
        context = { topic };
        if (topic === "school") {
            if (has(q, ["alamat", "address", "contact", "telefon", "phone", "guru besar", "headteacher", "principal"]) || (followup && !has(q, ["more details", "maklumat lanjut", "tell me more"]))) return unavailable();
            return choose("Nama sekolah ialah ", "The school name is ", "பள்ளியின் பெயர் ") + schoolKnowledge.school.name + " (SKAWAD).";
        }
        if (topic === "pdpr") return unavailable();
        if (topic === "camp" || topic === "cocurricular") {
            if (has(q, ["where", "mana", "pukul", "time", "who", "siapa", "how", "bagaimana", "yuran", "fee", "bawa", "bring"])) return unavailable();
            return announcements(schoolKnowledge.cocurricular.announcements);
        }
        if (topic === "calendar") return choose("Takwim penuh belum tersedia. Ini maklumat tarikh yang saya ada:\n", "The full calendar is unavailable. Here are the dates I have:\n", "முழு நாட்காட்டி கிடைக்கவில்லை. கிடைக்கும் தேதிகள்:\n") + announcements(schoolKnowledge.announcements.items);
        if (topic === "announcements") {
            if (followup && !has(q, ["more details", "maklumat lanjut", "tell me more"])) return unavailable();
            return announcements(schoolKnowledge.announcements.items);
        }
        const match = q.match(/(?:tahun|year|darjah|grade|standard)\s*([1-6])(?!\d)/) || q.match(/^(?:dan |and |what about |bagaimana pula )?([1-6])$/);
        const year = match ? Number(match[1]) : previous && previous.topic === "academic" ? previous.year : null;
        context.year = year;
        if (year && year !== 2) return choose("Tahun ", "Year ", "ஆண்டு ") + year + choose(": bahan pembelajaran belum tersedia. Anda boleh cuba bahan Bahasa Melayu Tahun 2.", ": learning materials are not available yet. You can try Year 2 Bahasa Melayu instead.", ": பாடங்கள் தற்போது கிடைக்கவில்லை.");
        if (!year) return choose("Portal Akademik menyenaraikan Tahun 1–6. Bahan yang tersedia ialah Bahasa Melayu Tahun 2: Kata Nama Am. Tahun berapa?", "The academic portal lists Years 1–6. Available material: Year 2 Bahasa Melayu, Kata Nama Am. Which year?", "ஆண்டு 1–6 பட்டியலிடப்பட்டுள்ளன. ஆண்டு 2 Bahasa Melayu பாடம் உள்ளது. எந்த ஆண்டு?");
        if (has(q, ["homework", "kerja rumah"])) return choose("Belum ada tugasan Bahasa Melayu Tahun 2 yang diterbitkan. Sila semak dengan guru anda.", "No Year 2 Bahasa Melayu homework has been published. Please check with your teacher.", "ஆண்டு 2 Bahasa Melayu வீட்டுப்பாடம் வெளியிடப்படவில்லை. ஆசிரியரிடம் கேட்டறியவும்.");
        if (has(q, ["matematik", "mathematics", "sains", "science", "english", "tamil", "muzik", "islam", "moral", "seni", "jasmani", "exam", "peperiksaan", "jadual", "schedule", "when", "bila", "tarikh", "date", "where", "mana", "who", "siapa"])) return unavailable();
        return choose("Bahasa Melayu Tahun 2: ", "Year 2 Bahasa Melayu: ", "ஆண்டு 2 Bahasa Melayu: ") + schoolKnowledge.academic.lesson.topic + ".\n" + schoolKnowledge.academic.lesson.definition + choose("\nContoh: ", "\nExamples: ", "\nஎடுத்துக்காட்டுகள்: ") + schoolKnowledge.academic.lesson.examples + ".";
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
