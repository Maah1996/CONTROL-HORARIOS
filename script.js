const rows = [
  {
    turno: "Mañana",
    nombre: "ANITA",
    libre: "Mar-Dom",
    dias: ["7:00|16:00", "LIBRE", "7:00|16:00", "7:00|16:00", "7:00|16:00", "7:00|15:30", "LIBRE"],
  },
  {
    turno: "Mañana",
    nombre: "DIANA",
    libre: "Lun-Dom",
    dias: ["LIBRE", "8:30|17:30", "8:30|17:30", "8:30|17:30", "8:30|17:30", "8:30|17:30", "LIBRE"],
  },
  {
    turno: "Mañana",
    nombre: "WENDY",
    libre: "Lun-Dom",
    dias: ["LIBRE", "7:00|15:30", "7:00|16:30", "7:00|16:30", "7:00|16:30", "7:00|16:30", "LIBRE"],
  },
  {
    turno: "Mañana",
    nombre: "YURANI",
    libre: "Mar",
    dias: ["8:00|16:00", "LIBRE", "8:00|16:00", "8:00|16:00", "8:00|16:00", "8:00|16:00", "8:00|15:00"],
  },
  {
    turno: "",
    nombre: "MARIA DE LOS\nSANTOS",
    libre: "Lun\n(Vacaciones)\nMier. Libre",
    dias: ["LIBRE", "7:00|15:00", "LIBRE", "7:00|15:00", "7:00|15:00", "7:00|15:00", "8:00|15:00"],
  },
  {
    turno: "Tarde",
    nombre: "JUAN",
    libre: "Mar-Dom",
    dias: ["13:15|23:00", "LIBRE", "13:15|23:00", "14:00|23:00", "14:00|23:00", "14:00|23:00", "LIBRE"],
  },
  {
    turno: "Tarde",
    nombre: "DAILAN",
    libre: "Mier-Dom",
    dias: ["13:15|23:00", "13:15|23:00", "LIBRE", "14:00|23:00", "14:00|23:00", "14:00|23:00", "VACIO"],
  },
  {
    turno: "Tarde",
    nombre: "YAMILLE",
    libre: "Lun-Dom",
    dias: ["LIBRE", "16:00|23:00", "15:00|23:00", "15:00|23:00", "15:00|23:00", "15:00|23:00", "8:00|16:00"],
  },
  {
    turno: "Mañana",
    nombre: "MILTON",
    libre: "LICENCIA",
    dias: ["VACIO", "VACIO", "VACIO", "VACIO", "VACIO", "VACIO", "VACIO"],
  },
];

const scheduleBody = document.querySelector("#schedule-body");

function createDayCells(value) {
  if (value === "LIBRE") {
    return `<td class="free-cell" colspan="2"><span>LIBRE</span></td>`;
  }

  if (value === "VACIO") {
    return `<td class="empty-cell"></td><td class="empty-cell"></td>`;
  }

  const [entrada, salida] = value.split("|");
  return `<td class="time-cell">${entrada}</td><td class="time-cell">${salida}</td>`;
}

function preserveLineBreaks(text) {
  return text.split("\n").join("<br />");
}

scheduleBody.innerHTML = rows
  .map(
    (row) => `
      <tr>
        <td class="shift-cell">${row.turno}</td>
        <td class="person-cell">${preserveLineBreaks(row.nombre)}</td>
        <td class="dayoff-cell">${preserveLineBreaks(row.libre)}</td>
        ${row.dias.map(createDayCells).join("")}
      </tr>
    `,
  )
  .join("");
