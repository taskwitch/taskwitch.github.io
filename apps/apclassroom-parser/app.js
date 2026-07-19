const scoringGuideCss = `
:root {
    --ap-ink: #1f2937;
    --ap-meta: #5b808d;
    --ap-border: #dddddd;
    --ap-code-bg: #f0f0f0;
    --ap-link: #285e8e;
    --ap-heading-accent: brown;
    --ap-quote-border: #666666;
    --ap-correct-bg: #eaf2ea;
    --ap-correct-border: #5b7a5b;
    --ap-wrong-bg: #f7ece7;
    --ap-wrong-border: #a6483a;
    --ap-font: "Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, "Times New Roman", serif;
}
body {
    font-family: var(--ap-font);
    line-height: 1.6;
    color: var(--ap-ink);
    margin: 0;
    padding: 0;
    background-color: #fff;
}
.container {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
}
.header {
    padding: 10px 0 15px;
    margin-bottom: 30px;
    border-bottom: 2px solid var(--ap-ink);
}
h1 {
    font-size: 24px;
    font-weight: normal;
    margin: 0;
    padding: 10px 0;
    color: var(--ap-ink);
}
.header h1 {
    margin-bottom: 0;
}
.important-notice {
    background-color: var(--ap-code-bg);
    border-left: 4px solid var(--ap-quote-border);
    padding: 15px;
    margin-bottom: 25px;
    font-size: 14px;
}
.question {
    margin-bottom: 40px;
    border: 1px solid var(--ap-border);
    border-radius: 3px;
    overflow: hidden;
}
.question-header {
    background-color: var(--ap-code-bg);
    padding: 12px 15px;
    font-weight: normal;
    border-bottom: 1px solid var(--ap-border);
    display: flex;
    justify-content: space-between;
    gap: 16px;
}
.question-content {
    padding: 20px;
    background-color: #fff;
}
.feature,
.passage {
    padding: 20px;
    background-color: #fff;
}
h2 {
    font-size: 18px;
    font-weight: normal;
    color: var(--ap-link);
    margin-top: 30px;
    margin-bottom: 15px;
}
h3 {
    font-size: 16px;
    color: var(--ap-heading-accent);
    margin-top: 20px;
    margin-bottom: 10px;
    font-weight: normal;
}
.options {
    margin-bottom: 20px;
}
.option {
    display: flex;
    margin-bottom: 12px;
    padding: 10px;
    border: 1px solid var(--ap-border);
    border-radius: 3px;
    background-color: var(--ap-code-bg);
}
.option-label {
    font-weight: bold;
    min-width: 30px;
    color: var(--ap-ink);
}
.correct-answer {
    background-color: var(--ap-correct-bg);
    border-left: 4px solid var(--ap-correct-border);
}
.wrong-answer {
    background-color: var(--ap-wrong-bg);
    border-left: 4px solid var(--ap-wrong-border);
}
.statement {
    margin-bottom: 20px;
    line-height: 1.6;
}
list {
    display: block;
    margin: 0;
    padding: 0 0 0 20px;
}
li {
    margin-bottom: 6px;
    position: relative;
    list-style-type: none;
}
li::before {
    content: "•";
    color: var(--ap-heading-accent);
    font-weight: bold;
    display: inline-block;
    width: 1em;
    margin-left: -1em;
}
.footer {
    text-align: center;
    margin-top: 40px;
    padding: 20px;
    font-size: 12px;
    color: var(--ap-meta);
    border-top: 1px dashed var(--ap-border);
}
@media print {
    body {
        font-size: 14px;
    }
}
`;

const readmeHtml = `
<h1>AP Classroom Parser</h1>
<p>Parse your CollegeBoard result page into a scoring guide html.</p>
<p>The tool can be used to parse</p>
<ul>
    <li><code>activity</code> data in AP Classroom</li>
    <li><code>questions</code> data in SAT result page</li>
</ul>
<h2>Features</h2>
<ul>
    <li>Offline caching most of the problem contents (text, images, equations, etc.) for review without login into CollegeBoard</li>
    <li>User friendly navigation features
        <ul>
            <li>Jumping to specific problems by clicking on problem numbers</li>
            <li>Easily navigating back and forth using navigation buttons displayed on the top of each problem</li>
        </ul>
    </li>
    <li>Filtering wrong answers and displaying answer explanations in parsed SAT results
        <ul>
            <li>Use <code>Ctrl + F</code> or <code>Command + F</code> and search for <code>Wrong Answer:</code> to find all problems you made mistakes on.</li>
        </ul>
    </li>
</ul>
<h2>Command Line Arguments</h2>
<p>Access help documents through <code>./get_sg.py --help</code>,</p>
<pre><code>usage: get_sg.py [-h] [--type {quiz,result,sat}] [--title TITLE] [--subset SUBSET] filename

Generate scoring guides with high quality on AP Classroom and SAT students' client-side data package.

positional arguments:
  filename              What's the name (with full directory) of your JSON data?

options:
  -h, --help            show this help message and exit
  --type {quiz,result,sat}
                        Data type: quiz/result page or SAT
  --title TITLE         Customize title for generated scoring guide
  --subset SUBSET       Choose a subset of the questions, eg. {1, 3, 5}</code></pre>
<h2>IMPORTANT Disclaimer</h2>
<p>This tool is intended solely for offline caching of AP Classroom quiz content, to improve accessibility when College Board servers are slow or unresponsive. All generated materials (including but not limited to images, text, and answers) are copyrighted by their respective owners. Retrieved Scoring Guide files are for personal study use only. Do not share, redistribute, or modify them. The developer is not responsible for any consequences resulting from the use of this tool.</p>
`;

