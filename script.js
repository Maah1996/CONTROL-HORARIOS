const STORAGE_KEY = "control-horarios-chile";
const CURRENT_CHILE_LIMIT = 42;
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const CONTRACT_TYPES = ["Ordinario", "Parcial", "Turnos", "Artículo 22"];

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMonthlyRecord() {
  return {
    workedHours: 0,
    licenseDays: 0,
    permitDays: 0,
    vacationDays: 0,
  };
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function createEmployee({ name, section, contract, shifts = createBlankShifts(), monthlyRecords = {}, id = generateId() }) {
  const currentMonth = getCurrentMonthKey();

  return {
    id,
    name,
    section,
    contract,
    shifts,
    monthlyRecords: {
      [currentMonth]: createMonthlyRecord(),
      ...monthlyRecords,
    },
  };
}

const demoEmployees = [
  createEmployee({
    name: "Ana Pérez",
    section: "SALA DE VENTA",
    contract: "Ordinario",
    monthlyRecords: {
      [getCurrentMonthKey()]: { workedHours: 168, licenseDays: 0, permitDays: 1, vacationDays: 0 },
    },
    shifts: [
      { start: "08:00", end: "16:30", free: false },
      { start: "08:00", end: "16:30", free: false },
      { start: "08:00", end: "16:30", free: false },
      { start: "08:00", end: "16:30", free: false },
      { start: "08:00", end: "16:00", free: false },
      { start: "", end: "", free: true },
      { start: "", end: "", free: true },
    ],
  }),
  createEmployee({
    name: "Carlos Muñoz",
    section: "BODEGA",
    contract: "Turnos",
    monthlyRecords: {
      [getCurrentMonthKey()]: { workedHours: 174, licenseDays: 0, permitDays: 0, vacationDays: 0 },
    },
    shifts: [
      { start: "07:00", end: "15:00", free: false },
      { start: "07:00", end: "15:00", free: false },
      { start: "07:00", end: "15:00", free: false },
      { start: "07:00", end: "15:00", free: false },
      { start: "07:00", end: "15:00", free: false },
      { start: "07:00", end: "13:00", free: false },
      { start: "", end: "", free: true },
    ],
  }),
  createEmployee({
    name: "María Soto",
    section: "PASTELERÍA",
    contract: "Ordinario",
    monthlyRecords: {
      [getCurrentMonthKey()]: { workedHours: 160, licenseDays: 2, permitDays: 0, vacationDays: 0 },
    },
    shifts: [
      { start: "12:00", end: "21:00", free: false },
      { start: "12:00", end: "21:00", free: false },
      { start: "", end: "", free: true },
      { start: "12:00", end: "21:00", free: false },
      { start: "12:00", end: "21:00", free: false },
      { start: "12:00", end: "20:30", free: false },
      { start: "", end: "", free: true },
    ],
  }),
];

const state = loadState();

const employeeForm = document.querySelector("#employee-form");
const sectionSelect = document.querySelector("#employee-section");
const customSectionLabel = document.querySelector("#custom-section-label");
const customSectionInput = document.querySelector("#employee-section-other");
const scheduleHead = document.querySelector("#schedule-head");
const scheduleBody = document.querySelector("#schedule-body");
const weekStartInput = document.querySelector("#week-start");
const databaseMonthInput = document.querySelector("#database-month");
const legalLimitInput = document.querySelector("#legal-limit");
const legalLimitLabel = document.querySelector("#legal-limit-label");
const summaryCards = document.querySelector("#summary-cards");
const databaseBody = document.querySelector("#database-body");

function getMonday(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return monday;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return normalizeState(JSON.parse(stored));
  }

  return {
    legalLimit: CURRENT_CHILE_LIMIT,
    weekStart: toDateInputValue(getMonday()),
    databaseMonth: getCurrentMonthKey(),
    employees: demoEmployees,
  };
}

