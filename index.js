document.addEventListener("DOMContentLoaded", function () {
  try {
    if (
      window.location.href === "https://www.neus.world/account/" &&
      window.WP_USER_DOWNLOADS &&
      WP_USER_DOWNLOADS.length > 0
    ) {
      var CONFIG = {
        textThanks:
          "Grazie per aver acquistato l'avventura <br/> <strong>[titolo avventura]</strong>!",
        textContent:
          "Rispondi al sondaggio quando l'hai completata per ricevere la medaglia!",
      };

      let survey = [];
      let surveyCompleted = [];

      // --- STYLE ---
      const insertStyle = () => {
        const style = document.createElement("style");
        style.textContent = `
          .az_surveyContainer{display:flex;flex-direction:row;align-items:center;justify-content:space-between;padding:16px 30px;font-size:14px;border:1px solid #fff;margin-top:10px;border-radius:4px}
          @media screen and (max-width: 1024px){.az_surveyContainer{flex-direction:column;gap:10px}}
          .az_surveyContainer-button{font-size:12px;cursor:pointer}
          @media screen and (max-width: 1024px){.az_surveyContainer-button{width:100%;white-space:normal;margin-top:10px}}
          .az_surveyContainer-text{text-align:center}
          .az_modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:9999}
          .az_modal-overlay.active{display:flex}
          .az_modal-box{position:relative;border:1px solid;background:#000;padding:20px;border-radius:8px;max-width:500px;width:90%;box-shadow:0 4px 12px rgba(0,0,0,.3);text-align:center}
          .az_modal-question{margin-bottom:20px;font-size:16px;display:flex;flex-direction:column;align-items:start}
          .az_modal-options{margin:10px 0;display:flex;flex-direction:column;gap:8px;align-items:flex-start;width:100%}
          .az_modal-actions{margin-top:20px;display:flex;justify-content:space-between}
          .az_modal-actions button{padding:8px 16px;border:none;border-radius:4px;cursor:pointer;background:#0073aa;color:#fff}
          .az_modal-actions button[disabled]{opacity:.5;cursor:not-allowed}
          .az_modal-close{position:absolute;top:15px;right:15px;cursor:pointer;font-size:20px}
          #az_medals_box{display:grid;grid-template-columns:repeat(auto-fill,100px);gap:16px;margin-bottom:20px}
          .az_medal-image{width:60px;height:60px;border-radius:100%}
          .az_medal-box-title{margin-bottom:10px !important; margin-top:20px !important;}
          .az_medal-wrapper{position:relative;display:inline-block;}
          .az_medal-tooltip{visibility:hidden;opacity:0;background:#333;color:#fff;text-align:center;padding:5px 8px;border-radius:4px;position:absolute;bottom:110%;left:50%;transform:translateX(-50%);white-space:nowrap;transition:opacity 0.2s;z-index:1000;font-size:12px;}
          .az_medal-wrapper:hover .az_medal-tooltip{visibility:visible;opacity:1;}
        `;
        document.head.appendChild(style);
      };

      // --- MODALE SURVEY ---
      const buildModal = (sur) => {
        const modalId = `survey-modal-${sur._id}`;
        const overlay = document.createElement("div");
        overlay.className = "az_modal-overlay";
        overlay.id = modalId;

        overlay.innerHTML = `
          <div class="az_modal-box">
            <span class="az_modal-close">&times;</span>
            <div class="az_modal-content"></div>
            <div class="az_modal-actions">
              <button class="az_prev">Indietro</button>
              <button class="az_next">Avanti</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);

        const content = overlay.querySelector(".az_modal-content");
        const btnPrev = overlay.querySelector(".az_prev");
        const btnNext = overlay.querySelector(".az_next");
        const btnClose = overlay.querySelector(".az_modal-close");

        let step = 0;
        let answers = [];

        const renderStep = () => {
          content.innerHTML = "";

          if (step === sur.questions.length) {
            content.innerHTML =
              "<p style='margin-top: 30px;'>Hai completato il sondaggio, vuoi inviare le risposte?</p>";
            btnNext.textContent = "Invia";
            btnPrev.disabled = false;
            return;
          }

          const q = sur.questions[step];
          const qEl = document.createElement("div");
          qEl.className = "az_modal-question";
          qEl.innerHTML = "<p style='width:100%;'>" + q.text + "</p>";

          if (q.type === "multiple") {
            const optWrap = document.createElement("div");
            optWrap.className = "az_modal-options";
            q.options.forEach((opt) => {
              const lbl = document.createElement("label");
              const inp = document.createElement("input");
              inp.type = "radio";
              inp.name = `q_${step}`;
              inp.value = opt;
              if (answers[step] === opt) inp.checked = true;
              inp.addEventListener("change", () => {
                answers[step] = inp.value;
              });
              lbl.appendChild(inp);
              lbl.append(" " + opt);
              optWrap.appendChild(lbl);
            });
            qEl.appendChild(optWrap);
          } else {
            const inp = document.createElement("textarea");
            inp.style.width = "100%";
            inp.style.minHeight = "80px";
            if (answers[step]) inp.value = answers[step];
            inp.addEventListener("input", () => {
              answers[step] = inp.value;
            });
            qEl.appendChild(inp);
          }

          content.appendChild(qEl);
          btnNext.textContent = "Avanti";
          btnPrev.disabled = step === 0;
        };

        btnNext.addEventListener("click", async () => {
          if (step < sur.questions.length) {
            step++;
            renderStep();
          } else {
            const download = (window.WP_USER_DOWNLOADS || []).find(
              (d) => d.product_id === sur.productId
            );
            const titoloAvventura = download
              ? download.product_name
              : `ID ${sur.productId}`;

            // invio risposte a WP REST che fa proxy
            const doc = {
              surveyId: sur._id,
              userId: window.WP_USER_ID || null,
              answers: answers.map((ans, i) => ({
                question: sur.questions[i].text,
                answer: ans || "",
              })),
              productName: titoloAvventura,
              medalImage: sur.medalImage || null,
            };

            try {
              const res = await fetch(AZ_CONFIG.restUrl + "submit", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(doc),
              });
              const json = await res.json();
              if (json.success) {
                overlay.classList.remove("active");
                showThankYouModal(titoloAvventura);
                addMedalToBox(sur.medalImage, titoloAvventura);
              } else {
                alert("⚠️ Errore salvataggio, controlla console");
                console.error(json);
              }
            } catch (err) {
              console.error("Errore invio survey:", err);
            }
          }
        });

        btnPrev.addEventListener("click", () => {
          if (step > 0) {
            step--;
            renderStep();
          }
        });

        btnClose.addEventListener("click", () => {
          overlay.classList.remove("active");
        });

        document
          .querySelector(`#open-survey-${sur._id}`)
          .addEventListener("click", () => {
            overlay.classList.add("active");
            step = 0;
            answers = answers || [];
            renderStep();
          });
      };

      // THANK YOU MODAL
      function showThankYouModal(titoloAvventura) {
        const overlay = document.createElement("div");
        overlay.className = "az_modal-overlay active";
        overlay.innerHTML =
          "<div class='az_modal-box'>" +
          "<span class='az_modal-close'>&times;</span>" +
          "<p>Grazie per aver completato il sondaggio dell'avventura <strong>" +
          titoloAvventura +
          "</strong>!<br/>Ora potrai vedere la tua medaglia nella sezione medaglie!</p>" +
          "</div>";
        document.body.appendChild(overlay);
        overlay
          .querySelector(".az_modal-close")
          .addEventListener("click", () => overlay.remove());
      }

      // MEDALS BOX
      function renderMedalsBox(completed) {
        const targetContainer = document.querySelector(
          ".woocommerce-MyAccount-content"
        );
        if (!targetContainer || !completed.length) return;

        let box = document.getElementById("az_medals_box");
        if (!box) {
          box = document.createElement("div");
          box.id = "az_medals_box";
          targetContainer.appendChild(box);
        }

        box.innerHTML = "";
        box.insertAdjacentHTML(
          "beforebegin",
          "<h3 class='az_medal-box-title'>Le tue medaglie</h3>"
        );

        completed.forEach((comp) => {
          if (!comp.medalImage || !comp.medalImage.asset) return;
          const ref = comp.medalImage.asset._ref.split("-");
          const imgUrl =
            "https://cdn.sanity.io/images/" +
            AZ_CONFIG.projectId +
            "/" +
            AZ_CONFIG.dataset +
            "/" +
            ref[1] +
            "-" +
            ref[2] +
            ".svg";

          const wrapper = document.createElement("div");
          wrapper.classList.add("az_medal-wrapper");

          const img = document.createElement("img");
          img.src = imgUrl;
          img.classList.add("az_medal-image");

          const tooltip = document.createElement("span");
          tooltip.classList.add("az_medal-tooltip");
          tooltip.textContent =
            "Medaglia per " + (comp.productName || "avventura");

          wrapper.appendChild(img);
          wrapper.appendChild(tooltip);
          box.appendChild(wrapper);
        });
      }

      function addMedalToBox(medalImage, productName) {
        if (!medalImage || !medalImage.asset) return;
        const box = document.getElementById("az_medals_box");
        if (!box) return;

        const ref = medalImage.asset._ref.split("-");
        const imgUrl =
          "https://cdn.sanity.io/images/" +
          AZ_CONFIG.projectId +
          "/" +
          AZ_CONFIG.dataset +
          "/" +
          ref[1] +
          "-" +
          ref[2] +
          ".svg";

        const img = document.createElement("img");
        img.src = imgUrl;
        img.title = "Medaglia per " + (productName || "avventura");
        box.appendChild(img);
      }

      // BUILD SURVEY
      const surveyBuild = (sur, target) => {
        insertStyle();
        const download = (window.WP_USER_DOWNLOADS || []).find(
          (d) => d.product_id === sur.productId
        );
        const titoloAvventura = download
          ? download.product_name
          : `ID ${sur.productId}`;
        const textThanks = CONFIG.textThanks.replace(
          "[titolo avventura]",
          titoloAvventura
        );
        const html =
          "<div class='az_surveyContainer'>" +
          "<p class='az_surveyContainer-text'>" +
          textThanks +
          "</p>" +
          "<button id='open-survey-" +
          sur._id +
          "' class='az_surveyContainer-button'>" +
          CONFIG.textContent +
          "</button>" +
          "</div>";
        target.insertAdjacentHTML("beforeend", html);
        buildModal(sur);
      };

      // INIT
      const surveyInit = () => {
        const onAccountPage = /\/account\/?$/.test(window.location.pathname);
        if (Array.isArray(survey) && survey.length > 0 && onAccountPage) {
          const targetContainer = document.querySelector(
            ".woocommerce-MyAccount-content"
          );
          if (targetContainer) {
            const userDownloads = (window.WP_USER_DOWNLOADS || []).map(
              (d) => d.product_id
            );

            let surveysByDownloads = survey.filter((sur) =>
              userDownloads.includes(sur.productId)
            );

            let surveysUpdated = surveysByDownloads.filter((sur) => {
              return !surveyCompleted.some(
                (comp) =>
                  comp.userId === window.WP_USER_ID &&
                  comp.surveyId?.productId === sur.productId
              );
            });

            surveysUpdated.forEach((sur) => {
              surveyBuild(sur, targetContainer);
            });

            console.log("Surveys disponibili per l’utente:", surveysUpdated);
          }
        }
      };

      // FETCH da endpoint WP
      Promise.all([
        fetch(AZ_CONFIG.restUrl + "fetch-surveys").then((r) => r.json()),
        fetch(AZ_CONFIG.restUrl + "fetch-completed?user=" + window.WP_USER_ID).then((r) =>
          r.json()
        ),
      ])
        .then(([s, c]) => {
          survey = Array.isArray(s.result) ? s.result : [];
          surveyCompleted = Array.isArray(c.result) ? c.result : [];
          surveyInit();
          renderMedalsBox(surveyCompleted);
        })
        .catch((e) => console.error("Error fetching survey data:", e));
    }
  } catch (e) {
    console.error("Unexpected error:", e);
  }
});