const labels = ["A", "B", "C", "D", "E"];
const state = {
    objectUrl: null,
};

const elements = {
    type: document.querySelector("#data-type"),
    subset: document.querySelector("#subset"),
    title: document.querySelector("#title"),
    file: document.querySelector("#json-file"),
    input: document.querySelector("#json-input"),
    generate: document.querySelector("#generate-button"),
    clear: document.querySelector("#clear-button"),
    download: document.querySelector("#download-link"),
    status: document.querySelector("#status"),
    preview: document.querySelector("#preview-frame"),
    guide: document.querySelector("#readme-guide"),
};

elements.guide.innerHTML = readmeHtml;

elements.file.addEventListener("change", async () => {
    const [file] = elements.file.files;
    if (!file) {
        return;
    }

    elements.input.value = await file.text();
    setStatus(`Loaded ${file.name}.`, "success");
});

elements.generate.addEventListener("click", () => {
    try {
        const source = elements.input.value.trim();
        if (!source) {
            throw new Error("Paste JSON or choose a JSON file first.");
        }

        const data = JSON.parse(source);
        const type = elements.type.value;
        const title = elements.title.value.trim();
        const subset = elements.subset.value;
        const result = generateScoringGuide(data, type, title, subset);

        updatePreview(result.html, result.filename);
        const answerNote = result.answers.length ? ` Answers: ${result.answers.join(", ")}.` : "";
        setStatus(`Generated ${result.count} question${result.count === 1 ? "" : "s"}.${answerNote}`, "success");
    } catch (error) {
        setStatus(error.message, "error");
    }
});

elements.clear.addEventListener("click", () => {
    elements.input.value = "";
    elements.title.value = "";
    elements.file.value = "";
    elements.preview.removeAttribute("srcdoc");
    resetDownload();
    setStatus("", "");
});

function generateScoringGuide(data, type, title, subset) {
    if (type === "sat") {
        return generateSatGuide(data, title || "SAT Practice Test", subset);
    }

    if (type === "td") {
        return generateTdGuide(data, subset);
    }

    return generateApGuide(data, type, title);
}

function generateApGuide(data, type, title) {
    const activity = data?.data?.apiActivity;
    if (!activity?.items?.length) {
        throw new Error("This does not look like AP Classroom activity JSON.");
    }

    const questions = activity.items.map((item) => item.questions?.[0]);
    const features = activity.items.map((item) => {
        return item.features?.[0] || { feature_id: -1, type: "Unavailable", content: "Unavailable" };
    });
    const tags = type === "quiz"
        ? Object.values(activity.tags || {})
        : questions.map(() => ["Unavailable"]);
    const activityName = title || activity.questionsApiActivity?.name || "AP Classroom Activity";
    const answers = [];

    const questionsHtml = questions.map((question, index) => {
        const number = index + 1;
        const score = getPath(question, ["validation", "valid_response", "score"], 1);
        const feature = stringifyFeature(features[index]);
        const answer = getApAnswerChoice(question);
        answers.push(answer);

        return `
            <div class="question" id="question-${number}">
                <div class="question-header">
                    <div><span onclick="jump_from(${number})">Question ${number}</span> (<a href="#question-${number - 1}">Previous</a> <a href="#question-${number + 1}">Next</a>)</div>
                    <span class="points">${score} ${score === 1 ? "pt" : "pts"}</span>
                </div>
                <div class="question-content">
                    ${feature ? `<div class="feature">${feature}</div>` : ""}
                    <div class="statement">${question?.stimulus || ""}</div>
                    <h3>Choices</h3>
                    ${stringifyApOptions(question, answer)}
                    <h3>Tags</h3>
                    ${stringifyTags(tags[index] || ["Unavailable"])}
                </div>
            </div>
        `;
    }).join("");

    return {
        html: renderGuide(activityName, questionsHtml),
        filename: `scoring_guide_${escapeFilename(activityName)}.html`,
        answers,
        count: questions.length,
    };
}

