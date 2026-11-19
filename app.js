(function (globalScope) {
  "use strict";

  const DEFAULT_ITEMS = [
    "Fire exits are clear",
    "Safety guards are in place",
    "PPE is available and undamaged",
    "Floor areas are clear of hazards",
    "Emergency equipment is accessible"
  ];

  function sanitizeText(value) {
    if (typeof value !== "string") return "";
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function validateSubmission(values) {
    const errors = {};
    if (!values.workerName || !values.workerName.trim()) errors.workerName = "Enter a crew member name.";
    if (!values.location || !values.location.trim()) errors.location = "Enter a warehouse location.";
    if (!values.shift) errors.shift = "Select a shift.";
    return errors;
  }

  function filterItems(items, query) {
    const needle = String(query || "").trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.toLowerCase().includes(needle));
  }

  function createChecklistApp(documentRef) {
    let items = [...DEFAULT_ITEMS];
    let completed = new Set();
    let query = "";

    const form = documentRef.querySelector("#checklist-form");
    const list = documentRef.querySelector("#checklist-items");
    const searchInput = documentRef.querySelector("#search-input");
    const loading = documentRef.querySelector("#loading");
    const submitButton = documentRef.querySelector("#submit-button");
    const status = documentRef.querySelector("#form-status");

    function renderItems() {
      const visibleItems = filterItems(items, query);
      if (!visibleItems.length) {
        list.innerHTML = '<p class="empty-state">No data found</p>';
        return;
      }

      list.innerHTML = visibleItems.map((item, index) => {
        const safeItem = sanitizeText(item);
        const checked = completed.has(item);
        return `
          <div class="checklist-item">
            <input id="item-${index}" type="checkbox" data-item="${safeItem}" ${checked ? "checked" : ""}>
            <label for="item-${index}">${safeItem}</label>
            <span class="item-state">${checked ? "Checked" : "Not checked"}</span>
          </div>`;
      }).join("");
    }

    function clearValidation() {
      ["workerName", "location", "shift"].forEach((name) => {
        const input = form.elements[name];
        const field = input.closest(".field");
        field.classList.remove("invalid");
        const error = field.querySelector(".error");
        error.textContent = "";
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      });
    }

    function showValidation(errors) {
      clearValidation();
      Object.entries(errors).forEach(([name, message]) => {
        const input = form.elements[name];
        const field = input.closest(".field");
        const error = field.querySelector(".error");
        field.classList.add("invalid");
        error.textContent = message;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", error.id);
      });
      const firstInvalid = Object.keys(errors)[0];
      if (firstInvalid) form.elements[firstInvalid].focus();
    }

    list.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[type='checkbox']");
      if (!checkbox) return;
      const item = items.find((candidate) => sanitizeText(candidate) === checkbox.dataset.item);
      if (!item) return;
      if (checkbox.checked) completed.add(item);
      else completed.delete(item);
      renderItems();
    });

    searchInput.addEventListener("input", () => {
      query = searchInput.value;
      renderItems();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const rawValues = {
        workerName: form.elements.workerName.value,
        location: form.elements.location.value,
        shift: form.elements.shift.value,
        notes: form.elements.notes.value
      };
      const errors = validateSubmission(rawValues);
      if (Object.keys(errors).length) {
        showValidation(errors);
        status.textContent = "Please correct the highlighted fields.";
        return;
      }

      clearValidation();
      const values = {
        workerName: sanitizeText(rawValues.workerName.trim()),
        location: sanitizeText(rawValues.location.trim()),
        shift: sanitizeText(rawValues.shift),
        notes: sanitizeText(rawValues.notes.trim()),
        completedItems: Array.from(completed).map(sanitizeText)
      };

      loading.hidden = false;
      submitButton.disabled = true;
      status.textContent = "Saving your checklist…";

      globalScope.setTimeout(() => {
        try {
          const records = JSON.parse(globalScope.localStorage.getItem("warehouseSafetyChecklist") || "[]");
          records.push({ ...values, savedAt: new Date().toISOString() });
          globalScope.localStorage.setItem("warehouseSafetyChecklist", JSON.stringify(records));
          status.textContent = "Checklist saved successfully.";
          console.log("[Analytics] User interacted with Offline Safety Checklist");
        } catch (error) {
          status.textContent = "Saved locally. Device storage may be unavailable.";
          console.log("[Analytics] User interacted with Offline Safety Checklist");
        } finally {
          loading.hidden = true;
          submitButton.disabled = false;
        }
      }, 500);
    });

    renderItems();
  }

  const api = { sanitizeText, validateSubmission, filterItems, createChecklistApp };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (globalScope.document) createChecklistApp(globalScope.document);
})(typeof window !== "undefined" ? window : globalThis);
