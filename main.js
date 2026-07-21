/* ============================================
   MAIN.JS
   Lógica principal del sistema:
   - Navegación entre tabs (marcas)
   - Envío de cada formulario al flujo de Power Automate,
     que registra el dato en la hoja de Excel correspondiente.

   Depende de Utils (utils.js), que debe cargarse antes.
   ============================================ */

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initForms();
});

/* ============================================
   NAVEGACIÓN ENTRE TABS
   ============================================ */
function initTabs() {
  const tabButtons = Utils.qsa(".tab-btn");
  const tabPanels = Utils.qsa(".tab-panel");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.tab;

      tabButtons.forEach((btn) => btn.classList.toggle("active", btn === button));
      tabPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.tabPanel === targetTab);
      });
    });
  });
}

/* ============================================
   FORMULARIOS
   ============================================ */
function initForms() {
  const forms = Utils.qsa(".client-form");
  forms.forEach((form) => {
    form.addEventListener("submit", handleSubmit);
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitButton = Utils.qs(".btn-submit", form);

  // 1. Validar antes de enviar nada
  const { valid, firstInvalidField } = Utils.validateForm(form);
  if (!valid) {
    if (firstInvalidField) firstInvalidField.focus();
    Utils.showFeedback(form, "Revisa los campos marcados en rojo.", "error");
    return;
  }

  // 2. Armar el payload (incluye brand, para que el flujo sepa en qué hoja escribir)
  const payload = Utils.serializeForm(form);

  // 3. Enviar al flujo de Power Automate
  Utils.setSubmitLoading(submitButton, true);

  try {
    await Utils.postData(payload);
    Utils.showFeedback(form, "Registro guardado correctamente.", "success");
    form.reset();
    Utils.clearAllErrors(form);
  } catch (error) {
    console.error("Error al registrar el formulario:", error);
    Utils.showFeedback(form, "No se pudo registrar. Intenta de nuevo.", "error");
  } finally {
    Utils.setSubmitLoading(submitButton, false);
  }
}