const WEEKLY_TARGET_MINUTES = 42 * 60;
const DAYS = [
  { key: "lun", title: "LUN", date: "11 May", name: "Lunes" },
  { key: "mar", title: "MAR", date: "12 May", name: "Martes" },
  { key: "mie", title: "MIÉ", date: "13 May", name: "Miércoles" },
  { key: "jue", title: "JUE", date: "14 May", name: "Jueves" },
  { key: "vie", title: "VIE", date: "15 May", name: "Viernes" },
  { key: "sab", title: "SÁB", date: "16 May", name: "Sábado" },
  { key: "dom", title: "DOM", date: "17 May", name: "Domingo" },
];

const COLLABORATORS = [
  { name: "MARCO", area: "cocina", target: "42h/sem" },
  { name: "ANITA", area: "aseo", target: "42h/sem" },
  { name: "LUIS", area: "administracion", target: "42h/sem" },
];

const SHIFTS = ["Mañana", "Tarde", "Noche"];
const DAY_OFF_OPTIONS = ["—", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const TIME_OPTIONS = ["", "08:00", "15:00", "15:30", "17:00"];

const INITIAL_ROWS = [
  {
    collaborator: "MARCO",
    shift: "Mañana",
    dayOff: "MIÉ",
    times: {
      lun: ["08:00", "15:30"],
      mar: ["08:00", "15:30"],
      mie: ["", ""],
      jue: ["08:00", "15:00"],
      vie: ["08:00", "15:00"],
      sab: ["08:00", "15:00"],
      dom: ["08:00", "17:00"],
    },
  },
  {
    collaborator: "ANITA",
    shift: "Mañana",
    dayOff: "—",
    times: {
      lun: ["08:00", "17:00"],
      mar: ["08:00", "17:00"],
      mie: ["08:00", "17:00"],
      jue: ["08:00", "17:00"],
      vie: ["08:00", "17:00"],
      sab: ["08:00", "17:00"],
      dom: ["08:00", "17:00"],
    },
  },
  {
    collaborator: "LUIS",
    shift: "Mañana",
    dayOff: "—",
    times: {
      lun: ["08:00", "17:00"],
      mar: ["08:00", "17:00"],
      mie: ["08:00", "17:00"],
      jue: ["08:00", "17:00"],
      vie: ["08:00", "17:00"],
      sab: ["08:00", "17:00"],
      dom: ["08:00", "17:00"],
    },
  },
];

const scheduleHead = document.querySelector("#scheduleHead");
const scheduleBody = document.querySelector("#scheduleBody");

function optionList(options, selectedValue) {
  return options
    .map((option) => `<option value="${option}"${option === selectedValue ? " selected" : ""}>${option}</option>`)
    .join("");
}

function buildHead() {
  scheduleHead.innerHTML = `
    <th class="col-worker">Colaborador</th>
    <th class="col-shift">Turno</th>
    <th class="col-dayoff">Día libre</th>
    ${DAYS.map((day) => `
      <th class="col-day day-header ${["SÁB", "DOM"].includes(day.title) ? "weekend-header" : ""}">
        <span class="day-title">${day.title}</span>
        <span class="day-date">${day.date}</span>
      </th>
    `).join("")}
    <th class="col-total total-header">Total</th>
    <th class="col-extra extra-header">HH.EE.</th>
  `;
}

function buildBody() {
  scheduleBody.innerHTML = INITIAL_ROWS.map((row, rowIndex) => `
    <tr data-row="${rowIndex}">
      <td class="worker-cell">
        <select class="worker-select" aria-label="Colaborador fila ${rowIndex + 1}">
          ${optionList(COLLABORATORS.map((collaborator) => collaborator.name), row.collaborator)}
        </select>
        <div class="worker-meta"></div>
      </td>
      <td class="shift-cell">
        <select class="shift-select" aria-label="Turno de ${row.collaborator}">
          ${optionList(SHIFTS, row.shift)}
        </select>
      </td>
      <td class="dayoff-cell">
        <select class="dayoff-select" aria-label="Día libre de ${row.collaborator}">
          ${optionList(DAY_OFF_OPTIONS, row.dayOff)}
        </select>
      </td>
      ${DAYS.map((day) => {
        const [start, end] = row.times[day.key] ?? ["", ""];
        return `
          <td class="day-cell" data-day="${day.title}">
            <select class="time-select start" aria-label="Entrada ${day.name} de ${row.collaborator}">
              ${optionList(TIME_OPTIONS, start)}
            </select>
            <select class="time-select end" aria-label="Salida ${day.name} de ${row.collaborator}">
              ${optionList(TIME_OPTIONS, end)}
            </select>
            <div class="free-label">LIBRE</div>
            <div class="day-hours">0:00h</div>
          </td>
        `;
      }).join("")}
      <td class="total-cell">
        <div class="total-hours">0:00h</div>
        <div class="target-hours">42h/sem</div>
      </td>
      <td class="extra-cell"><div class="extra-hours neutral">—</div></td>
    </tr>
  `).join("");
}

function parseTimeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes, { signed = false } = {}) {
  const sign = totalMinutes < 0 ? "-" : signed && totalMinutes > 0 ? "+" : "";
  const minutes = Math.abs(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${sign}${hours}:${String(remainder).padStart(2, "0")}h`;
}

function getCollaborator(name) {
  return COLLABORATORS.find((collaborator) => collaborator.name === name) ?? COLLABORATORS[0];
}

function updateRow(row) {
  const selectedCollaborator = getCollaborator(row.querySelector(".worker-select").value);
  row.querySelector(".worker-meta").innerHTML = `
    <span>${selectedCollaborator.area}</span>
    <span>${selectedCollaborator.target}</span>
  `;

  const selectedDayOff = row.querySelector(".dayoff-select").value;
  let totalMinutes = 0;

  row.querySelectorAll(".day-cell").forEach((cell) => {
    const isFree = selectedDayOff !== "—" && cell.dataset.day === selectedDayOff;
    const startSelect = cell.querySelector(".start");
    const endSelect = cell.querySelector(".end");
    const hoursLabel = cell.querySelector(".day-hours");

    cell.classList.toggle("is-free", isFree);
    startSelect.disabled = isFree;
    endSelect.disabled = isFree;

    if (isFree) {
      hoursLabel.textContent = "0:00h";
      return;
    }

    const start = parseTimeToMinutes(startSelect.value);
    const end = parseTimeToMinutes(endSelect.value);
    const dayMinutes = start === null || end === null || end <= start ? 0 : end - start - 30;
    totalMinutes += dayMinutes;
    hoursLabel.textContent = formatMinutes(dayMinutes);
  });

  const extraMinutes = totalMinutes - WEEKLY_TARGET_MINUTES;
  const extraLabel = row.querySelector(".extra-hours");
  row.querySelector(".total-hours").textContent = formatMinutes(totalMinutes);

  extraLabel.classList.toggle("neutral", extraMinutes <= 0);
  extraLabel.textContent = extraMinutes > 0 ? formatMinutes(extraMinutes, { signed: true }) : "—";
}

function updateSchedule() {
  scheduleBody.querySelectorAll("tr").forEach(updateRow);
}

buildHead();
buildBody();
document.addEventListener("change", updateSchedule);
updateSchedule();
