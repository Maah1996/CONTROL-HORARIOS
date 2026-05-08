const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const WEEKLY_TARGET_HOURS = 42;
const body = document.querySelector("#scheduleBody");
const dayOffSelect = document.querySelector("#dayOff");
const weeklyTotal = document.querySelector("#weeklyTotal");
const weeklyBalance = document.querySelector("#weeklyBalance");
const balanceCard = document.querySelector("#balanceCard");
const footerTotal = document.querySelector("#footerTotal");
const footerStatus = document.querySelector("#footerStatus");
const printButton = document.querySelector("#printButton");

function buildSchedule() {
  body.innerHTML = DAYS.map((day) => `
    <tr data-day="${day}">
      <td class="day-name">${day}</td>
      <td><input class="time-input start" type="time" aria-label="Hora de inicio ${day}" /></td>
      <td><input class="time-input end" type="time" aria-label="Hora de término ${day}" /></td>
      <td class="hours-cell">0 h</td>
      <td><input class="note" type="text" placeholder="Observación" aria-label="Observación ${day}" /></td>
    </tr>
  `).join("");
}

function parseTimeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatHours(hours) {
  const rounded = Math.round(hours * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded} h` : `${rounded.toFixed(2)} h`;
}

function calculateRowHours(row) {
  if (row.classList.contains("free-day")) return 0;
  const start = parseTimeToMinutes(row.querySelector(".start").value);
  const end = parseTimeToMinutes(row.querySelector(".end").value);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}

function applyDayOff() {
  const selectedDay = dayOffSelect.value;
  document.querySelectorAll("tbody tr").forEach((row) => {
    const isFreeDay = row.dataset.day === selectedDay;
    const start = row.querySelector(".start");
    const end = row.querySelector(".end");
    const note = row.querySelector(".note");

    row.classList.toggle("free-day", isFreeDay);
    start.disabled = isFreeDay;
    end.disabled = isFreeDay;

    if (isFreeDay) {
      start.value = "";
      end.value = "";
      note.value = "Libre";
      note.readOnly = true;
    } else if (note.value === "Libre") {
      note.value = "";
      note.readOnly = false;
    } else {
      note.readOnly = false;
    }
  });
}

function updateTotals() {
  applyDayOff();
  let total = 0;

  document.querySelectorAll("tbody tr").forEach((row) => {
    const rowHours = calculateRowHours(row);
    total += rowHours;
    row.querySelector(".hours-cell").textContent = row.classList.contains("free-day") ? "Libre" : formatHours(rowHours);
  });

  const difference = total - WEEKLY_TARGET_HOURS;
  weeklyTotal.textContent = formatHours(total);
  footerTotal.textContent = formatHours(total);
  balanceCard.classList.remove("ok", "pending", "over");

  if (difference === 0) {
    weeklyBalance.textContent = "Cumple 42 h";
    footerStatus.textContent = "Horario semanal completo";
    balanceCard.classList.add("ok");
  } else if (difference < 0) {
    weeklyBalance.textContent = `Faltan ${formatHours(Math.abs(difference))}`;
    footerStatus.textContent = "Faltan horas para completar la meta";
    balanceCard.classList.add("pending");
  } else {
    weeklyBalance.textContent = `Sobran ${formatHours(difference)}`;
    footerStatus.textContent = "Supera las 42 horas semanales";
    balanceCard.classList.add("over");
  }
}

buildSchedule();
document.addEventListener("input", updateTotals);
document.addEventListener("change", updateTotals);
printButton.addEventListener("click", () => window.print());
updateTotals();
