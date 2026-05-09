const STORAGE_KEY = "control-horarios-chile";
const CURRENT_CHILE_LIMIT = 42;
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const SHORT_DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DEFAULT_SECTIONS = ["COCINA", "PANADERÍA", "PASTELERÍA", "SALA DE VENTA", "BODEGA", "ADMINISTRACIÓN", "LIMPIEZA"];
const SHIFT_TEMPLATES = {
  morning: { label: "Mañana", start: "08:30", end: "15:30" },
  afternoon: { label: "Tarde", start: "15:30", end: "22:30" },
};

function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createMonthlyRecord() {
  return {
    workedHours: 0,
    overtimeHours: 0,
    licenseDays: 0,
    vacationDays: 0,
  };
}

function createBlankShifts() {
  return DAY_NAMES.map(() => ({ start: "", end: "", free: false, status: "work" }));
}

function normalizeShift(shift = {}) {
  const rawStatus = shift.status ?? (shift.free ? "free" : "work");
  const status = rawStatus === "work" ? "work" : "free";

  return {
    start: status === "work" ? (shift.start ?? "") : "",
    end: status === "work" ? (shift.end ?? "") : "",
    free: status === "free",
    status,
  };
}

function normalizeShifts(shifts = createBlankShifts()) {
  return DAY_NAMES.map((_, index) => normalizeShift(shifts[index]));
}

function normalizeWeekSchedules(weekSchedules = {}) {
  return Object.fromEntries(
    Object.entries(weekSchedules).map(([weekStart, shifts]) => [weekStart, normalizeShifts(shifts)]),
  );
}

function normalizeWeeklyRecords(weeklyRecords = {}) {
  return Object.fromEntries(
    Object.entries(weeklyRecords).map(([weekStart, record]) => [
      weekStart,
      {
        month: record.month ?? weekStart.slice(0, 7),
        workedHours: Number(record.workedHours ?? 0),
        overtimeHours: Number(record.overtimeHours ?? record.overtime ?? 0),
        vacationDays: Number(record.vacationDays ?? 0),
        licenseDays: Number(record.licenseDays ?? 0),
      },
    ]),
  );
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMonday(date = new Date()) {
  const monday = new Date(date);
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1);
  return monday;
}

function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function createEmployee({
  name,
  section,
  contract = "Ordinario",
  shiftType = "",
  shifts = createBlankShifts(),
  monthlyRecords = {},
  weeklyRecords = {},
  weekSchedules = {},
  weekShiftTypes = {},
  id = generateId(),
}) {
  const currentMonth = getCurrentMonthKey();
  const normalizedShifts = normalizeShifts(shifts);

  return {
    id,
    name,
    section,
    contract,
    shiftType,
    shifts: normalizedShifts,
    weeklyRecords,
    weekSchedules: normalizeWeekSchedules(weekSchedules),
    weekShiftTypes,
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
    shiftType: "morning",
    shifts: buildShiftTemplate("morning"),
  }),
  createEmployee({
    name: "Carlos Muñoz",
    section: "BODEGA",
    contract: "Turnos",
    shiftType: "morning",
    shifts: buildShiftTemplate("morning"),
  }),
  createEmployee({
    name: "María Soto",
    section: "PASTELERÍA",
    contract: "Ordinario",
    shiftType: "afternoon",
    shifts: buildShiftTemplate("afternoon"),
  }),
];

const state = loadState();
initializeCurrentWeekSchedules();
syncCurrentWeekRecords();