function normalizeState(savedState) {
  const currentMonth = getCurrentMonthKey();
  const normalizedEmployees = (savedState.employees ?? []).map((employee) => {
    const monthlyRecords = employee.monthlyRecords ?? {};

    return createEmployee({
      id: employee.id ?? generateId(),
      name: employee.name ?? "Sin nombre",
      section: (employee.section ?? "").trim() || "SIN SECCIÓN",
      contract: employee.contract ?? "Ordinario",
      shifts: employee.shifts ?? createBlankShifts(),
      monthlyRecords: {
        [currentMonth]: createMonthlyRecord(),
        ...monthlyRecords,
      },
    });
  });

  return {
    legalLimit: Number(savedState.legalLimit ?? CURRENT_CHILE_LIMIT),
    weekStart: savedState.weekStart ?? toDateInputValue(getMonday()),
    databaseMonth: savedState.databaseMonth ?? currentMonth,
    employees: normalizedEmployees,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createBlankShifts() {
  return DAY_NAMES.map(() => ({ start: "", end: "", free: false }));
}

function formatHours(hours) {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded.toLocaleString("es-CL", { maximumFractionDigits: 2 })} h`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateShiftHours(shift) {
  if (shift.free || !shift.start || !shift.end) {
    return 0;
  }

  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);

  if (end <= start) {
    end += 24 * 60;
  }

  return (end - start) / 60;
}

function getWeekDates() {
  const start = new Date(`${state.weekStart}T00:00:00`);

  return DAY_NAMES.map((dayName, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      label: dayName,
      shortDate: date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }),
    };
  });
}

function getMonthlyRecord(employee, month = state.databaseMonth) {
  if (!employee.monthlyRecords) {
    employee.monthlyRecords = {};
  }

  if (!employee.monthlyRecords[month]) {
    employee.monthlyRecords[month] = createMonthlyRecord();
  }

  return employee.monthlyRecords[month];
}

function renderHeader() {
  if (!scheduleHead) {
    return;
  }

  const dayHeaders = getWeekDates()
    .map((day) => `<th>${day.label}<br /><span>${day.shortDate}</span></th>`)
    .join("");

  scheduleHead.innerHTML = `
    <tr>
      <th>Colaborador</th>
      ${dayHeaders}
      <th>Total</th>
    </tr>
  `;
}

function renderSchedule() {
  if (!scheduleBody) {
    renderSummary();
    renderDatabase();
    return;
  }

  renderHeader();

  if (!state.employees.length) {
    scheduleBody.innerHTML = `
      <tr>
        <td colspan="9">Aún no hay colaboradores en la base de datos. Agrega el primero para comenzar a planificar.</td>
      </tr>
    `;
    renderSummary();
    renderDatabase();
    return;
  }

  scheduleBody.innerHTML = state.employees
    .map((employee, employeeIndex) => {
      const dayCells = employee.shifts
        .map((shift, dayIndex) => createDayCell(employeeIndex, dayIndex, shift))
        .join("");
      const total = getEmployeeTotals(employee).total;

      return `
        <tr>
          <td class="employee-cell">
            <strong>${employee.name}</strong>
            <span>${employee.section}</span>
            <span>${employee.contract}</span>
            <button class="delete-btn" type="button" data-delete="${employee.id}">Eliminar</button>
          </td>
          ${dayCells}
          <td><strong>${formatHours(total)}</strong></td>
        </tr>
      `;
    })
    .join("");

  bindScheduleEvents();
  renderSummary();
  renderDatabase();
}

function createDayCell(employeeIndex, dayIndex, shift) {
  const hours = calculateShiftHours(shift);
  const freeClass = shift.free ? " is-free" : "";
  const checked = shift.free ? "checked" : "";

  return `
    <td>
      <fieldset class="day-cell${freeClass}">
        <legend>${DAY_NAMES[dayIndex]}</legend>
        <label class="free-toggle">
          <input type="checkbox" data-field="free" data-employee="${employeeIndex}" data-day="${dayIndex}" ${checked} /> Libre
        </label>
        <div class="time-fields">
          <label>Entrada
            <input type="time" data-field="start" data-employee="${employeeIndex}" data-day="${dayIndex}" value="${shift.start}" />
          </label>
          <label>Salida
            <input type="time" data-field="end" data-employee="${employeeIndex}" data-day="${dayIndex}" value="${shift.end}" />
          </label>
        </div>
        <small>${shift.free ? "Día libre" : formatHours(hours)}</small>
      </fieldset>
    </td>
  `;
}

function bindScheduleEvents() {
  scheduleBody.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const { employee, day, field } = event.target.dataset;
      const shift = state.employees[Number(employee)].shifts[Number(day)];

      if (field === "free") {
        shift.free = event.target.checked;
        if (shift.free) {
          shift.start = "";
          shift.end = "";
        }
      } else {
        shift[field] = event.target.value;
        shift.free = false;
      }

      saveState();
      renderSchedule();
    });
  });

  scheduleBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.employees = state.employees.filter((employee) => employee.id !== button.dataset.delete);
      saveState();
      renderSchedule();
    });
  });
}

function getEmployeeTotals(employee) {
  const dayHours = employee.shifts.map(calculateShiftHours);
  const total = dayHours.reduce((sum, hours) => sum + hours, 0);
  const weeklyLimit = Number(state.legalLimit);
  const overtime = Math.max(total - weeklyLimit, 0);
  const dailyWarnings = dayHours.filter((hours) => hours > 10).length;
  const dailyOvertimeWarnings = dayHours.filter((hours) => hours - 10 > 2).length;

  return { total, overtime, weeklyLimit, dailyWarnings, dailyOvertimeWarnings };
}

function renderSummary() {
  if (!summaryCards) {
    return;
  }

  const totals = state.employees.map(getEmployeeTotals);
  const totalHours = totals.reduce((sum, item) => sum + item.total, 0);
  const overtimeHours = totals.reduce((sum, item) => sum + item.overtime, 0);
  const sections = new Set(state.employees.map((employee) => employee.section.trim()).filter(Boolean));

  document.querySelector("#stat-collaborators").textContent = state.employees.length;
  document.querySelector("#stat-hours").textContent = formatHours(totalHours);
  document.querySelector("#stat-overtime").textContent = formatHours(overtimeHours);
  document.querySelector("#stat-sections").textContent = sections.size;
  legalLimitLabel.textContent = state.legalLimit;

  if (!state.employees.length) {
    summaryCards.innerHTML = `<article class="summary-card"><h3>Sin datos</h3><p>Agrega colaboradores a la base de datos para generar el resumen semanal.</p></article>`;
    return;
  }

  summaryCards.innerHTML = state.employees
    .map((employee) => {
      const totalsForEmployee = getEmployeeTotals(employee);
      const status = getStatus(totalsForEmployee);
      const notices = getNotices(totalsForEmployee);

      return `
        <article class="summary-card ${status.className}">
          <h3>${employee.name}</h3>
          <p>${status.label}</p>
          <dl>
            <dt>Sección</dt><dd>${employee.section}</dd>
            <dt>Tipo de contrato</dt><dd>${employee.contract}</dd>
            <dt>Total semanal</dt><dd>${formatHours(totalsForEmployee.total)}</dd>
            <dt>Límite legal referencial</dt><dd>${formatHours(totalsForEmployee.weeklyLimit)}</dd>
            <dt>Horas extra</dt><dd>${formatHours(totalsForEmployee.overtime)}</dd>
          </dl>
          ${notices.length ? `<ul class="notice-list">${notices.map((notice) => `<li>${notice}</li>`).join("")}</ul>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderDatabase() {
  if (!databaseBody) {
    return;
  }

  if (!state.employees.length) {
    databaseBody.innerHTML = `
      <tr>
        <td colspan="16">La BD aún no tiene colaboradores registrados. Vuelve a horarios y agrega el primer colaborador.</td>
      </tr>
    `;
    return;
  }

  databaseBody.innerHTML = state.employees
    .map((employee) => {
      const record = getMonthlyRecord(employee);
      const total = getEmployeeTotals(employee).total;
      const dayCells = employee.shifts.map((shift, dayIndex) => createDatabaseDayCell(employee, shift, dayIndex)).join("");
      const contractOptions = CONTRACT_TYPES.map(
        (contract) => `<option value="${escapeHTML(contract)}" ${employee.contract === contract ? "selected" : ""}>${escapeHTML(contract)}</option>`,
      ).join("");

      return `
        <tr>
          <td><input type="text" value="${escapeHTML(employee.name)}" data-employee-field="name" data-employee-id="${employee.id}" aria-label="Nombre de ${escapeHTML(employee.name)}" /></td>
          <td><input type="text" value="${escapeHTML(employee.section)}" data-employee-field="section" data-employee-id="${employee.id}" aria-label="Sección de ${escapeHTML(employee.name)}" /></td>
          <td>
            <select data-employee-field="contract" data-employee-id="${employee.id}" aria-label="Contrato de ${escapeHTML(employee.name)}">
              ${contractOptions}
            </select>
          </td>
          ${dayCells}
          <td><strong>${formatHours(total)}</strong></td>
          <td><input type="number" min="0" step="0.5" value="${record.workedHours}" data-record-field="workedHours" data-employee-id="${employee.id}" aria-label="Horas trabajadas mensuales de ${escapeHTML(employee.name)}" /></td>
          <td><input type="number" min="0" step="1" value="${record.licenseDays}" data-record-field="licenseDays" data-employee-id="${employee.id}" aria-label="Días de licencia de ${escapeHTML(employee.name)}" /></td>
          <td><input type="number" min="0" step="1" value="${record.permitDays}" data-record-field="permitDays" data-employee-id="${employee.id}" aria-label="Días de permiso de ${escapeHTML(employee.name)}" /></td>
          <td><input type="number" min="0" step="1" value="${record.vacationDays}" data-record-field="vacationDays" data-employee-id="${employee.id}" aria-label="Días de vacaciones de ${escapeHTML(employee.name)}" /></td>
          <td><button class="delete-btn" type="button" data-delete="${employee.id}">Eliminar</button></td>
        </tr>
      `;
    })
    .join("");

  bindDatabaseEvents();
}

function createDatabaseDayCell(employee, shift, dayIndex) {
  const checked = shift.free ? "checked" : "";
  const disabled = shift.free ? "disabled" : "";

  return `
    <td class="database-day-cell">
      <label class="free-toggle compact-toggle">
        <input type="checkbox" data-shift-field="free" data-employee-id="${employee.id}" data-day="${dayIndex}" ${checked} /> Libre
      </label>
      <div class="database-time-fields">
        <input type="time" value="${escapeHTML(shift.start)}" data-shift-field="start" data-employee-id="${employee.id}" data-day="${dayIndex}" aria-label="Entrada ${DAY_NAMES[dayIndex]} de ${escapeHTML(employee.name)}" ${disabled} />
        <input type="time" value="${escapeHTML(shift.end)}" data-shift-field="end" data-employee-id="${employee.id}" data-day="${dayIndex}" aria-label="Salida ${DAY_NAMES[dayIndex]} de ${escapeHTML(employee.name)}" ${disabled} />
      </div>
      <small>${shift.free ? "Libre" : formatHours(calculateShiftHours(shift))}</small>
    </td>
  `;
}

function findEmployeeByDataset(target) {
  return state.employees.find((item) => item.id === target.dataset.employeeId);
}

function bindDatabaseEvents() {
  databaseBody.querySelectorAll("input[data-record-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const employee = findEmployeeByDataset(event.target);

      if (!employee) {
        return;
      }

      const record = getMonthlyRecord(employee);
      record[event.target.dataset.recordField] = Number(event.target.value);
      saveState();
    });
  });

  databaseBody.querySelectorAll("input[data-employee-field], select[data-employee-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const employee = findEmployeeByDataset(event.target);

      if (!employee) {
        return;
      }

      const field = event.target.dataset.employeeField;
      employee[field] = field === "section" ? event.target.value.trim().toLocaleUpperCase("es-CL") : event.target.value.trim();
      saveState();
      renderSchedule();
    });
  });

  databaseBody.querySelectorAll("input[data-shift-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const employee = findEmployeeByDataset(event.target);

      if (!employee) {
        return;
      }

      const shift = employee.shifts[Number(event.target.dataset.day)];
      const field = event.target.dataset.shiftField;

      if (field === "free") {
        shift.free = event.target.checked;
        if (shift.free) {
          shift.start = "";
          shift.end = "";
        }
      } else {
        shift[field] = event.target.value;
        shift.free = false;
      }

      saveState();
      renderSchedule();
    });
  });

  databaseBody.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.employees = state.employees.filter((employee) => employee.id !== button.dataset.delete);
      saveState();
      renderSchedule();
    });
  });
}

function getStatus(totals) {
  if (totals.overtime > 0) {
    return { className: "danger", label: "Supera la jornada legal referencial: revisar horas extra." };
  }

  if (totals.dailyWarnings > 0) {
    return { className: "warning", label: "Tiene días sobre 10 horas: revisar distribución." };
  }

  return { className: "", label: "Dentro del límite semanal legal referencial." };
}

function getNotices(totals) {
  const notices = [];

  if (totals.overtime > 0) {
    notices.push("Horas extra estimadas con base en el exceso semanal sobre el límite legal referencial.");
  }

  if (totals.dailyWarnings > 0) {
    notices.push("Existe al menos una jornada diaria sobre 10 horas ordinarias referenciales.");
  }

  if (totals.dailyOvertimeWarnings > 0) {
    notices.push("Revisar: el exceso diario supera el máximo referencial de 2 horas extra.");
  }

  return notices;
}

function getSelectedSection(formData) {
  const section = formData.get("section");

  if (section === "OTRA") {
    return formData.get("otherSection").trim().toLocaleUpperCase("es-CL");
  }

  return section;
}

function toggleCustomSection() {
  if (!sectionSelect || !customSectionLabel || !customSectionInput) {
    return;
  }

  const isCustomSection = sectionSelect.value === "OTRA";
  customSectionLabel.hidden = !isCustomSection;
  customSectionInput.required = isCustomSection;

  if (!isCustomSection) {
    customSectionInput.value = "";
  }
}

if (employeeForm) {
  employeeForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(employeeForm);

    state.employees.push(
      createEmployee({
        name: formData.get("name").trim(),
        section: getSelectedSection(formData),
        contract: formData.get("contract"),
      }),
    );

    employeeForm.reset();
    toggleCustomSection();
    saveState();
    renderSchedule();
  });
}

if (sectionSelect) {
  sectionSelect.addEventListener("change", toggleCustomSection);
}

if (weekStartInput) {
  weekStartInput.addEventListener("change", (event) => {
    state.weekStart = event.target.value;
    saveState();
    renderSchedule();
  });
}

if (databaseMonthInput) {
  databaseMonthInput.addEventListener("change", (event) => {
    state.databaseMonth = event.target.value;
    saveState();
    renderDatabase();
  });
}

if (legalLimitInput) {
  legalLimitInput.addEventListener("change", (event) => {
    state.legalLimit = Number(event.target.value);
    saveState();
    renderSchedule();
  });
}

const clearScheduleButton = document.querySelector("#clear-schedule");
if (clearScheduleButton) {
  clearScheduleButton.addEventListener("click", () => {
    state.employees = state.employees.map((employee) => ({ ...employee, shifts: createBlankShifts() }));
    saveState();
    renderSchedule();
  });
}

const loadDemoButton = document.querySelector("#load-demo");
if (loadDemoButton) {
  loadDemoButton.addEventListener("click", () => {
    state.employees = demoEmployees.map((employee) =>
      createEmployee({
        ...employee,
        id: generateId(),
        shifts: employee.shifts.map((shift) => ({ ...shift })),
        monthlyRecords: JSON.parse(JSON.stringify(employee.monthlyRecords)),
      }),
    );
    saveState();
    renderSchedule();
  });
}

const printPageButton = document.querySelector("#print-page");
if (printPageButton) {
  printPageButton.addEventListener("click", () => window.print());
}

if (weekStartInput) {
  weekStartInput.value = state.weekStart;
}

if (databaseMonthInput) {
  databaseMonthInput.value = state.databaseMonth;
}

if (legalLimitInput) {
  legalLimitInput.value = state.legalLimit;
}

toggleCustomSection();
renderSchedule();