function generateSatGuide(data, activityName, subset) {
    if (!Array.isArray(data)) {
        throw new Error("This does not look like College Board SAT JSON.");
    }

    let count = 0;
    const questionsHtml = data.map((section) => {
        const name = (section.id || "Unknown").toLowerCase();
        let questions = (section.items || []).map((item) => ({ item, name }));
        if (subset === "wrong") {
            questions = questions.filter(({ item }) => item.answer?.correct === false);
        }
        questions.sort((left, right) => Number(left.item.displayNumber) - Number(right.item.displayNumber));
        count += questions.length;

        return `<h2>Section: ${name.toUpperCase()}</h2>` + questions.map(({ item }, index) => {
            const number = index + 1;
            const examNumber = Number(item.displayNumber);
            return `
                <div class="question" id="${name}-question-${number}">
                    <div class="question-header">
                        <div><span onclick="jump_from(${number}, '${escapeJs(name)}')">Question ${number}</span> (<a href="#${name}-question-${number - 1}">Previous</a> <a href="#${name}-question-${number + 1}">Next</a>)</div>
                        <span class="points">1 pt</span>
                    </div>
                    ${subset === "wrong" ? `<div>(Question ID in the exam: ${examNumber})</div>` : ""}
                    ${stringifySatQuestion(item)}
                </div>
            `;
        }).join("");
    }).join("");

    return {
        html: renderGuide(activityName, questionsHtml),
        filename: `scoring_guide_${escapeFilename(activityName)}.html`,
        answers: [],
        count,
    };
}

function generateTdGuide(data, subset) {
    const exam = data?.data;
    if (!exam?.sectionModuleList) {
        throw new Error("This does not look like TestDaily SAT JSON.");
    }

    const activityName = subset === "wrong"
        ? `${exam.examName || "TestDaily Practice Test"} Mistakes`
        : exam.examName || "TestDaily Practice Test";
    let count = 0;
    const questionsHtml = exam.sectionModuleList.map((module) => {
        const name = "SAT Practice Module";
        let questions = (module.questionList || []).map((question) => question);
        if (subset === "wrong") {
            questions = questions.filter((question) => question.isRight !== 1);
        }
        count += questions.length;

        return `<h2>${name}</h2>` + questions.map((question, index) => {
            const number = index + 1;
            return `
                <div class="question" id="${name}-question-${number}">
                    <div class="question-header">
                        <div><span onclick="jump_from(${number}, '${escapeJs(name)}')">Question ${number}</span> (<a href="#${name}-question-${number - 1}">Previous</a> <a href="#${name}-question-${number + 1}">Next</a>)</div>
                        <span class="points">1 pt</span>
                    </div>
                    ${stringifyTdQuestion(question)}
                </div>
            `;
        }).join("");
    }).join("");

    return {
        html: renderGuide(activityName, questionsHtml),
        filename: `scoring_guide_${escapeFilename(activityName)}.html`,
        answers: [],
        count,
    };
}

function stringifyApOptions(question, answerChoice) {
    const options = question?.options || [];
    const rows = options.map((option, index) => {
        const letter = labels[index] || String(index + 1);
        const className = letter === answerChoice ? "option correct-answer" : "option";
        return `<div class="${className}"><div class="option-label">${letter}.</div> ${option.label || ""}</div>`;
    }).join("");
    return `<div class="options">${rows}</div>`;
}

function getApAnswerChoice(question) {
    const answerKey = getPath(question, ["validation", "valid_response", "value", 0], null);
    const options = question?.options || [];
    const answerIndex = options.findIndex((option) => option.value === answerKey);
    return labels[answerIndex] || "";
}

function stringifyFeature(feature) {
    if (!feature || feature.feature_id === -1) {
        return "";
    }

    const featureClass = String(feature.type || "").includes("passage") ? "passage" : "feature";
    return `<div class="${featureClass}">${feature.content || ""}</div>`;
}

function stringifyTags(tags) {
    const rows = [...tags, "Important: Question fetched using AP Classroom Parser, do not share!"]
        .map((item) => `<li>${item}</li>`)
        .join("");
    return `<div class="tag-list"><list>${rows}</list></div>`;
}

function stringifySatQuestion(question) {
    const passage = (question.passage?.body || "").replaceAll('<span class="sr-only">blank</span>', "");
    const prompt = question.prompt || "";
    const answer = question.answer || {};
    const wrongAnswer = answer.correct === true ? null : answer.response;

    return `
        <div class="question-content">
            ${passage ? `<div class="feature">${passage}</div>` : ""}
            <div class="statement">${prompt}</div>
            <h3>Choices</h3>
            ${stringifyChoiceMap(answer.choices || {}, answer.correctChoice, wrongAnswer)}
            ${wrongAnswer ? `<h3>Wrong Answer: ${wrongAnswer}</h3>` : ""}
            <div class="rationale">
                <h3>Explanation</h3>
                ${answer.rationale || ""}
            </div>
        </div>
    `;
}

