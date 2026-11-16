/* Deterministic, offline assistant. Conversation state lives only in this page. */
function createSchoolAssistant() {
    let context = null;
    let language = "ms";
    const normalize = value => String(value).normalize("NFKC").toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
    const has = (query, phrases) => phrases.some(phrase => (" " + query + " ").includes(" " + phrase + " "));
    const choose = (ms, en, ta) => language === "en" ? en : language === "ta" ? (ta || ms) : ms;
    const unavailable = () => choose(
        "Maaf, maklumat ini belum tersedia dalam sumber awam projek. Sila rujuk pihak sekolah untuk pengesahan.",
        "Sorry, this information is not available in the project's public sources. Please check with the school.",
        "மன்னிக்கவும், இந்தத் தகவல் தற்போது கிடைக்கவில்லை. பள்ளியைத் தொடர்பு கொள்ளவும்.");
    const format = item => item.title + "\n" + item.date + "\n" + item.message;
    function answer(question) {
        const q = normalize(question);
        if (!q) return unavailable();
        if (/\p{Script=Tamil}/u.test(q)) language = "ta";
        else if (has(q, ["what", "when", "where", "how", "school name", "school calendar", "announcements", "announcement", "notice", "camping", "camp", "calendar", "academics", "homework", "year", "thanks", "hello", "english", "mathematics", "student", "pupil"])) language = "en";
        else if (has(q, ["apa", "bila", "mana", "siapa", "tahun", "pengumuman", "terima kasih", "bahasa melayu"])) language = "ms";
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
            return choose("Rekod pengumuman projek (bukan pengesahan aktiviti akan datang):\n", "Project announcement record (not confirmation of an upcoming event):\n", "பதிவிலுள்ள அறிவிப்பு:\n") + schoolKnowledge.cocurricular.announcements.map(format).join("\n\n") + "\nSumber: data.js";
        }
        if (topic === "calendar") return choose("Takwim penuh belum tersedia. Tarikh yang direkodkan dalam pengumuman:\n", "The full calendar is unavailable. Dates recorded in announcements:\n", "பதிவிலுள்ள தேதிகள்:\n") + schoolKnowledge.announcements.items.map(item => item.title + ": " + item.date).join("\n") + "\nSumber: data.js";
        if (topic === "announcements") {
            if (followup && !has(q, ["more details", "maklumat lanjut", "tell me more"])) return unavailable();
            return choose("Pengumuman dalam projek; status terkini belum disahkan:\n", "Announcements in the project; current status is unverified:\n", "பதிவிலுள்ள அறிவிப்புகள்:\n") + schoolKnowledge.announcements.items.map(format).join("\n\n") + "\nSumber: data.js";
        }
        const match = q.match(/(?:tahun|year|darjah|grade|standard)\s*([1-6])(?!\d)/) || q.match(/^(?:dan |and |what about |bagaimana pula )?([1-6])$/);
        const year = match ? Number(match[1]) : previous && previous.topic === "academic" ? previous.year : null;
        context.year = year;
        if (year && year !== 2) return choose("Tahun ", "Year ", "ஆண்டு ") + year + choose(" disenaraikan di akademik.html, tetapi halaman dan bahan belum tersedia.", " is listed in akademik.html, but its page and materials are not available.", ": பாடங்கள் தற்போது கிடைக்கவில்லை.");
        if (!year) return choose("Portal Akademik menyenaraikan Tahun 1–6. Bahan yang tersedia ialah Bahasa Melayu Tahun 2: Kata Nama Am. Tahun berapa?", "The academic portal lists Years 1–6. Available material: Year 2 Bahasa Melayu, Kata Nama Am. Which year?", "ஆண்டு 1–6 பட்டியலிடப்பட்டுள்ளன. ஆண்டு 2 Bahasa Melayu பாடம் உள்ளது. எந்த ஆண்டு?");
        if (has(q, ["homework", "kerja rumah"])) return choose("Belum ada tugasan Bahasa Melayu Tahun 2 yang diterbitkan (bm-tahun2.html).", "No Year 2 Bahasa Melayu homework has been published (bm-tahun2.html).", "ஆண்டு 2 Bahasa Melayu வீட்டுப்பாடம் வெளியிடப்படவில்லை.");
        if (has(q, ["matematik", "mathematics", "sains", "science", "english", "tamil", "muzik", "islam", "moral", "seni", "jasmani", "exam", "peperiksaan", "jadual", "schedule", "when", "bila", "tarikh", "date", "where", "mana", "who", "siapa"])) return unavailable();
        return choose("Bahasa Melayu Tahun 2: ", "Year 2 Bahasa Melayu: ", "ஆண்டு 2 Bahasa Melayu: ") + schoolKnowledge.academic.lesson.topic + ".\n" + schoolKnowledge.academic.lesson.definition + "\nContoh: " + schoolKnowledge.academic.lesson.examples + ".\nSumber: bm-tahun2.html (nota dan latihan).";
    }
    return { answer };
}

if (typeof document !== "undefined" && document.getElementById("chatForm")) {
    const assistant = createSchoolAssistant();
    const form = document.getElementById("chatForm");
    const input = document.getElementById("userInput");
    const messages = document.getElementById("chatMessages");
    function addMessage(message, sender) {
        const bubble = document.createElement("div");
        bubble.className = sender === "user" ? "user-message" : "bot-message";
        bubble.textContent = message;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
    }
    form.addEventListener("submit", event => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question) return;
        addMessage(question, "user"); input.value = "";
        addMessage(assistant.answer(question), "bot");
    });
    window.askSuggestion = question => { input.value = question; form.requestSubmit(); };
}
