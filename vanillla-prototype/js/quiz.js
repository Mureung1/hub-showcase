/* 2지선다 테스트 공용 렌더러 (취미/생활성향/이상형 테스트에서 재사용) */
function renderQuiz({ questions, totalSteps, resultUrl }) {
  var idx = 0;
  var progressEl = document.getElementById("progress");
  var introTitleEl = document.getElementById("introTitle");
  var introSubEl = document.getElementById("introSub");
  var questionEl = document.getElementById("questionText");
  var gridEl = document.getElementById("choiceGrid");

  function render() {
    var q = questions[idx];
    progressEl.textContent = (idx + 1) + "/" + totalSteps;

    var showIntro = idx === 0;
    introTitleEl.style.display = showIntro ? "" : "none";
    introSubEl.style.display = showIntro ? "" : "none";

    questionEl.textContent = q.q;
    gridEl.innerHTML = "";

    q.options.forEach(function (opt, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-card " + (i === 0 ? "mint" : "peach");
      btn.innerHTML =
        '<span class="choice-icon">' + opt.icon + "</span>" +
        '<span class="choice-label">' + opt.label + "</span>";
      btn.addEventListener("click", function () {
        idx++;
        if (idx >= questions.length) {
          window.location.href = resultUrl;
        } else {
          render();
        }
      });
      gridEl.appendChild(btn);
    });
  }

  render();
}
