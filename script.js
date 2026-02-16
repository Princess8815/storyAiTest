const subtitle = "Two story-driven journeys unfold here: one fictional, one autobiographical—both carrying heartbreak, courage, and the right to be fully seen.";
const typedLine = document.getElementById("typedLine");
const progress = document.getElementById("readProgress");
const revealItems = document.querySelectorAll(".reveal");

const startReading = document.getElementById("startReading");
const pauseReading = document.getElementById("pauseReading");
const resumeReading = document.getElementById("resumeReading");
const stopReading = document.getElementById("stopReading");
const rateControl = document.getElementById("rateControl");
const voiceSelect = document.getElementById("voiceSelect");
const readerStatus = document.getElementById("readerStatus");
const storyRoot = document.getElementById("storyRoot");

let index = 0;
let isStopped = false;
let voices = [];

const emotionProfiles = {
  gentle: { rate: 0.95, pitch: 1.1 },
  pain: { rate: 0.88, pitch: 0.9 },
  steady: { rate: 1.0, pitch: 1.0 },
  hopeful: { rate: 1.06, pitch: 1.15 },
};

function typeText() {
  if (index <= subtitle.length) {
    typedLine.textContent = subtitle.slice(0, index);
    index += 1;
    setTimeout(typeText, 20);
  }
}

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = docHeight > 0 ? scrollTop / docHeight : 0;
  progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

function getStorySegments() {
  const segmentNodes = storyRoot.querySelectorAll(".story-group, .chapter, .timeline");
  const segments = [];

  segmentNodes.forEach((node) => {
    const emotion = node.dataset.emotion || "steady";
    const title = node.querySelector("h2")?.textContent?.trim();
    if (title) {
      segments.push({ text: title, emotion });
    }

    const blocks = node.querySelectorAll("p, li");
    blocks.forEach((block) => {
      const text = block.textContent.replace(/\s+/g, " ").trim();
      if (text.length > 0) {
        segments.push({ text, emotion });
      }
    });
  });

  return segments;
}

function fillVoiceList() {
  voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = "";

  voices.forEach((voice, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = `${voice.name} (${voice.lang})`;
    if (/en/i.test(voice.lang) && !voiceSelect.dataset.selectedOnce) {
      option.selected = true;
      voiceSelect.dataset.selectedOnce = "true";
    }
    voiceSelect.appendChild(option);
  });

  if (!voiceSelect.value && voices.length > 0) {
    voiceSelect.value = "0";
  }
}

function createUtterance(segment, idx, total) {
  const utterance = new SpeechSynthesisUtterance(segment.text);
  const selectedVoice = voices[Number(voiceSelect.value)] || null;
  const profile = emotionProfiles[segment.emotion] || emotionProfiles.steady;
  const userRate = Number(rateControl.value);

  utterance.voice = selectedVoice;
  utterance.lang = selectedVoice?.lang || "en-US";
  utterance.rate = Math.min(Math.max(profile.rate * userRate, 0.75), 1.35);
  utterance.pitch = profile.pitch;
  utterance.volume = 1;

  utterance.onstart = () => {
    readerStatus.textContent = `Reading ${idx + 1} of ${total}…`;
  };

  utterance.onend = () => {
    if (idx === total - 1 && !isStopped) {
      readerStatus.textContent = "Finished reading the selected stories.";
    }
  };

  utterance.onerror = () => {
    readerStatus.textContent = "Speech reader hit an error. Please try another voice.";
  };

  return utterance;
}

function startStoryReading() {
  if (!("speechSynthesis" in window)) {
    readerStatus.textContent = "Speech synthesis is not supported in this browser.";
    return;
  }

  window.speechSynthesis.cancel();
  isStopped = false;
  const segments = getStorySegments();

  if (segments.length === 0) {
    readerStatus.textContent = "No readable story text found.";
    return;
  }

  readerStatus.textContent = "Starting narration…";
  segments.forEach((segment, idx) => {
    window.speechSynthesis.speak(createUtterance(segment, idx, segments.length));
  });
}

function stopStoryReading() {
  isStopped = true;
  window.speechSynthesis.cancel();
  readerStatus.textContent = "Reading stopped.";
}

startReading.addEventListener("click", startStoryReading);
pauseReading.addEventListener("click", () => {
  window.speechSynthesis.pause();
  readerStatus.textContent = "Reading paused.";
});
resumeReading.addEventListener("click", () => {
  window.speechSynthesis.resume();
  readerStatus.textContent = "Reading resumed.";
});
stopReading.addEventListener("click", stopStoryReading);

revealItems.forEach((item) => observer.observe(item));
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
window.speechSynthesis.onvoiceschanged = fillVoiceList;

fillVoiceList();
typeText();
updateProgress();
