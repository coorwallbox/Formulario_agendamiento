/* ============================================
   UTILS.JS
   Funciones reutilizables: selección de DOM,
   validación de campos, feedback visual y
   comunicación con el flujo de Power Automate.

   No contiene lógica de negocio específica de
   pantalla: eso vive en main.js.
   ============================================ */

const Utils = (() => {

  /* ============================================
     CONFIGURACIÓN
     ============================================ */
  const CONFIG = {
    // URL del disparador "Cuando se recibe una solicitud HTTP" del flujo
    // de Power Automate. Se obtiene al guardar el flujo (ver guía paso a paso).
    POWER_AUTOMATE_URL: "https://PEGAR_AQUI_LA_URL_DEL_FLUJO_DE_POWER_AUTOMATE",

    // Tiempo (ms) que el mensaje de feedback permanece visible antes de limpiarse
    FEEDBACK_TIMEOUT_MS: 5000
  };

  /* ============================================
     SELECCIÓN DE DOM
     ============================================ */
  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  /* ============================================
     VALIDACIÓN
     ============================================ */
  const isEmpty = (value) => value === null || value === undefined || String(value).trim() === "";
  const isNumeric = (value) => /^[0-9]+$/.test(String(value).trim());
  const isValidPhone = (value) => /^[0-9]{7,10}$/.test(String(value).trim());

  // Reglas de validación compartidas por los 5 formularios (una por marca).
  // El "name" de cada campo es igual en todas las marcas, solo cambia el "id".
  const FIELD_RULES = {
    clientName:   { required: true, label: "Nombre del cliente" },
    idNumber:     { required: true, numeric: true, label: "Cédula" },
    phone:        { required: true, phone: true, label: "Celular" },
    vehicleRef:   { required: true, label: "Referencia de vehículo" },
    address:      { required: true, label: "Dirección" },
    city:         { required: true, label: "Ciudad" },
    advisorName:  { required: true, label: "Nombre del asesor" },
    observations: { required: false, label: "Observaciones" }
  };

  // Valida un único input según sus reglas y devuelve el mensaje de error (o "" si es válido)
  function validateField(input, rules) {
    const value = input.value;

    if (rules.required && isEmpty(value)) {
      return `${rules.label} es obligatorio.`;
    }
    if (!isEmpty(value) && rules.numeric && !isNumeric(value)) {
      return `${rules.label} solo debe contener números.`;
    }
    if (!isEmpty(value) && rules.phone && !isValidPhone(value)) {
      return `${rules.label} debe tener entre 7 y 10 dígitos.`;
    }
    return "";
  }

  function setFieldError(input, message) {
    const errorEl = qs(`[data-error-for="${input.id}"]`);
    input.classList.add("input-error");
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(input) {
    const errorEl = qs(`[data-error-for="${input.id}"]`);
    input.classList.remove("input-error");
    if (errorEl) errorEl.textContent = "";
  }

  function clearAllErrors(form) {
    qsa("input, select, textarea", form).forEach(clearFieldError);
  }

  // Valida todos los campos con "name" de un formulario según FIELD_RULES.
  // Devuelve { valid, firstInvalidField }
  function validateForm(form) {
    let valid = true;
    let firstInvalidField = null;

    qsa("input[name], select[name], textarea[name]", form).forEach((input) => {
      const rules = FIELD_RULES[input.name];
      if (!rules) return;

      const message = validateField(input, rules);
      if (message) {
        setFieldError(input, message);
        valid = false;
        if (!firstInvalidField) firstInvalidField = input;
      } else {
        clearFieldError(input);
      }
    });

    return { valid, firstInvalidField };
  }

  /* ============================================
     FEEDBACK VISUAL (mensaje bajo el botón "Registrar")
     ============================================ */
  const feedbackTimers = new WeakMap();

  function showFeedback(form, message, type) {
    const feedbackEl = qs(`[data-feedback-for="${form.id}"]`);
    if (!feedbackEl) return;

    feedbackEl.textContent = message;
    feedbackEl.classList.remove("success", "error");
    feedbackEl.classList.add(type);

    clearTimeout(feedbackTimers.get(form));
    const timer = setTimeout(() => {
      feedbackEl.textContent = "";
      feedbackEl.classList.remove("success", "error");
    }, CONFIG.FEEDBACK_TIMEOUT_MS);
    feedbackTimers.set(form, timer);
  }

  /* ============================================
     ESTADO DEL BOTÓN DE ENVÍO
     ============================================ */
  function setSubmitLoading(button, isLoading, loadingText = "Registrando...") {
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = loadingText;
      button.disabled = true;
    } else {
      button.textContent = button.dataset.originalText || "Registrar";
      button.disabled = false;
    }
  }

  /* ============================================
     SERIALIZACIÓN DEL FORMULARIO
     ============================================ */
  // Convierte un formulario en un objeto plano listo para enviar a Power Automate.
  // Incluye "brand" (tomado de data-brand) y "timestamp" del registro.
  function serializeForm(form) {
    const data = { brand: form.dataset.brand };

    qsa("input[name], select[name], textarea[name]", form).forEach((input) => {
      data[input.name] = input.value.trim();
    });

    data.timestamp = new Date().toISOString();
    return data;
  }

  /* ============================================
     COMUNICACIÓN CON POWER AUTOMATE
     ============================================ */
  // Envía el payload al flujo. Lanza un error si la respuesta HTTP no es exitosa,
  // para que quien la use pueda capturarlo con try/catch.
  async function postData(payload) {
    const response = await fetch(CONFIG.POWER_AUTOMATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`El flujo respondió con estado ${response.status}`);
    }

    // El paso "Responder" del flujo puede devolver JSON o quedar vacío; se soportan ambos casos.
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  }

  /* ============================================
     API PÚBLICA
     ============================================ */
  return {
    CONFIG,
    qs,
    qsa,
    validateForm,
    clearAllErrors,
    showFeedback,
    setSubmitLoading,
    serializeForm,
    postData
  };
})();