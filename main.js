/* Configuration */
const SHEET_ID = "1pMFnTJJiDN3AYKNAP3NEHNXnl2UXPLl5gdEIZR-SA3s";
const SHEET_EXPORT_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const SHEET_GVIZ_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
const FALLBACK_SAMPLE_URL = "./sample_excel_file.txt";
const CARDS_PER_PAGE = 12;

/* State */
let rows = [];
let currentPage = 0;
let totalPages = 1;

/* Elements */
const tocListEl = document.getElementById("toc-list");
const btnShowCards = document.getElementById("btn-show-cards");
const cardsSection = document.getElementById("cards-section");
const tocSection = document.getElementById("toc-section");
const cardsGridEl = document.getElementById("cards-grid");
const prevPageBtn = document.getElementById("prev-page");
const nextPageBtn = document.getElementById("next-page");
const pageIndicatorEl = document.getElementById("page-indicator");
const backToTocLink = document.getElementById("back-to-toc");

/* Utilities */
function withTimeout(promise, ms) {
	return new Promise((resolve, reject) => {
		const t = setTimeout(() => reject(new Error("timeout")), ms);
		promise.then((v) => {
			clearTimeout(t);
			resolve(v);
		}).catch((e) => {
			clearTimeout(t);
			reject(e);
		});
	});
}

async function fetchText(url) {
	const res = await withTimeout(fetch(url, { credentials: "omit", cache: "no-store" }), 10000);
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.text();
}

function detectDelimiter(headerLine) {
	// Prefer ' | ' if present in sample format
	if (headerLine.includes(" | ")) return "pipe";
	return "csv";
}

function parsePipeSeparated(text) {
	const lines = text.split(/\r?\n/).filter(Boolean);
	const rowsLocal = [];
	if (lines.length === 0) return rowsLocal;
	const header = lines[0].split(" | ").map((s) => s.trim());
	for (let i = 1; i < lines.length; i++) {
		const parts = lines[i].split(" | ").map((s) => s.trim());
		const record = {};
		header.forEach((h, idx) => {
			record[h] = parts[idx] ?? "";
		});
		rowsLocal.push(record);
	}
	return rowsLocal;
}

function parseCsv(text) {
	// Minimal CSV parser supporting quoted fields with commas and newlines
	const out = [];
	let row = [];
	let field = "";
	let i = 0;
	let inQuotes = false;
	while (i < text.length) {
		const c = text[i];
		if (inQuotes) {
			if (c === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				} else {
					inQuotes = false;
					i++;
					continue;
				}
			} else {
				field += c;
				i++;
				continue;
			}
		} else {
			if (c === '"') {
				inQuotes = true;
				i++;
				continue;
			}
			if (c === ",") {
				row.push(field);
				field = "";
				i++;
				continue;
			}
			if (c === "\n") {
				row.push(field);
				out.push(row);
				row = [];
				field = "";
				i++;
				continue;
			}
			if (c === "\r") {
				i++;
				continue;
			}
			field += c;
			i++;
		}
	}
	// Last field
	row.push(field);
	out.push(row);
	// Convert to objects using header row
	if (out.length === 0) return [];
	const headers = out[0].map((h) => h.trim());
	const objects = [];
	for (let r = 1; r < out.length; r++) {
		const rec = {};
		const arr = out[r];
		headers.forEach((h, idx) => {
			rec[h] = (arr[idx] ?? "").trim();
		});
		objects.push(rec);
	}
	return objects;
}

function normalizeKey(key) {
	return key.toLowerCase().replace(/\s+/g, " ").trim();
}

function valueFrom(record, candidates) {
	for (const cand of candidates) {
		for (const k of Object.keys(record)) {
			if (normalizeKey(k) === normalizeKey(cand)) {
				return record[k];
			}
		}
	}
	return "";
}