function stringifyTdQuestion(question) {
    const statement = question.questionContent
        ? `${question.questionContent}\n${question.questionStem || ""}`
        : question.questionStem || "";
    const wrongAnswer = getTdWrongAnswer(question);

    return `
        <div class="question-content">
            <div class="statement">${statement}</div>
            <h3>Choices</h3>
            ${stringifyTdOptions(question, wrongAnswer)}
            ${wrongAnswer ? `<h3>Wrong Answer: ${wrongAnswer}</h3>` : ""}
        </div>
    `;
}

function stringifyChoiceMap(choices, correctChoice, wrongAnswer) {
    const rows = Object.keys(choices).map((letter) => {
        let className = "option";
        if (letter === correctChoice) {
            className += " correct-answer";
        }
        if (letter === wrongAnswer) {
            className += " wrong-answer";
        }
        return `<div class="${className}"><div class="option-label">${letter}.</div> ${choices[letter]?.body || ""}</div>`;
    }).join("");
    return `<div class="options">${rows}</div>`;
}

function stringifyTdOptions(question, wrongAnswer) {
    const options = getTdOptions(question.questionOption);
    const rows = Object.keys(options).map((letter) => {
        let className = "option";
        if (letter === question.correctQuestionAnswerStr) {
            className += " correct-answer";
        }
        if (letter === wrongAnswer) {
            className += " wrong-answer";
        }
        return `<div class="${className}"><div class="option-label">${letter}.</div> ${options[letter]}</div>`;
    }).join("");
    return `<div class="options">${rows}</div>`;
}

function getTdOptions(options) {
    if (options === null) {
        return {
            "Fill in Blank": "<ul><li>If you find more than one correct answer, enter only one answer.</li><li>You can enter up to 5 characters for a positive answer and up to 6 characters (including the negative sign) for a negative answer.</li><li>If your answer is a fraction that doesn't fit in the provided space, enter the decimal equivalent.</li><li>If your answer is a decimal that doesn't fit in the provided space, enter it by truncating or rounding at the fourth digit.</li><li>If your answer is a mixed number, enter it as an improper fraction or its decimal equivalent.</li><li>Don't enter symbols such as a percent sign, comma, or dollar sign.</li></ul>",
        };
    }

    return (options || []).reduce((result, option, index) => {
        result[String.fromCharCode(65 + index)] = String(option).slice(6, -4);
        return result;
    }, {});
}

function getTdWrongAnswer(question) {
    const studentAnswer = question.studentQuestionAnswerStr || "";
    if (studentAnswer.includes("; Incorrect")) {
        return studentAnswer.split(";")[0];
    }
    return null;
}

function renderGuide(activityName, questionsHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scoring Guide for ${escapeHtml(activityName)}</title>
    <style>${scoringGuideCss}</style>
    <script>
        const jump_from = (src, section = "") => {
            const question_number = prompt("Enter question #", src);
            if (section.length > 1) {
                section += "-";
            }
            window.location.href = "#" + section + "question-" + question_number;
        };
    <\/script>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>Scoring Guide for ${escapeHtml(activityName)}</h1>
    </div>
    <div class="important-notice">
        Unofficial scoring guide generated by AP Classroom Parser.
    </div>
    ${questionsHtml}
    <div class="footer">
        College Board | AP Classroom Scoring Guide (fetched by AP Classroom Parser)
    </div>
</div>
</body>
</html>`;
}

function updatePreview(html, filename) {
    elements.preview.srcdoc = html;
    resetDownload();
    state.objectUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    elements.download.href = state.objectUrl;
    elements.download.download = filename;
    elements.download.classList.remove("disabled");
    elements.download.removeAttribute("aria-disabled");
}

function resetDownload() {
    if (state.objectUrl) {
        URL.revokeObjectURL(state.objectUrl);
        state.objectUrl = null;
    }
    elements.download.removeAttribute("href");
    elements.download.classList.add("disabled");
    elements.download.setAttribute("aria-disabled", "true");
}

function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = `status ${type || ""}`;
}

function getPath(object, path, fallback) {
    let current = object;
    for (const key of path) {
        if (current == null) {
            return fallback;
        }
        current = current[key];
    }
    return current == null ? fallback : current;
}

function escapeFilename(name) {
    return String(name).replaceAll(" ", "_").replace(/[^\w.-]/g, "_");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(value) {
    return String(value).replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}