const employeeForm = document.querySelector("#employee-form");
const sectionSelect = document.querySelector("#employee-section");
const customSectionLabel = document.querySelector("#custom-section-label");
const customSectionInput = document.querySelector("#employee-section-other");
const scheduleHead = document.querySelector("#schedule-head");
const scheduleBody = document.querySelector("#schedule-body");
const scheduleMonthInput = document.querySelector("#schedule-month");
const weekStartInput = document.querySelector("#week-start");
const loadWeekSelect = document.querySelector("#load-week");
const loadWeekButton = document.querySelector("#load-week-button");
const repeatWeekSelect = document.querySelector("#repeat-week");
const repeatWeekButton = document.querySelector("#repeat-week-button");
const printSectionSelect = document.querySelector("#print-section");
const printTitle = document.querySelector("#print-title");
const databaseMonthInput = document.querySelector("#database-month");
const legalLimitInput = document.querySelector("#legal-limit");
const legalLimitLabel = document.querySelector("#legal-limit-label");
const summaryCards = document.querySelector("#summary-cards");
const databaseBody = document.querySelector("#database-body");

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored) {
    return normalizeState(JSON.parse(stored));
  }

  return {
    legalLimit: CURRENT_CHILE_LIMIT,
    weekStart: toDateInputValue(getMonday()),
    scheduleMonth: getCurrentMonthKey(),
    databaseMonth: getCurrentMonthKey(),
    employees: demoEmployees,
  };
}