function buildPerson(record, index) {
	const nameLocal = valueFrom(record, ["Name", "Name (한글 for SNU, 漢字 for UT)", "Name (한글 for SNU, 漢字 for UT) "]);
	const nameRoman = valueFrom(record, ["Name (Roman)", "Romanized Name", "English name", "Name (roman)"]);
	const photo = valueFrom(record, ["Photo", "Upload your photo!", "Profile Photo", "Image"]);
	const birthdate = valueFrom(record, ["Birthdate", "Date of Birth", "DOB"]);
	const major = valueFrom(record, ["Major", "Department"]);
	const grade = valueFrom(record, ["Grade", "Year"]);
	const years = valueFrom(record, ["Years of Kendo Experience", "Kendo Experience (years)", "Kendo years"]);
	const hobbies = valueFrom(record, ["Hobbies & Interests", "Hobbies", "Interests"]);
	const skills = valueFrom(record, ["What are you good at other than Kendo", "Skills other than Kendo"]);
	const greeting = valueFrom(record, ["Short greeting message", "Greeting", "Message"]);

	// ID slug
	const slugBase = (nameRoman || nameLocal || `member-${index + 1}`)
		.toString()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
	const id = `card-${String(index + 1).padStart(2, "0")}-${slugBase || "member"}`;

	return {
		id,
		index,
		nameLocal,
		nameRoman,
		photo,
		birthdate,
		major,
		grade,
		years,
		hobbies,
		skills,
		greeting
	};
}

