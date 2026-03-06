(function () {
  "use strict";

  let currentYear, currentMonth;
  let classes = [];
  let teachers = [];
  let eventsByDate = {};
  let currentLang = localStorage.getItem("lang") || "en";

  var translations = {
    en: {
      schoolCalendar: "Portocal",
      appName: "Portocal",
      themeDark: "Dark",
      themeLight: "Light",
      newEvent: "New event",
      editEvent: "Edit event",
      eventDetails: "Event details",
      date: "Date",
      title: "Title",
      description: "Description",
      color: "Color",
      classes: "Classes",
      teachers: "Teachers",
      saveEvent: "Save event",
      delete: "Delete",
      edit: "Edit",
      addClass: "Add class",
      addTeacher: "Add teacher",
      addClassBtn: "+ Class",
      addTeacherBtn: "+ Teacher",
      schoolOptionsBtn: "School options",
      schoolOptions: "School options",
      logout: "Log out",
      remove: "Remove",
      theme: "Theme",
      language: "Language",
      addEvent: "Add event",
      selectDate: "Select a date",
      nameEg: "Name (e.g. 5A)",
      name: "Name",
      add: "Add",
      placeholderTitle: "e.g. Field trip",
      placeholderDesc: "Brief description of the event...",
      labelDate: "Date:",
      labelColor: "Color:",
      labelClasses: "Classes:",
      labelTeachers: "Teachers:",
      confirmDelete: "Delete this event?",
      moreEvents: "···",
      eventsOnDay: "Events on this day",
      msgError: "Something went wrong.",
      msgDeleteFailed: "Could not delete event.",
      msgFailed: "Failed",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun"
    },
    el: {
      schoolCalendar: "Portocal",
      appName: "Portocal",
      themeDark: "Σκούρο",
      themeLight: "Φωτεινό",
      newEvent: "Νέο γεγονός",
      editEvent: "Επεξεργασία γεγονότος",
      eventDetails: "Λεπτομέρειες γεγονότος",
      date: "Ημερομηνία",
      title: "Τίτλος",
      description: "Περιγραφή",
      color: "Χρώμα",
      classes: "Τάξεις",
      teachers: "Καθηγητές",
      saveEvent: "Αποθήκευση",
      delete: "Διαγραφή",
      edit: "Επεξεργασία",
      addClass: "Προσθήκη τάξης",
      addTeacher: "Προσθήκη καθηγητή",
      addClassBtn: "+ Τάξη",
      addTeacherBtn: "+ Καθηγητής",
      schoolOptionsBtn: "Σχολικές επιλογές",
      schoolOptions: "Σχολικές επιλογές",
      logout: "Αποσύνδεση",
      remove: "Αφαίρεση",
      theme: "Θέμα",
      language: "Γλώσσα",
      addEvent: "Προσθήκη γεγονότος",
      selectDate: "Επιλέξτε ημερομηνία",
      nameEg: "Όνομα (π.χ. 5Α)",
      name: "Όνομα",
      add: "Προσθήκη",
      placeholderTitle: "π.χ. Εκδρομή",
      placeholderDesc: "Σύντομη περιγραφή του γεγονότος...",
      labelDate: "Ημερομηνία:",
      labelColor: "Χρώμα:",
      labelClasses: "Τάξεις:",
      labelTeachers: "Καθηγητές:",
      confirmDelete: "Διαγραφή αυτού του γεγονότος;",
      moreEvents: "···",
      eventsOnDay: "Γεγονότα αυτής της ημέρας",
      msgError: "Κάτι πήγε στραβά.",
      msgDeleteFailed: "Αδυναμία διαγραφής γεγονότος.",
      msgFailed: "Αποτυχία",
      mon: "Δετ", tue: "Τρι", wed: "Τετ", thu: "Πεμ", fri: "Παρ", sat: "Σαβ", sun: "Κυρ"
    }
  };

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || (translations.en[key]) || key;
  }

  function checkAuth(r) {
    if (r.status === 401) {
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    return r;
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (key) el.placeholder = t(key);
    });
    var themeLabel = document.getElementById("userMenuThemeLabel");
    if (themeLabel) themeLabel.textContent = document.documentElement.getAttribute("data-theme") === "light" ? t("themeDark") : t("themeLight");
    var langLabel = document.getElementById("userMenuLangLabel");
    if (langLabel) langLabel.textContent = currentLang === "en" ? "ΕΛ" : "EN";
    if (monthTitle) monthTitle.textContent = formatMonthTitle(currentYear, currentMonth);
    renderDayPanel(selectedDateKey);
  }

  function formatMonthTitle(y, m) {
    var d = new Date(y, m, 1);
    var locale = currentLang === "el" ? "el-GR" : "en-GB";
    return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  const calendarGrid = document.getElementById("calendarGrid");
  const monthTitle = document.getElementById("monthTitle");
  const eventModal = document.getElementById("eventModal");
  const eventForm = document.getElementById("eventForm");
  const eventId = document.getElementById("eventId");
  const eventDate = document.getElementById("eventDate");
  const eventTitle = document.getElementById("eventTitle");
  const eventDescription = document.getElementById("eventDescription");
  const classCheckboxes = document.getElementById("classCheckboxes");
  const teacherCheckboxes = document.getElementById("teacherCheckboxes");
  const eventColor = document.getElementById("eventColor");
  const eventViewPanel = document.getElementById("eventViewPanel");
  const eventFormPanel = document.getElementById("eventFormPanel");
  const DEFAULT_EVENT_COLOR = "#3b82f6";
  let currentEventData = null;
  let selectedDateKey = null;

  function setMonth(y, m) {
    currentYear = y;
    currentMonth = m;
    monthTitle.textContent = formatMonthTitle(y, m);
    loadEvents();
  }

  function getMonthData() {
    const first = new Date(currentYear, currentMonth, 1);
    const last = new Date(currentYear, currentMonth + 1, 0);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = last.getDate();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      const d = daysInPrev - startDay + i + 1;
      cells.push({ day: d, otherMonth: true, date: new Date(prevYear, prevMonth, d) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, otherMonth: false, date: new Date(currentYear, currentMonth, d) });
    }
    const remaining = 42 - cells.length;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let i = 0; i < remaining; i++) {
      cells.push({ day: i + 1, otherMonth: true, date: new Date(nextYear, nextMonth, i) });
    }
    return cells;
  }

  function dateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function getContrastColor(hex) {
    if (!hex || hex.length < 7) return "#ffffff";
    var r = parseInt(hex.slice(1, 3), 16) / 255;
    var g = parseInt(hex.slice(3, 5), 16) / 255;
    var b = parseInt(hex.slice(5, 7), 16) / 255;
    var luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 0.5 ? "#111111" : "#ffffff";
  }

  function renderDayPanel(dateKeyStr) {
    var headerEl = document.getElementById("dayPanelHeader");
    var addBtn = document.getElementById("dayPanelAddBtn");
    var listEl = document.getElementById("dayPanelEvents");
    if (!headerEl || !addBtn || !listEl) return;
    if (!dateKeyStr) {
      headerEl.textContent = t("selectDate");
      addBtn.disabled = true;
      addBtn.style.display = "none";
      listEl.innerHTML = "";
      return;
    }
    addBtn.disabled = false;
    addBtn.style.display = "";
    headerEl.textContent = formatDisplayDate(dateKeyStr);
    var events = eventsByDate[dateKeyStr] || [];
    listEl.innerHTML = "";
    events.forEach(function (ev) {
      var color = ev.color || DEFAULT_EVENT_COLOR;
      var row = document.createElement("div");
      row.className = "day-panel-event";
      row.dataset.eventId = String(ev.id);
      row.innerHTML =
        '<span class="day-panel-event-swatch" style="background:' +
        escapeHtml(color) +
        '"></span>' +
        '<div class="day-panel-event-body">' +
        '<p class="day-panel-event-title">' +
        escapeHtml(ev.title) +
        "</p>" +
        (ev.description
          ? '<p class="day-panel-event-desc">' + escapeHtml(ev.description) + "</p>"
          : "") +
        "</div>" +
        '<div class="day-panel-event-actions">' +
        '<button type="button" class="btn btn-ghost day-panel-edit" data-i18n="edit">' +
        t("edit") +
        "</button>" +
        '<button type="button" class="btn btn-ghost day-panel-delete" data-i18n="delete">' +
        t("delete") +
        "</button>" +
        "</div>";
      listEl.appendChild(row);
      var editBtn = row.querySelector(".day-panel-edit");
      var deleteBtn = row.querySelector(".day-panel-delete");
      row.querySelector(".day-panel-event-body").addEventListener("click", function () {
        openEventModal(parseInt(row.dataset.eventId, 10));
      });
      if (editBtn) {
        editBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          openEventModal(parseInt(row.dataset.eventId, 10));
        });
      }
      if (deleteBtn) {
        deleteBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          if (!confirm(t("confirmDelete"))) return;
          fetch("/api/events/" + row.dataset.eventId, { method: "DELETE" })
            .then(checkAuth)
            .then(function (r) {
              if (!r.ok) throw new Error("Delete failed");
              loadEvents();
              renderDayPanel(selectedDateKey);
            })
            .catch(function () {
              alert(t("msgDeleteFailed"));
            });
        });
      }
    });
  }

  function renderCalendar() {
    const cells = getMonthData();
    calendarGrid.innerHTML = "";
    cells.forEach(function (cell) {
      const key = dateKey(cell.date);
      const dayEvents = eventsByDate[key] || [];
      var dotsHtml =
        '<div class="day-dots">' +
        dayEvents
          .map(
            function (e) {
              var color = e.color || DEFAULT_EVENT_COLOR;
              return (
                '<span class="event-dot" data-event-id="' +
                e.id +
                '" style="background:' +
                escapeHtml(color) +
                '" title="' +
                escapeHtml(e.title) +
                '"></span>'
              );
            }
          )
          .join("") +
        "</div>";

      const div = document.createElement("div");
      div.className = "day-cell" + (cell.otherMonth ? " other-month" : "");
      div.dataset.date = key;
      div.innerHTML =
        '<span class="day-num">' +
        cell.day +
        "</span>" +
        '<div class="day-events">' +
        dotsHtml +
        "</div>";
      calendarGrid.appendChild(div);
    });

    calendarGrid.querySelectorAll(".day-cell").forEach(function (el) {
      el.addEventListener("click", function (e) {
        var dot = e.target.closest(".event-dot");
        if (dot) {
          e.stopPropagation();
          openEventModal(parseInt(dot.dataset.eventId, 10));
        } else {
          selectedDateKey = el.dataset.date;
          renderDayPanel(selectedDateKey);
        }
      });
    });
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function loadEvents() {
    fetch("/api/events?year=" + currentYear + "&month=" + (currentMonth + 1))
      .then(checkAuth)
      .then(function (r) {
        return r.json();
      })
      .then(function (list) {
        eventsByDate = {};
        list.forEach(function (ev) {
          const key = ev.event_date;
          if (!eventsByDate[key]) eventsByDate[key] = [];
          eventsByDate[key].push(ev);
        });
        renderCalendar();
        renderDayPanel(selectedDateKey);
      })
      .catch(function () {
        renderCalendar();
      });
  }

  function loadClassesAndTeachers() {
    return Promise.all([
      fetch("/api/classes").then(checkAuth).then(function (r) { return r.json(); }),
      fetch("/api/teachers").then(checkAuth).then(function (r) { return r.json(); }),
    ])
      .then(function (results) {
        classes = results[0];
        teachers = results[1];
        renderCheckboxes();
      })
      .catch(function () {});
  }

  function renderCheckboxes() {
    classCheckboxes.innerHTML = classes
      .map(
        function (c) {
          return (
            '<label><input type="checkbox" name="class" value="' +
            c.id +
            '"> ' +
            escapeHtml(c.name) +
            "</label>"
          );
        }
      )
      .join("");
    teacherCheckboxes.innerHTML = teachers
      .map(
        function (t) {
          return (
            '<label><input type="checkbox" name="teacher" value="' +
            t.id +
            '"> ' +
            escapeHtml(t.name) +
            "</label>"
          );
        }
      )
      .join("");
  }

  function openEventModal(editId, defaultDate) {
    eventId.value = editId ? String(editId) : "";
    currentEventData = null;
    if (editId) {
      document.getElementById("eventModalTitle").textContent = t("eventDetails");
      eventViewPanel.classList.remove("panel-hidden");
      eventFormPanel.classList.add("panel-hidden");
      fetch("/api/events/" + editId)
        .then(checkAuth)
        .then(function (r) {
          return r.json();
        })
        .then(function (ev) {
          currentEventData = ev;
          document.getElementById("viewEventTitle").textContent = ev.title;
          document.getElementById("viewEventDate").textContent = formatDisplayDate(ev.event_date);
          var descEl = document.getElementById("viewEventDescription");
          descEl.textContent = ev.description || "";
          var colorEl = document.getElementById("viewEventColor");
          colorEl.style.background = ev.color || DEFAULT_EVENT_COLOR;
          colorEl.title = ev.color || DEFAULT_EVENT_COLOR;
          document.getElementById("viewEventClasses").textContent = ev.classes.length ? ev.classes.map(function (c) { return c.name; }).join(", ") : "—";
          document.getElementById("viewEventTeachers").textContent = ev.teachers.length ? ev.teachers.map(function (t) { return t.name; }).join(", ") : "—";
          applyTranslations();
        });
    } else {
      document.getElementById("eventModalTitle").textContent = t("newEvent");
      eventViewPanel.classList.add("panel-hidden");
      eventFormPanel.classList.remove("panel-hidden");
      eventForm.reset();
      eventColor.value = DEFAULT_EVENT_COLOR;
      if (defaultDate) eventDate.value = defaultDate;
      document.getElementById("eventDelete").style.display = "none";
    }
    eventModal.hidden = false;
  }

  function formatDisplayDate(isoDate) {
    if (!isoDate) return "";
    var d = new Date(isoDate + "T12:00:00");
    var locale = currentLang === "el" ? "el-GR" : "en-GB";
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  }

  function showEventFormForEdit() {
    if (!currentEventData) return;
    eventViewPanel.classList.add("panel-hidden");
    eventFormPanel.classList.remove("panel-hidden");
    document.getElementById("eventModalTitle").textContent = t("editEvent");
    document.getElementById("eventDelete").style.display = "block";
    eventDate.value = currentEventData.event_date;
    eventTitle.value = currentEventData.title;
    eventDescription.value = currentEventData.description || "";
    eventColor.value = currentEventData.color || DEFAULT_EVENT_COLOR;
    classCheckboxes.querySelectorAll("input").forEach(function (cb) {
      cb.checked = currentEventData.classes.some(function (c) { return c.id === parseInt(cb.value, 10); });
    });
    teacherCheckboxes.querySelectorAll("input").forEach(function (cb) {
      cb.checked = currentEventData.teachers.some(function (t) { return t.id === parseInt(cb.value, 10); });
    });
  }

  function closeEventModal() {
    eventModal.hidden = true;
  }

  function getSelectedClassIds() {
    return Array.from(classCheckboxes.querySelectorAll("input:checked")).map(function (el) {
      return parseInt(el.value, 10);
    });
  }

  function getSelectedTeacherIds() {
    return Array.from(teacherCheckboxes.querySelectorAll("input:checked")).map(function (el) {
      return parseInt(el.value, 10);
    });
  }

  eventForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const id = eventId.value;
    const payload = {
      title: eventTitle.value.trim(),
      event_date: eventDate.value,
      description: eventDescription.value.trim(),
      color: eventColor.value || DEFAULT_EVENT_COLOR,
      class_ids: getSelectedClassIds(),
      teacher_ids: getSelectedTeacherIds(),
    };
    const url = id ? "/api/events/" + id : "/api/events";
    const method = id ? "PUT" : "POST";
    fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(checkAuth)
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || "Request failed"); });
        return r.json();
      })
      .then(function () {
        closeEventModal();
        loadEvents();
        renderDayPanel(selectedDateKey);
      })
      .catch(function (err) {
        alert(t("msgError"));
      });
  });

  document.getElementById("eventDelete").addEventListener("click", function () {
    const id = eventId.value;
    if (!id || !confirm(t("confirmDelete"))) return;
    fetch("/api/events/" + id, { method: "DELETE" })
      .then(checkAuth)
      .then(function (r) {
        if (!r.ok) throw new Error("Delete failed");
        closeEventModal();
        loadEvents();
        renderDayPanel(selectedDateKey);
      })
      .catch(function () {
        alert(t("msgDeleteFailed"));
      });
  });

  document.getElementById("eventViewEdit").addEventListener("click", showEventFormForEdit);

  document.getElementById("eventViewDelete").addEventListener("click", function () {
    const id = eventId.value;
    if (!id || !confirm(t("confirmDelete"))) return;
    fetch("/api/events/" + id, { method: "DELETE" })
      .then(checkAuth)
      .then(function (r) {
        if (!r.ok) throw new Error("Delete failed");
        closeEventModal();
        loadEvents();
        renderDayPanel(selectedDateKey);
      })
      .catch(function () {
        alert(t("msgDeleteFailed"));
      });
  });

  document.getElementById("modalClose").addEventListener("click", closeEventModal);
  document.getElementById("modalBackdrop").addEventListener("click", closeEventModal);

  document.getElementById("dayPanelAddBtn").addEventListener("click", function () {
    if (selectedDateKey) openEventModal(null, selectedDateKey);
  });

  document.getElementById("prevMonth").addEventListener("click", function () {
    if (currentMonth === 0) {
      setMonth(currentYear - 1, 11);
    } else {
      setMonth(currentYear, currentMonth - 1);
    }
  });

  document.getElementById("nextMonth").addEventListener("click", function () {
    if (currentMonth === 11) {
      setMonth(currentYear + 1, 0);
    } else {
      setMonth(currentYear, currentMonth + 1);
    }
  });

  function renderSchoolOptionsLists() {
    var classListEl = document.getElementById("schoolOptionsClassList");
    var teacherListEl = document.getElementById("schoolOptionsTeacherList");
    if (!classListEl || !teacherListEl) return;
    classListEl.innerHTML = "";
    classes.forEach(function (c) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + escapeHtml(c.name) + "</span><button type=\"button\" class=\"remove-btn\" data-id=\"" + c.id + "\" data-type=\"class\">" + t("remove") + "</button>";
      classListEl.appendChild(li);
      li.querySelector(".remove-btn").addEventListener("click", function () {
        fetch("/api/classes/" + c.id, { method: "DELETE" })
          .then(checkAuth)
          .then(function (r) {
            if (!r.ok) return;
            loadClassesAndTeachers().then(function () { renderSchoolOptionsLists(); });
            loadEvents();
            renderDayPanel(selectedDateKey);
          });
      });
    });
    teacherListEl.innerHTML = "";
    teachers.forEach(function (tItem) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + escapeHtml(tItem.name) + "</span><button type=\"button\" class=\"remove-btn\" data-id=\"" + tItem.id + "\" data-type=\"teacher\">" + t("remove") + "</button>";
      teacherListEl.appendChild(li);
      li.querySelector(".remove-btn").addEventListener("click", function () {
        fetch("/api/teachers/" + tItem.id, { method: "DELETE" })
          .then(checkAuth)
          .then(function (r) {
            if (!r.ok) return;
            loadClassesAndTeachers().then(function () { renderSchoolOptionsLists(); });
            loadEvents();
            renderDayPanel(selectedDateKey);
          });
      });
    });
  }

  function openUserMenuDropdown() {
    var dd = document.getElementById("userMenuDropdown");
    if (dd) dd.removeAttribute("hidden");
    var trigger = document.getElementById("userMenuTrigger");
    if (trigger) trigger.setAttribute("aria-expanded", "true");
  }

  function closeUserMenuDropdown() {
    var dd = document.getElementById("userMenuDropdown");
    if (dd) dd.setAttribute("hidden", "");
    var trigger = document.getElementById("userMenuTrigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  document.getElementById("userMenuTrigger").addEventListener("click", function (e) {
    e.stopPropagation();
    var dd = document.getElementById("userMenuDropdown");
    if (dd && dd.hasAttribute("hidden")) {
      openUserMenuDropdown();
    } else {
      closeUserMenuDropdown();
    }
  });

  document.addEventListener("click", function () {
    closeUserMenuDropdown();
  });

  document.getElementById("userMenu").addEventListener("click", function (e) {
    e.stopPropagation();
  });

  document.getElementById("userMenuSchoolOptions").addEventListener("click", function () {
    closeUserMenuDropdown();
    document.getElementById("schoolOptionsModal").hidden = false;
    loadClassesAndTeachers().then(function () { renderSchoolOptionsLists(); });
  });

  document.getElementById("schoolOptionsModalClose").addEventListener("click", function () {
    document.getElementById("schoolOptionsModal").hidden = true;
  });
  document.getElementById("schoolOptionsModalBackdrop").addEventListener("click", function () {
    document.getElementById("schoolOptionsModal").hidden = true;
  });

  document.getElementById("schoolOptionsClassForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var nameEl = document.getElementById("schoolOptionsClassName");
    var name = nameEl.value.trim();
    if (!name) return;
    fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    })
      .then(checkAuth)
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || "Failed"); });
        return r.json();
      })
      .then(function (c) {
        classes.push(c);
        renderCheckboxes();
        renderSchoolOptionsLists();
        nameEl.value = "";
      })
      .catch(function (err) {
        alert(t("msgFailed"));
      });
  });

  document.getElementById("schoolOptionsTeacherForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var nameEl = document.getElementById("schoolOptionsTeacherName");
    var name = nameEl.value.trim();
    if (!name) return;
    fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    })
      .then(checkAuth)
      .then(function (r) {
        if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || "Failed"); });
        return r.json();
      })
      .then(function (tNew) {
        teachers.push(tNew);
        renderCheckboxes();
        renderSchoolOptionsLists();
        nameEl.value = "";
      })
      .catch(function (err) {
        alert(t("msgFailed"));
      });
  });

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var label = document.getElementById("userMenuThemeLabel");
    if (label) label.textContent = theme === "light" ? t("themeDark") : t("themeLight");
  }

  var savedTheme = localStorage.getItem("theme") || "dark";
  applyTheme(savedTheme);

  document.getElementById("userMenuTheme").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });

  document.getElementById("userMenuLang").addEventListener("click", function () {
    currentLang = currentLang === "en" ? "el" : "en";
    localStorage.setItem("lang", currentLang);
    document.documentElement.setAttribute("lang", currentLang === "el" ? "el" : "en");
    applyTranslations();
  });

  document.documentElement.setAttribute("lang", currentLang === "el" ? "el" : "en");
  var now = new Date();
  selectedDateKey = dateKey(now);
  setMonth(now.getFullYear(), now.getMonth());
  loadClassesAndTeachers();
  applyTranslations();
  renderDayPanel(selectedDateKey);
})();