function normalizeState(savedState) {
  const currentMonth = getCurrentMonthKey();
  const weekStart = savedState.weekStart ?? toDateInputValue(getMonday());
  const normalizedEmployees = (savedState.employees ?? []).map((employee) => {
    const monthlyRecords = employee.monthlyRecords ?? {};

    return createEmployee({
      id: employee.id ?? generateId(),
      name: employee.name ?? "Sin nombre",
      section: (employee.section ?? "").trim() || "SIN SECCIÓN",
      contract: employee.contract ?? "Ordinario",
      shiftType: employee.shiftType ?? "",
      shifts: employee.shifts ?? createBlankShifts(),
      weeklyRecords: normalizeWeeklyRecords(employee.weeklyRecords ?? {}),
      weekSchedules: employee.weekSchedules ?? {},
      weekShiftTypes: employee.weekShiftTypes ?? {},
      monthlyRecords: {
        [currentMonth]: createMonthlyRecord(),
        ...monthlyRecords,
      },
    });
  });

  return {
    legalLimit: Number(savedState.legalLimit ?? CURRENT_CHILE_LIMIT),
    weekStart,
    scheduleMonth: savedState.scheduleMonth ?? weekStart.slice(0, 7),
    databaseMonth: savedState.databaseMonth ?? currentMonth,
    employees: normalizedEmployees,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatHours(hours) {
  const rounded = Math.round(hours * 100) / 100;
  return `${rounded.toLocaleString("es-CL", { maximumFractionDigits: 2 })} h`;
}

function timeToMinutes(time) {
  if (!time) {
    return null;
  }

  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateShiftHours(shift) {
  if ((shift.status ?? (shift.free ? "free" : "work")) !== "work" || !shift.start || !shift.end) {
    return 0;
  }

  const start = timeToMinutes(shift.start);
  let end = timeToMinutes(shift.end);

  if (end <= start) {
    end += 24 * 60;
  }

  return (end - start) / 60;
}

function buildShiftTemplate(type) {
  const template = SHIFT_TEMPLATES[type];

  if (!template) {
    return createBlankShifts();
  }

  return DAY_NAMES.map((_, index) => {
    if (index === 6) {
      return { start: "", end: "", free: true, status: "free" };
    }

    return { start: template.start, end: template.end, free: false, status: "work" };
  });
}

function getMonthName(date) {
  return date.toLocaleDateString("es-CL", { month: "long" }).toLocaleUpperCase("es-CL");
}

function getWeeksForMonth(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const firstMonday = getMonday(firstDay);

  if (firstMonday < firstDay) {
    firstMonday.setDate(firstMonday.getDate() + 7);
  }

  const weeks = [];
  let cursor = new Date(firstMonday);
  let index = 1;

  while (cursor <= lastDay) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(start.getDate() + 6);
    weeks.push({
      index,
      value: toDateInputValue(start),
      label: `${getMonthName(start)}, SEM ${index}. - DEL ${start.getDate()} AL ${end.getDate()}`,
      printLabel: `TURNOS DE TRABAJO MES DE ${getMonthName(start)} SEMANA ${index}. DESDE EL ${SHORT_DAY_NAMES[0].toUpperCase()} ${start.getDate()} AL ${SHORT_DAY_NAMES[6].toUpperCase()} ${end.getDate()}.`,
    });
    cursor.setDate(cursor.getDate() + 7);
    index += 1;
  }

  return weeks;
}

function getSelectedWeekInfo() {
  const monthKey = state.weekStart.slice(0, 7);
  return getWeeksForMonth(monthKey).find((week) => week.value === state.weekStart) ?? {
    value: state.weekStart,
    label: state.weekStart,
    printLabel: `TURNOS DE TRABAJO SEMANA DESDE ${state.weekStart}`,
  };
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

function getAllSections() {
  return [...new Set([...DEFAULT_SECTIONS, ...state.employees.map((employee) => employee.section).filter(Boolean)])].sort((a, b) =>
    a.localeCompare(b, "es-CL"),
  );
}

function getEmployeeShifts(employee, weekStart = state.weekStart) {
  if (!employee.weekSchedules) {
    employee.weekSchedules = {};
  }

  if (!employee.weekSchedules[weekStart]) {
    employee.weekSchedules[weekStart] = createBlankShifts();
  }

  employee.shifts = employee.weekSchedules[weekStart];
  employee.shiftType = employee.weekShiftTypes?.[weekStart] ?? employee.shiftType ?? "";
  return employee.weekSchedules[weekStart];
}

function initializeCurrentWeekSchedules() {
  state.employees.forEach((employee) => {
    if (!employee.weekSchedules) {
      employee.weekSchedules = {};
    }

    if (!employee.weekShiftTypes) {
      employee.weekShiftTypes = {};
    }

    if (!employee.weekSchedules[state.weekStart]) {
      employee.weekSchedules[state.weekStart] = normalizeShifts(employee.shifts ?? createBlankShifts());
    }

    if (employee.shiftType && !employee.weekShiftTypes[state.weekStart]) {
      employee.weekShiftTypes[state.weekStart] = employee.shiftType;
    }

    employee.shifts = employee.weekSchedules[state.weekStart];
  });
}

function getWeekMonthKey(weekStart = state.weekStart) {
  return weekStart.slice(0, 7);
}

function syncEmployeeWeekRecord(employee) {
  if (!employee.weeklyRecords) {
    employee.weeklyRecords = {};
  }

  const totals = getEmployeeTotals(employee);
  const shifts = getEmployeeShifts(employee);
  employee.weeklyRecords[state.weekStart] = {
    month: getWeekMonthKey(),
    workedHours: totals.total,
    overtimeHours: totals.overtime,
    vacationDays: 0,
    licenseDays: 0,
  };
}

function syncCurrentWeekRecords() {
  state.employees.forEach(syncEmployeeWeekRecord);
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

function getAccumulatedRecord(employee, month = state.databaseMonth) {
  syncEmployeeWeekRecord(employee);

  const automaticTotals = Object.values(employee.weeklyRecords ?? {})
    .filter((record) => record.month === month)
    .reduce(
      (totals, record) => ({
        workedHours: totals.workedHours + Number(record.workedHours ?? 0),
        overtimeHours: totals.overtimeHours + Number(record.overtimeHours ?? 0),
        vacationDays: totals.vacationDays + Number(record.vacationDays ?? 0),
        licenseDays: totals.licenseDays + Number(record.licenseDays ?? 0),
      }),
      createMonthlyRecord(),
    );

  const manualRecord = getMonthlyRecord(employee, month);

  return {
    workedHours: automaticTotals.workedHours + Number(manualRecord.workedHours ?? 0),
    overtimeHours: automaticTotals.overtimeHours + Number(manualRecord.overtimeHours ?? 0),
    vacationDays: automaticTotals.vacationDays + Number(manualRecord.vacationDays ?? 0),
    licenseDays: automaticTotals.licenseDays + Number(manualRecord.licenseDays ?? 0),
  };
}

function renderWeekSelectors() {
  const monthKey = state.scheduleMonth ?? state.weekStart.slice(0, 7);
  const weeks = getWeeksForMonth(monthKey);
  const weekOptions = weeks.map((week) => `<option value="${week.value}" ${week.value === state.weekStart ? "selected" : ""}>${week.label}</option>`).join("");

  if (scheduleMonthInput) {
    scheduleMonthInput.value = monthKey;
  }

  [weekStartInput, loadWeekSelect, repeatWeekSelect].forEach((select) => {
    if (select) {
      select.innerHTML = weekOptions;
      select.value = select === repeatWeekSelect ? weeks.find((week) => week.value !== state.weekStart)?.value ?? state.weekStart : state.weekStart;
    }
  });
}

function renderPrintSections() {
  if (!printSectionSelect) {
    return;
  }

  printSectionSelect.innerHTML = [
    '<option value="ALL">Todo el turno</option>',
    ...getAllSections().map((section) => `<option value="${escapeHTML(section)}">${escapeHTML(section)}</option>`),
  ].join("");
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
      <th>Turno</th>
      <th>Sección</th>
      ${dayHeaders}
      <th class="total-column">Total</th>
    </tr>
  `;
}

function renderSchedule() {
  renderWeekSelectors();
  renderPrintSections();

  if (!scheduleBody) {
    renderSummary();
    renderDatabase();
    return;
  }

  renderHeader();

  if (!state.employees.length) {
    scheduleBody.innerHTML = `
      <tr>
        <td colspan="11">Aún no hay colaboradores en la base de datos. Agrega el primero para comenzar a planificar.</td>
      </tr>
    `;
    renderSummary();
    renderDatabase();
    return;
  }

  const employeeOptions = state.employees
    .map((employee, index) => `<option value="${index}">${escapeHTML(employee.name)}</option>`)
    .join("");
  const sectionOptions = getAllSections().map((section) => `<option value="${escapeHTML(section)}">${escapeHTML(section)}</option>`).join("");

  scheduleBody.innerHTML = state.employees
    .map((employee, employeeIndex) => {
      const shifts = getEmployeeShifts(employee);
      const dayCells = shifts.map((shift, dayIndex) => createDayCell(employeeIndex, dayIndex, shift)).join("");
      const total = getEmployeeTotals(employee).total;
      const shiftType = employee.weekShiftTypes?.[state.weekStart] ?? employee.shiftType ?? "";

      return `
        <tr data-section="${escapeHTML(employee.section)}">
          <td class="employee-cell">
            <select data-row-action="pick-employee" data-employee="${employeeIndex}" aria-label="Colaborador de la fila">
              ${employeeOptions.replace(`value="${employeeIndex}"`, `value="${employeeIndex}" selected`)}
            </select>
            <strong>${escapeHTML(employee.name)}</strong>
            <button class="delete-btn" type="button" data-delete="${employee.id}">Eliminar</button>
          </td>
          <td class="turn-cell">
            <select data-row-action="shift-type" data-employee="${employeeIndex}" aria-label="Turno de ${escapeHTML(employee.name)}">
              <option value="">Manual</option>
              <option value="morning" ${shiftType === "morning" ? "selected" : ""}>Mañana</option>
              <option value="afternoon" ${shiftType === "afternoon" ? "selected" : ""}>Tarde</option>
            </select>
            <strong class="print-cell-text">${escapeHTML(SHIFT_TEMPLATES[shiftType]?.label ?? "Manual")}</strong>
          </td>
          <td class="section-cell">
            <select data-row-action="section" data-employee="${employeeIndex}" aria-label="Sección de ${escapeHTML(employee.name)}">
              ${sectionOptions.replace(`value="${escapeHTML(employee.section)}"`, `value="${escapeHTML(employee.section)}" selected`)}
            </select>
            <strong class="print-cell-text">${escapeHTML(employee.section)}</strong>
          </td>
          ${dayCells}
          <td class="total-column"><strong>${formatHours(total)}</strong></td>
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
  const status = shift.status ?? (shift.free ? "free" : "work");
  const inactiveClass = status !== "work" ? " is-free" : "";
  const disabled = status !== "work" ? "disabled" : "";
  const statusLabel = status === "work" ? formatHours(hours) : "LIBRE";

  return `
    <td class="day-column ${status !== "work" ? "free-day-cell" : ""}">
      <fieldset class="day-cell${inactiveClass}">
        <legend>${DAY_NAMES[dayIndex]}</legend>
        <label class="free-toggle">
          <input type="checkbox" data-field="free" data-employee="${employeeIndex}" data-day="${dayIndex}" ${status === "free" ? "checked" : ""} />
          Libre
        </label>
        <div class="time-fields">
          <label>Hora
            <input type="time" data-field="start" data-employee="${employeeIndex}" data-day="${dayIndex}" value="${shift.start}" ${disabled} />
          </label>
          <label>Hasta
            <input type="time" data-field="end" data-employee="${employeeIndex}" data-day="${dayIndex}" value="${shift.end}" ${disabled} />
          </label>
        </div>
        <small>${statusLabel}</small>
      </fieldset>
    </td>
  `;
}

function bindScheduleEvents() {
  scheduleBody.querySelectorAll("input[data-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const { employee, day, field } = event.target.dataset;
      const employeeRecord = state.employees[Number(employee)];
      const shift = getEmployeeShifts(employeeRecord)[Number(day)];

      if (field === "free") {
        shift.status = event.target.checked ? "free" : "work";
        shift.free = event.target.checked;
        if (event.target.checked) {
          shift.start = "";
          shift.end = "";
        }
      } else {
        shift[field] = event.target.value;
        shift.status = "work";
        shift.free = false;
        if (employeeRecord.weekShiftTypes) {
          employeeRecord.weekShiftTypes[state.weekStart] = "";
        }
      }

      syncEmployeeWeekRecord(employeeRecord);
      saveState();
      renderSchedule();
    });
  });

  scheduleBody.querySelectorAll("select[data-row-action]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const employeeIndex = Number(event.target.dataset.employee);
      const employee = state.employees[employeeIndex];
      const action = event.target.dataset.rowAction;

      if (action === "pick-employee") {
        const selectedEmployee = state.employees[Number(event.target.value)];
        if (selectedEmployee) {
          employee.name = selectedEmployee.name;
        }
      }

      if (action === "shift-type") {
        employee.shiftType = event.target.value;
        employee.weekShiftTypes[state.weekStart] = event.target.value;
        if (event.target.value) {
          const shifts = buildShiftTemplate(event.target.value);
          employee.shifts = shifts;
          employee.weekSchedules[state.weekStart] = shifts;
        }
      }

      if (action === "section") {
        employee.section = event.target.value;
      }

      syncEmployeeWeekRecord(employee);
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
  const dayHours = getEmployeeShifts(employee).map(calculateShiftHours);
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
          <h3>${escapeHTML(employee.name)}</h3>
          <p>${status.label}</p>
          <dl>
            <dt>Sección</dt><dd>${escapeHTML(employee.section)}</dd>
            <dt>Tipo de contrato</dt><dd>${escapeHTML(employee.contract)}</dd>
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

  syncCurrentWeekRecords();

  if (!state.employees.length) {
    databaseBody.innerHTML = `
      <tr>
        <td colspan="7">La BD aún no tiene colaboradores registrados. Vuelve a horarios y agrega el primer colaborador.</td>
      </tr>
    `;
    return;
  }

  const sectionOptions = getAllSections().map((section) => `<option value="${escapeHTML(section)}">${escapeHTML(section)}</option>`).join("");

  databaseBody.innerHTML = state.employees
    .map((employee) => {
      const record = getAccumulatedRecord(employee);

      return `
        <tr>
          <td><input type="text" value="${escapeHTML(employee.name)}" data-employee-field="name" data-employee-id="${employee.id}" aria-label="Nombre de ${escapeHTML(employee.name)}" /></td>
          <td><select data-employee-field="section" data-employee-id="${employee.id}" aria-label="Sección de ${escapeHTML(employee.name)}">${sectionOptions.replace(`value="${escapeHTML(employee.section)}"`, `value="${escapeHTML(employee.section)}" selected`)}</select></td>
          <td><strong>${formatHours(record.workedHours)}</strong></td>
          <td><strong>${formatHours(record.overtimeHours)}</strong></td>
          <td><strong>${record.vacationDays.toLocaleString("es-CL")}</strong></td>
          <td><strong>${record.licenseDays.toLocaleString("es-CL")}</strong></td>
          <td><button class="delete-btn" type="button" data-delete="${employee.id}">Eliminar</button></td>
        </tr>
      `;
    })
    .join("");

  saveState();
  bindDatabaseEvents();
}

function findEmployeeByDataset(target) {
  return state.employees.find((item) => item.id === target.dataset.employeeId);
}

function bindDatabaseEvents() {
  databaseBody.querySelectorAll("input[data-employee-field], select[data-employee-field]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const employee = findEmployeeByDataset(event.target);

      if (!employee) {
        return;
      }

      employee[event.target.dataset.employeeField] = event.target.value.trim();
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

function copyWeekToTarget(targetWeek) {
  state.employees.forEach((employee) => {
    employee.weekSchedules[targetWeek] = getEmployeeShifts(employee).map((shift) => ({ ...shift }));
    employee.weekShiftTypes[targetWeek] = employee.weekShiftTypes?.[state.weekStart] ?? employee.shiftType ?? "";
  });
}

function preparePrint() {
  const selectedSection = printSectionSelect?.value ?? "ALL";
  const title = getSelectedWeekInfo().printLabel;
  if (printTitle) {
    printTitle.textContent = title;
  }

  document.body.classList.toggle("print-filter-active", selectedSection !== "ALL");
  scheduleBody?.querySelectorAll("tr[data-section]").forEach((row) => {
    row.dataset.printHidden = selectedSection !== "ALL" && row.dataset.section !== selectedSection ? "true" : "false";
  });
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

if (scheduleMonthInput) {
  scheduleMonthInput.addEventListener("change", (event) => {
    state.scheduleMonth = event.target.value;
    const firstWeek = getWeeksForMonth(state.scheduleMonth)[0];
    if (firstWeek) {
      syncCurrentWeekRecords();
      state.weekStart = firstWeek.value;
      initializeCurrentWeekSchedules();
    }
    saveState();
    renderSchedule();
  });
}

if (weekStartInput) {
  weekStartInput.addEventListener("change", (event) => {
    syncCurrentWeekRecords();
    state.weekStart = event.target.value;
    state.scheduleMonth = state.weekStart.slice(0, 7);
    initializeCurrentWeekSchedules();
    syncCurrentWeekRecords();
    saveState();
    renderSchedule();
  });
}

if (loadWeekButton) {
  loadWeekButton.addEventListener("click", () => {
    if (!loadWeekSelect?.value) {
      return;
    }

    syncCurrentWeekRecords();
    state.weekStart = loadWeekSelect.value;
    state.scheduleMonth = state.weekStart.slice(0, 7);
    initializeCurrentWeekSchedules();
    syncCurrentWeekRecords();
    saveState();
    renderSchedule();
  });
}

if (repeatWeekButton) {
  repeatWeekButton.addEventListener("click", () => {
    if (!repeatWeekSelect?.value) {
      return;
    }

    copyWeekToTarget(repeatWeekSelect.value);
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
    state.employees.forEach((employee) => {
      const blankShifts = createBlankShifts();
      employee.shifts = blankShifts;
      employee.weekSchedules[state.weekStart] = blankShifts;
      employee.weekShiftTypes[state.weekStart] = "";
      syncEmployeeWeekRecord(employee);
    });
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
        weekSchedules: {},
        weekShiftTypes: {},
        weeklyRecords: {},
        monthlyRecords: JSON.parse(JSON.stringify(employee.monthlyRecords)),
      }),
    );
    initializeCurrentWeekSchedules();
    syncCurrentWeekRecords();
    saveState();
    renderSchedule();
  });
}

const printPageButton = document.querySelector("#print-page");
if (printPageButton) {
  printPageButton.addEventListener("click", () => {
    preparePrint();
    window.print();
  });
}

window.addEventListener("beforeprint", preparePrint);
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-filter-active");
});

if (databaseMonthInput) {
  databaseMonthInput.value = state.databaseMonth;
}

if (legalLimitInput) {
  legalLimitInput.value = state.legalLimit;
}

toggleCustomSection();
renderSchedule();