function initialsFrom(nameLocal, nameRoman) {
	const src = (nameRoman || nameLocal || "").trim();
	if (!src) return "👤";
	const parts = src.split(/\s+/).filter(Boolean);
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Rendering */
function renderToc(items) {
	tocListEl.innerHTML = "";
	for (const person of items) {
		const li = document.createElement("li");
		const a = document.createElement("a");
		a.className = "toc-link";
		a.href = `#${person.id}`;
		a.dataset.index = String(person.index);
		const badge = document.createElement("span");
		badge.className = "toc-index";
		badge.textContent = String(person.index + 1);
		const label = document.createElement("span");
		label.textContent = person.nameLocal || person.nameRoman || `Member ${person.index + 1}`;
		a.appendChild(badge);
		a.appendChild(label);
		a.addEventListener("click", (ev) => {
			ev.preventDefault();
			navigateToCard(person.index, person.id);
		});
		li.appendChild(a);
		tocListEl.appendChild(li);
	}
}

function renderCardsPage(items) {
	cardsGridEl.innerHTML = "";
	const start = currentPage * CARDS_PER_PAGE;
	const end = Math.min(items.length, start + CARDS_PER_PAGE);
	for (let i = start; i < end; i++) {
		const p = items[i];
		const card = document.createElement("article");
		card.className = "card";
		card.id = p.id;

		// Photo banner (full width)
		const photoBox = document.createElement("div");
		photoBox.className = "card-photo";
		if (p.photo) {
			const img = document.createElement("img");
			img.alt = (p.nameRoman || p.nameLocal || "Photo");
			img.referrerPolicy = "no-referrer";
			img.src = p.photo;
			photoBox.appendChild(img);
		} else {
			photoBox.textContent = initialsFrom(p.nameLocal, p.nameRoman);
		}

		const header = document.createElement("div");
		header.className = "card-header";

		const titleBox = document.createElement("div");
		const h3 = document.createElement("h3");
		h3.className = "card-title";
		h3.textContent = p.nameLocal || p.nameRoman || `Member ${p.index + 1}`;
		const sub = document.createElement("div");
		sub.className = "card-subtitle";
		sub.textContent = p.nameRoman && p.nameRoman !== p.nameLocal ? p.nameRoman : "";

		titleBox.appendChild(h3);
		if (sub.textContent) titleBox.appendChild(sub);

		header.appendChild(titleBox);

		const body = document.createElement("div");
		body.className = "card-body";
		const dl = document.createElement("dl");
		dl.className = "kv";

		function addKV(label, value) {
			if (!value) return;
			const dt = document.createElement("dt");
			dt.textContent = label;
			const dd = document.createElement("dd");
			dd.textContent = value;
			dl.appendChild(dt);
			dl.appendChild(dd);
		}

		addKV("Birthdate", p.birthdate);
		addKV("Major", p.major);
		addKV("Grade", p.grade);
		addKV("Kendo Exp.", p.years);
		addKV("Hobbies", p.hobbies);
		addKV("Other Skills", p.skills);

		body.appendChild(dl);

		if (p.greeting) {
			const greet = document.createElement("div");
			greet.className = "greeting";
			greet.textContent = p.greeting;
			body.appendChild(greet);
		}

		card.appendChild(photoBox);
		card.appendChild(header);
		card.appendChild(body);
		cardsGridEl.appendChild(card);
	}
	updatePager();
}

function updatePager() {
	pageIndicatorEl.textContent = `Page ${currentPage + 1} / ${totalPages}`;
	prevPageBtn.disabled = currentPage <= 0;
	nextPageBtn.disabled = currentPage >= totalPages - 1;
}

function showCardsSection() {
	cardsSection.classList.remove("hidden");
	tocSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideCardsSection() {
	cardsSection.classList.add("hidden");
}

function navigateToCard(index, id) {
	currentPage = Math.floor(index / CARDS_PER_PAGE);
	renderCardsPage(rows);
	showCardsSection();
	// After render, scroll to specific card
	requestAnimationFrame(() => {
		const el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
		// Update hash for shareability
		history.pushState(null, "", `#${id}`);
	});
}

/* Data loading */
async function loadData() {
	try {
		// Try export CSV first
		const text1 = await fetchText(SHEET_EXPORT_CSV_URL);
		const asObjects = parseCsv(text1);
		if (asObjects && asObjects.length > 0) return asObjects;
		throw new Error("Empty CSV from export endpoint");
	} catch (_) {
		// Next try gviz CSV
		try {
			const text2 = await fetchText(SHEET_GVIZ_CSV_URL);
			const asObjects2 = parseCsv(text2);
			if (asObjects2 && asObjects2.length > 0) return asObjects2;
			throw new Error("Empty CSV from gviz endpoint");
		} catch (__ ) {
			// Fallback to sample
			const sampleText = await fetchText(FALLBACK_SAMPLE_URL);
			const mode = detectDelimiter(sampleText.split(/\r?\n/)[0] || "");
			return mode === "pipe" ? parsePipeSeparated(sampleText) : parseCsv(sampleText);
		}
	}
}

/* Events */
btnShowCards.addEventListener("click", () => {
	currentPage = 0;
	renderCardsPage(rows);
	showCardsSection();
	// Reset hash
	history.replaceState(null, "", " ");
});

prevPageBtn.addEventListener("click", () => {
	if (currentPage > 0) {
		currentPage -= 1;
		renderCardsPage(rows);
	}
});

nextPageBtn.addEventListener("click", () => {
	if (currentPage < totalPages - 1) {
		currentPage += 1;
		renderCardsPage(rows);
	}
});

backToTocLink.addEventListener("click", (e) => {
	e.preventDefault();
	window.scrollTo({ top: 0, behavior: "smooth" });
	hideCardsSection();
	history.replaceState(null, "", "#top");
});

window.addEventListener("hashchange", () => {
	const hash = location.hash.replace(/^#/, "");
	if (!hash || hash === "top") return;
	const idx = rows.findIndex((r) => r.id === hash);
	if (idx >= 0) {
		navigateToCard(idx, hash);
	}
});

/* Boot */
(async function init() {
	try {
		const raw = await loadData();
		// Filter out empty rows and map to people
		const withoutTimestamp = raw.map((r) => {
			// Remove columns that label "Timestamp"
			const o = { ...r };
			for (const k of Object.keys(o)) {
				if (normalizeKey(k).startsWith("timestamp")) {
					delete o[k];
				}
			}
			return o;
		});
		const people = withoutTimestamp
			.filter((r) => {
				const name = valueFrom(r, ["Name", "Name (한글 for SNU, 漢字 for UT)", "Name (Roman)"]);
				return String(name || "").trim().length > 0;
			})
			.map((r, i) => buildPerson(r, i));
		rows = people;
		totalPages = Math.max(1, Math.ceil(rows.length / CARDS_PER_PAGE));
		renderToc(rows);
		// If hash targets a specific card on load, navigate there
		const initialHash = location.hash.replace(/^#/, "");
		if (initialHash && initialHash !== "top") {
			const idx = rows.findIndex((r) => r.id === initialHash);
			if (idx >= 0) {
				navigateToCard(idx, initialHash);
				return;
			}
		}
		// Otherwise, stay on TOC
		hideCardsSection();
	} catch (err) {
		console.error("Failed to initialize:", err);
		tocListEl.innerHTML = "<li>Failed to load data. Please try again later.</li>";
	}
})();


