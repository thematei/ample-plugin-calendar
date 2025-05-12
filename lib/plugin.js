(() => {

  var pluginState = {
    jots: [],
    weekJots: [],
    monthJots: [],
    fdow: "1", //default value Monday as fallback
  };

  //TODO add getter and setter methods for the pluginState 
  function getState() {
    return { ...pluginState };
  }

  function setState(paramState) { //TODO implement deep copy
    let newState = { ...pluginState };
    ["jots", "weekJots", "monthJots", "fdow"].forEach((field) => {
      if (stateObject[field]) newState[field] = paramState[field];
    });
    return newState;
  }

  const pluginConstants = {
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    settings: {
      FDOW: "First Day of the Week (number)",
      TAGS: "Tags (separated by comma)",
    },
    settingsReport: {
      TAGS: "changed",
      FDOW: "configured",
      SAME: "unchanged",
      NONE: "canceled"
    },
    settingsPrompt: {
      inputs: [
        //Due to the implementation of the app.prompt dropdown, Sunday cannot have the value 0.
        //This is why fpConfig.locale.firstDayOfWeek will be assigned the value day%7. 
        //This turns Sunday from 7 to 0 and requires no change for the rest of the weekdays.
        { label: "First day of the week", type: "select", options: [{ label: "Monday", value: "1" }, { label: "Tuesday", value: "2" }, { label: "Wednesday", value: "3" }, { label: "Thursday", value: "4" }, { label: "Friday", value: "5" }, { label: "Saturday", value: "6" }, { label: "Sunday", value: "7" }] },
        { label: "Tags to filter jots by", type: "tags", limit: 3 },
      ],
    },
    classes: {
      NOJOT: "no-jot",
    },
    jotTypes: {
      MONTH: "monthly",
      WEEK: "weekly",
      DAY: "daily"
    },
    hasTasks: {
      NONE: "none",
      SOME: "some",
      DONE: "done"
    },
    fpConfig: {
      dateFormat: "F J, Y",
      weekNumbers: true,
      clickOpens: false,
      inline: true,
      static: true,
      locale: {
        firstDayOfWeek: 1, //default value Monday as fallback
      }
    }
  };

  const pluginStyle = `body {
      background-color: #FFFFFF;
    }

    .centrer {
      display: flex;
      justify-content: center;
    }

    .calendar-container {
      width: 350px;
    }

    .no-jot {
      color: #b0b0b0 !important;
    }

    .no-jot:hover {
      cursor: default !important;
    }

    .prevMonthDay {
      color: #F0F0FF;
    }

    .nextMonthDay {
      color: #F0F0FF;
    }
    
    .event {
      position: absolute;
      font-size: 20px;
      top: -4px;
      right: -6px;
    }

    .event.some {
      color: #5985E1;
    }

    .event.done {
      color: #78A75A;
    }

    .notepad .event {
      right: -8px;
    }

    .smol-button {
      display: inline;
      margin-left: 6px;
    }

    .smol-button:last-child {
      display: inline;
      margin: 0px 3px 0px 6px;
    }

    .smol-button:hover {
      cursor: pointer;
    }

    .smol-button.hidden {
      color: #FFFFFF;
      cursor: default;
    }

    .smol-button.document {
      color: black;
    }

    .graphics-container {
      position: relative;
    }

    .mirror-icon {
      transform: scaleX(-1);
    }

    .flatpickr-calendar {
      line-height: 1.5;
      font-family: "Roboto", sans-serif;
      font-weight: 400;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    .flatpickr-current-month {
      display: flex;
      justify-content: space-evenly;
      align-items: center;
      padding-top: 0.2em;
      width: 84%;
      left: 8%;
    }

    .flatpickr-monthDropdown-months {
      text-align: center;
      padding-left: 0px !important;
    }

    .flatpickr-monthDropdown-month {
      text-align: center;
    }

    .flatpickr-weekwrapper {
      width: 40px;
    }

    .flatpickr-weeks {
      width: 40px;
      padding: 0px !important;
    }

    .flatpickr-weeks span.flatpickr-day, .flatpickr-weeks span.flatpickr-day:hover {
      color: #393939;
      cursor: pointer;
    }

    .ribbon {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      flex-wrap: nowrap;
      height: 2.6rem;
      line-height: 1.25rem;
      font-family: "Roboto", sans-serif;
      font-weight: 400;
    }

    .tags {
      display: flex;
      width: 83%; /* just enough to leave a four-digit jot count number displayed */
      flex-wrap: nowrap;
      align-items: center;
      overflow-x: scroll;
      scrollbar-width: none;
      text-wrap: nowrap;
      padding: 0 1px;
    }

    .tag-chip {
      border-radius: 16px;
      background-color: #ffffff;
      color: rgba(0, 0, 0, 0.87);
      font-size: 0.875rem;
      line-height: 1.25rem;
      font-family: "Roboto", sans-serif;
      font-weight: 400;
      height: 32px;
      display: inline-flex;
      align-items: center;
      padding: 0 12px;
      border-width: 0;
      outline: none;
      cursor: pointer;
      box-shadow: 1px 0 0 #e6e6e6, -1px 0 0 #e6e6e6, 0 1px 0 #e6e6e6, 0 -1px 0 #e6e6e6, 0 3px 13px rgba(0, 0, 0, 0.08);

    }

    .jot-count {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      width: 17%; /* precise to meet the color of left-scrolled tags*/
      box-shadow: 3px 0 8px 0 #fbfbfb inset;
      color: #b0b0b0;
      background: #FFFFFF;
    }`;

  async function updateSettingsPromise(app, firstDayOfWeek, tags) {
    let promises = [];

    if (firstDayOfWeek) promises.push(app.setSetting(pluginConstants.settings.FDOW, firstDayOfWeek));
    if (tags) promises.push(app.setSetting(pluginConstants.settings.TAGS, tags));

    return Promise.all(promises);
  }

  /**
   * This converts the fpConfig object and its handlers into strings.
   * The concatenated result can be then passed as a parameter to the renderEmbed function in order to configure the flatpickr calendar instance.
   * 
   * @param {*} config The default configuration object for the flatpickr calendar instance
   * @param {*} handlers The handlers that need to be converted into string for the calendar hooks
   * @returns A string version of the configuration object, complete with handlers
   */
  function assembledFlatpickrConfigurationObject(app, config, handlers) {
    const firstDayOfWeek = app.settings[pluginConstants.settings.FDOW] % 7; //this turns Sunday from a 7 to a 0
    //TODO convert to string
    const updatedFpConfig = { ...config, locale: { firstDayOfWeek }, ...handlers };

    console.log("assembled", updatedFpConfig);

    return updatedFpConfig;
    return { ...config, locale: { firstDayOfWeek }, ...handlers };
  }

  async function fetchNotesPromise(app, tag) {
    return app.filterNotes({ tag });
  }
  async function fetchWeekNotesPromise(app, tag, year) {
    const query = "Week of " + year;
    return app.filterNotes({ query, tag });
  }
  async function fetchMonthNotesPromise(app, tag, year) {
    const query = "Month of " + year;
    return app.filterNotes({ query, tag });
  }

  async function checkForTasksPromises(app, notes) {
    const tasks = pluginConstants.hasTasks;
    const todo = (task) => (!task.completedAt && !task.dismissedAt);
    //For every note, fetches the tasks and returns a note object with an up-to-date hasTasks status field
    return Promise.all(
      notes.map((n) => {
        return new Promise((resolve) => {
          app.getNoteTasks(n, { includeDone: true })
            .then((taskList) => {
              const hasTasks = (taskList.length === 0) ? tasks.NONE : (taskList.some(todo) ? tasks.SOME : tasks.DONE);
              resolve({ ...n, hasTasks });
            });
        })
      }),
    );
  }

  /**
   * This function uses regex matching to filter the noteHandles which contain a day, a month and a year in the name.
   * The order of these elements (d, m, y) is irrelevant, as are commas or other words in the name.
   * Days can have ordinal suffixes (e.g. 3rd, 14th etc.)
   * Months can either be the full month name, or the first three letters, capitalized. (e.g. Feb or February)
   * Years are four-digit numbers.
   * @returns a list of { day, month, year, uuid } objects for every elligible note.
   */
  function filterNotesWithDates(notes) {
    const jotType = pluginConstants.jotTypes;

    const dateFormatRegex = /(?<day>\b\d{1,2}(?:st|nd|rd|th)?\b)|(?<month>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)|(?<year>\b\d{4}\b)/g;

    const filteredDatedNotes = notes.reduce((datedNotes, currentNote) => {
      let datedNote = { uuid: currentNote.uuid };

      //Adds the last matched value (d/m/y) to the appropriate field of the dated note object
      [...currentNote.name.matchAll(dateFormatRegex)].forEach(({ groups }) => {
        ["day", "month", "year"].forEach((field) => {
          if (groups[field]) datedNote[field] = groups[field];
        });
      });

      //If one of the fields (d/m/y) is missing, returns false
      const isNoteElligible = ["day", "month", "year"].reduce((res, field) => datedNote[field] && res, true);

      //Adds the note to the result, if elligible
      if (isNoteElligible) {
        datedNote.day = utilities.removeOrdinalSuffix(datedNote.day);
        datedNote.type = jotType.DAY;

        return [...datedNotes, datedNote];
      } else return datedNotes;

    }, []);
    return filteredDatedNotes;
  }
  function filterNotesWithWeeks(notes) {
    const jotType = pluginConstants.jotTypes;

    const dateFormatRegex = /^Week (?<week>\b[1-9]\d?) of (?<year>\b\d{4}\b)/gm;

    const filteredDatedNotes = notes.reduce((datedNotes, currentNote) => {
      let datedNote = { uuid: currentNote.uuid, type: jotType.WEEK };

      //This both tests for the regex and assigns the matched values to the new object
      [...currentNote.name.matchAll(dateFormatRegex)].forEach(({ groups }) => {
        if (groups.week) datedNote.week = groups.week;
        if (groups.year) datedNote.year = groups.year;
      });

      //Adds the note to the result, if elligible
      if (datedNote.week && datedNote.year) {
        return [...datedNotes, datedNote];
      } else return datedNotes;

    }, []);
    return filteredDatedNotes;
  }
  function filterNotesWithMonths(notes) {
    const jotType = pluginConstants.jotTypes;

    const dateFormatRegex = /^Month of (?<month>Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?), (?<year>\b\d{4}\b)/gm;

    const filteredDatedNotes = notes.reduce((datedNotes, currentNote) => {
      let datedNote = { uuid: currentNote.uuid, type: jotType.MONTH };

      //This both tests for the regex and assigns the matched values to the new object
      [...currentNote.name.matchAll(dateFormatRegex)].forEach(({ groups }) => {
        if (groups.month) datedNote.month = groups.month;
        if (groups.year) datedNote.year = groups.year;
      });

      //Adds the note to the result, if elligible
      if (datedNote.month && datedNote.year) {
        return [...datedNotes, datedNote];
      } else return datedNotes;

    }, []);
    return filteredDatedNotes;
  }

  function getJotForDate(jots, date) {
    const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
    const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
    return jots.find((n) => (isSameDate(n)));
  }
  function getWeekJotForWeek(jots, weekNumber, year) {
    const isWeeklyNote = (jot) => (jot.type === pluginConstants.jotTypes.WEEK);
    const matchesWeek = (jot) => (jot.week == weekNumber && jot.year == year);
    return jots.find((n) => (isWeeklyNote(n) && matchesWeek(n)));
  }
  function getMonthJot(jots, calendarDate) {
    const isMonthlyNote = (jot) => (jot.type === pluginConstants.jotTypes.MONTH);
    const matchesMonth = (jot) => (pluginConstants.monthNames[calendarDate.getMonth()] == jot.month && calendarDate.getFullYear() == jot.year);
    return jots.find((n) => (isMonthlyNote(n) && matchesMonth(n)));
  }

  function groomedElement(calendarElement, jotExists, hasTasks) {
    if (!jotExists)
      calendarElement.className += " no-jot";
    else if (hasTasks && hasTasks !== pluginConstants.hasTasks.NONE)
      calendarElement.append(utilities.getMaterialIcon("priority", "event", hasTasks));
    return calendarElement;
  }

  function drawTodayButton(fpInstance, onClick) {
    const oldTodayButton = document.getElementById("todayButton");
    const todayButton = document.createElement("div");
    todayButton.setAttribute("id", "todayButton");
    todayButton.setAttribute("class", "smol-button hidden");
    todayButton.append(utilities.getMaterialIcon("prompt_suggestion"));

    const today = new Date();
    if (fpInstance.currentMonth !== today.getMonth() || fpInstance.currentYear !== today.getFullYear()) {
      todayButton.setAttribute("class", "smol-button");
      todayButton.addEventListener("click", () => {
        onClick(today);
      });
    }

    if (oldTodayButton) oldTodayButton.remove();
    document.querySelector(".flatpickr-current-month").prepend(todayButton); //TODO maybe pass document as param?
  }

  function drawRefreshButton(onClick) {
    const oldRefreshButton = document.getElementById("refreshButton");
    const refreshButton = document.createElement("div");
    refreshButton.setAttribute("id", "refreshButton");
    refreshButton.setAttribute("class", "smol-button refresh");
    refreshButton.append(utilities.getMaterialIcon("refresh"));
    refreshButton.addEventListener("click", () => {
      onClick();
    });

    if (oldRefreshButton) oldRefreshButton.remove();
    document.querySelector(".flatpickr-current-month").prepend(refreshButton);
  }

  function drawSettingsButton(onClick) {
    const oldSettingsButton = document.getElementById("settingsButton");
    const settingsButton = document.createElement("div");
    settingsButton.setAttribute("id", "settingsButton");
    settingsButton.setAttribute("class", "smol-button settings");
    settingsButton.append(utilities.getMaterialIcon("settings"));
    settingsButton.addEventListener("click", () => {
      onClick();
    });
    if (oldSettingsButton) oldSettingsButton.remove();
    document.querySelector(".flatpickr-current-month").append(settingsButton);
  }

  function drawWeeklyNotes(fpInstance, onClick) {

    const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
    const weeks = document.querySelectorAll('.flatpickr-weeks .flatpickr-day');

    weeks.forEach((element) => {

      const weekNumber = element.textContent;

      window.callAmplenotePlugin("draw-week", currentDate, shiftPressed, weekNumber)
        .then(([hasJot, hasTasks]) => {
          if (hasJot) {
            if (hasTasks !== "none")
              element.append(utilities.getMaterialIcon("priority", "event", hasTasks));
          } else {
            //TODO add css classes to constants
            element.className += " no-jot";
          }
        });

      //attach the click handler to navigate/create to the content of the note
      element.addEventListener('click', () => onClick(currentDate, weekNumber));
    });
  }

  function drawMonthlyJotButton(fpInstance, onClick) {
    const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);

    const existingButton = document.querySelector("div.smol-button.notepad");

    const monthlyJotButton = document.createElement("div");
    monthlyJotButton.className = "smol-button notepad";
    const buttonGraphicsContainer = document.createElement("div");
    buttonGraphicsContainer.className = "graphics-container";
    buttonGraphicsContainer.append(utilities.getMaterialIcon("description", "mirror-icon"));
    monthlyJotButton.append(buttonGraphicsContainer);
    monthlyJotButton.addEventListener("click", () => {
      onClick(fpInstance);
    });

    window.callAmplenotePlugin("draw-month", currentDate, shiftPressed)
      .then(([hasJot, hasTasks]) => {
        if (hasJot) {
          if (hasTasks !== "none")
            monthlyJotButton.firstChild.append(utilities.getMaterialIcon("priority", "event", hasTasks));
        } else {
          //TODO add css classes to constants
          monthlyJotButton.className += " no-jot";
        }
      });

    if (existingButton) existingButton.remove();
    document.querySelector(".flatpickr-current-month").prepend(monthlyJotButton);
  }

  function drawRibbon(fpInstance, userTags, jotsCount) {

    const ribbon = document.getElementById("ribbon");

    const userTagDisplay = document.createElement("div");
    userTags.split(",").forEach((tag) => {
      const tagElement = document.createElement("div");
      tagElement.setAttribute("class", "tag-chip");
      tagElement.append(utilities.getMaterialIcon("tag"), tag);
      userTagDisplay.append(tagElement);
    });
    userTagDisplay.setAttribute("class", "tags");
    userTagDisplay.addEventListener("click", () => {
      console.log("tag settings clicked!")
      handleSettings(fpInstance);
    });

    const jotCount = document.createElement("div");
    jotCount.setAttribute("class", "jot-count");
    jotCount.append(jotsCount, utilities.getMaterialIcon("description"));

    ribbon.replaceChildren(userTagDisplay, jotCount);
  }

  var utilities = {
    //This function would be useful if weekly jots had a date in the name
    getWeekOfDate: function (date, firstDayOfWeek = 1) {
      //Navigate to last day of week
      date.setDate(date.getDate() + ((firstDayOfWeek + 7 - date.getDay() - 1) % 7));
      return this.getWeekCount(date);
    },
    //Returns the number of the week whose last day matches the date in params
    //This implementation fits the adopted plugin logic of establishing the week number based on the first day of the week
    getWeekCount: function (lastDateOfWeek) {
      //Calculate elapsed days since start of year
      const yearStart = new Date(lastDateOfWeek.getFullYear(), 0, 1);
      const msInDay = 1000 * 60 * 60 * 24;
      const daysDiff = Math.floor((lastDateOfWeek - yearStart) / msInDay);
      //Calculate week number based on elapsed days
      return Math.floor(daysDiff / 7) + 1;
    },
    removeOrdinalSuffix: function (date) {
      const suffixRegex = /(st|nd|rd|th)\b/g;
      return date.replace(suffixRegex, "");
    },
    getMaterialIcon: function (name, ...classes) {
      const newIconElement = document.createElement("span");
      const concatenatedClasses = classes.reduce((acc, cur) => (acc + " " + cur), "material-symbols-outlined");
      newIconElement.setAttribute("class", concatenatedClasses);
      newIconElement.textContent = name;
      return newIconElement;
    },
  }

  var helpers = {
    handleSettings: function (fpInstance) {
      window.callAmplenotePlugin("settings").then(({ status, firstDayOfWeek, tags }) => {

        switch (status) {
          case "${changed.TAGS}":
            console.log("settings changed to", firstDayOfWeek, tags);
            firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
            fpInstance.set("locale", { firstDayOfWeek });
            fetchNotes(fpInstance, true);
            break;
          case "${changed.FDOW}":
            console.log("calendar was reconfigured");
            fpInstance.set("locale", { firstDayOfWeek });
            redrawCalendar(fpInstance);
            break;
          case "${changed.SAME}":
            console.log("settings were not changed");
            break;
          case "${changed.NONE}":
            console.log("changing settings was cancelled");
            break;
        }
      });
    },

    fetchNotes: function (fpInstance, triggerRefresh) {
      //TODO test whether fpInstance is ever null

    },

    navigateToWeeklyJot: function (fpInstance, currentDate, weekNumber) {
      window.callAmplenotePlugin("navigate-week", currentDate, shiftPressed, weekNumber)
        .then(() => {
          fpInstance.selectedDates = [];
          redrawCalendar(fpInstance);
        });
    },

    navigateToMonthlyJot: function (fpInstance) {
      const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      window.callAmplenotePlugin("navigate-month", currentDate, shiftPressed)
        .then(() => {
          fpInstance.selectedDates = [];
          redrawCalendar(fpInstance);
        })
    },

    refreshRibbon: function (fpInstance) {
      window.callAmplenotePlugin("refresh")
        .then((args) => drawRibbon(fpInstance, ...args));
    },

    redrawCalendar: function (fp) {
      fp.redraw();
      drawMonthlyJotButton(fp, () => {
        navigateToMonthlyJot(fp);
      });
      drawRefreshButton(() => {
        fetchNotes(true, fp);
      });
      drawTodayButton(fp, (todaysDate) => {
        fp.jumpToDate(todaysDate, true);
        redrawCalendar(fpInstance);
      });
      drawSettingsButton(() => {
        handleSettings(fp);
      });
      drawWeeklyNotes(fp, (currentDate, weekNumber) => {
        navigateToWeeklyJot(fp, currentDate, weekNumber);
      });
      refreshRibbon(fp);
    }
  }

  var handlers = {
    getWeek: (date) => {
      //This simple implementation is possible because 
      // by default, flatpickr passes the last day of the week as a parameter to this hook
      return window.callAmplenotePlugin("getWeek", date).then(weekNumber => (weekNumber));
    },
    onReady: (_, __, fp) => {
      console.log("onReady triggered!");
      const thisYearDate = new Date(fp.currentYear, fp.currentMonth);
      window.callAmplenotePlugin("fetch", thisYearDate).then(() => {
        helpers.redrawCalendar(fp); //TODO add redrawCalendar to config methods string
      });
    },
    onMonthChange: (_, __, fp) => {
      console.log("onMonthChange called");
      helpers.redrawCalendar(fp); //TODO add redrawCalendar to config methods string
    },
    onYearChange: (_, __, fp) => {
      console.log("onYearChange called");
      helpers.redrawCalendar(fp); //TODO add redrawCalendar to config methods string
    },
    onChange: (selectedDates, dateStr, fp) => {
      window.callAmplenotePlugin("navigate",
        selectedDates[0], //selected date object
        shiftPressed, //variable declared within rendered script
        dateStr, //string, name of selected date (matches plugin note naming convention)
      );
      drawWeeklyNotes(fp, (currentDate, weekNumber) => { //TODO refresh weekly notes display (required because of flatpickr unoverridable default onChange behavior)
        helpers.navigateToWeeklyJot(fp, currentDate, weekNumber);
      });
    },
    onDayCreate: (_, __, ___, dayElem) => {
      console.log("onDayCreate triggered");
      window.callAmplenotePlugin("draw", dayElem)
        //.then((newDayElem) => dayElem.replaceWith(newDayElem));
        .then((newDayElem) => {
          console.log("Replacing", dayElem, "with", newDayElem);
          dayElem.replaceWith(newDayElem);
        });
      //   ([hasJot, hasTasks]) => {
      //   if (hasJot) {
      //     if (hasTasks !== "none")
      //       dayElem.append();
      //   } else {
      //     //TODO add css classes to constants
      //     dayElem.className += " no-jot";
      //   }
      // });
    },
  }

  var plugin = {

    _state: pluginState, //TODO replace with function, assign getState

    _constants: pluginConstants,

    validateSettings(app, settings) {
      const firstDayOfWeek = settings[this._constants.settings.FDOW];
      const isValidFDOW = /^[1-7]$/.test(firstDayOfWeek);
      const verdictFDOW = isValidFDOW ? "" : "The first day of the week needs to be a number value between 1 and 7, where 1 = Monday, 2 = Tuesday etc.";

      const tags = settings[this._constants.settings.TAGS];
      const individualTags = tags.split(",");
      const isValidTags = individualTags.reduce((isValid, tag) => {
        return isValid && /^\^?[\w\-]+(?:\/?[\w\-]+)*$/.test(tag);
      }, true);
      const verdictTags = isValidTags ? "" : "The tags you have chosen are not valid. Please write the individual tags as strings, separated by a comma, without trailing spaces or commas."

      return [verdictFDOW, verdictTags];
    },
    appOption(app) {
      const fpDefaults = this._constants.fpConfig;
      const fpHandlers = handlers; //TODO
      const fpConfig = assembledFlatpickrConfigurationObject(app, fpDefaults, fpHandlers);
      app.openSidebarEmbed(1, fpConfig, pluginStyle);
    },
    async onEmbedCall(app, callType, date, shiftPressed, dayName) {

      const pluginConstants = this._constants;

      const pluginState = this._state; //TODO replace with this.getState();

      const [currentFDOW, currentTags] = [app.settings[this._constants.settings.FDOW], app.settings[this._constants.settings.TAGS]];

      switch (callType) {
        case "settings":
          const settingsPrompt = this._constants.settingsPrompt;
          settingsPrompt.inputs[0].value = currentFDOW;
          settingsPrompt.inputs[1].value = currentTags;

          const changed = this._constants.settingsReport;

          const userSettings = await app.prompt("Settings", settingsPrompt);

          if (userSettings) {
            console.log("userSettings", userSettings);
            const [firstDayOfWeek, tags] = userSettings;

            const status = currentTags !== tags ? changed.TAGS : (currentFDOW !== firstDayOfWeek ? changed.FDOW : changed.SAME);

            return updateSettingsPromise(app, firstDayOfWeek, tags).then(() => {

              this._state.fdow = currentFDOW;

              return Promise.resolve({ status, firstDayOfWeek, tags });
            });
          } else {
            return { status: changed.NONE };
          }
        case "fetch":
          const userTags = app.settings[this._constants.settings.TAGS];

          //TODO EXTRA if tags have a - at the start (-tag), treat them as exclusions (^tag) because that is how they are loaded from the plugin settings into the app.prompt

          return Promise.all([
            fetchNotesPromise(app, userTags).then(
              (notes) => {
                const simpleNotes = filterNotesWithDates(notes);
                checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  pluginState.jots = [];
                  notesWithTaskStatus.forEach((note) => pluginState.jots.push(note));
                });
              }
            ),
            fetchWeekNotesPromise(app, userTags, date.getFullYear()).then(
              (notes) => {
                const simpleNotes = filterNotesWithWeeks(notes);
                checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  pluginState.weekJots = [];
                  notesWithTaskStatus.forEach((note) => pluginState.weekJots.push(note));
                });
              }
            ),
            fetchMonthNotesPromise(app, userTags, date.getFullYear()).then(
              (notes) => {
                const simpleNotes = filterNotesWithMonths(notes);
                checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  pluginState.monthJots = [];
                  notesWithTaskStatus.forEach((note) => pluginState.monthJots.push(note));
                });
              }
            )
          ])
        case "refresh":
          return [currentTags, this._state.jots.length];
        case "draw":
          //This receives a dayElement instead of the date parameter
          const jot = getJotForDate(this._state.jots, date.dateObj);
          return groomedElement(date, !!jot, jot && jot.hasTasks);
        case "navigate":
          const note = getJotForDate(this._state.jots, date);

          if (note) {
            app.navigate(`https://www.amplenote.com/notes/${note.uuid}`);
          }
          else if (shiftPressed) {
            const currentTagsArray = currentTags.split(",");
            await app.createNote(dayName, currentTagsArray)
              .then((uuid) => {
                app.navigate(`https://www.amplenote.com/notes/${uuid}`);
                const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
                this._state.jots.push({ day, month, year, uuid, hasTasks: pluginConstants.hasTasks.NONE });
              });
          }
          break;
        case "draw-week":
          const weekNumber = dayName;
          const weekJot = getWeekJotForWeek(this._state.weekJots, weekNumber, date.getFullYear());

          return [!!weekJot, weekJot && weekJot.hasTasks];
        case "navigate-week":
          const week = dayName;
          const weekNote = getWeekJotForWeek(this._state.weekJots, week, date.getFullYear());
          if (weekNote) {
            app.navigate(`https://www.amplenote.com/notes/${weekNote.uuid}`);
          }
          else if (shiftPressed) {
            const currentTagsArray = currentTags.split(",");
            dayName = "Week " + week + " of " + date.getFullYear();
            await app.createNote(dayName, currentTagsArray)
              .then((uuid) => {
                app.navigate(`https://www.amplenote.com/notes/${uuid}`);
                const [year, hasTasks, type] = [date.getFullYear(), pluginConstants.hasTasks.NONE, pluginConstants.jotTypes.WEEK];
                this._state.weekJots.push({ year, week, uuid, hasTasks, type });
              });
          }
          break;
        case "draw-month":
          const monthJot = getMonthJot(this._state.monthJots, date);

          return [!!monthJot, monthJot && monthJot.hasTasks];;
        case "navigate-month":
          const monthName = pluginConstants.monthNames[date.getMonth()];
          const monthNote = getMonthJot(this._state.monthJots, date);

          if (monthNote) {
            app.navigate(`https://www.amplenote.com/notes/${monthNote.uuid}`);
          }
          else if (shiftPressed) {
            const currentTagsArray = currentTags.split(",");
            const monthlyNoteName = "Month of " + monthName + ", " + date.getFullYear();
            await app.createNote(monthlyNoteName, currentTagsArray)
              .then((uuid) => {
                app.navigate(`https://www.amplenote.com/notes/${uuid}`);
                const [year, month, hasTasks, type] = [date.getFullYear(), monthName, pluginConstants.hasTasks.NONE, pluginConstants.jotTypes.MONTH];
                this._state.monthJots.push({ year, month, uuid, hasTasks, type });
              });
          }
          break;
        case "getWeek":
          return utilities.getWeekCount(date);
        default:
          console.log("Warning! Wrong call type provided!");
          return;
      }
    },
    async renderEmbed(app, fpConfig, pluginStyle) {

      //const pluginConstants = this._constants;

      //const pluginState = this._state; //TODO replace with getState();

      //const changed = pluginConstants.settingsReport;

      //const fdow = pluginState.fdow;

      return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${pluginStyle}
  </style>
</head>

<body>
    <div class="centrer">
      <div class="calendar-container">
        <div class="datepicker-root" id="datepicker"></div>
        <div class="ribbon" id="ribbon"></div>
      </div>
  </div>
  <script>

    var fpInstance = null;

    var shiftPressed = false;

    function _loadLibrary(url) {
      return new Promise(function (resolve) {
        const script = document.createElement("script");
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", url);
        script.addEventListener("load", function () {
          resolve(true);
        });
        document.head.prepend(script);
      });
    };

    function _loadStyles(url) {
      return new Promise(function (resolve) {
        const sheet = document.createElement("link");
        sheet.setAttribute("rel", "stylesheet");
        sheet.setAttribute("href", url);
        sheet.addEventListener("load", function () {
          resolve(true);
        });
        document.head.prepend(sheet);
      });
    };

    Promise.all([
      _loadLibrary("https://cdn.jsdelivr.net/npm/flatpickr"),
      _loadStyles("https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css"),
      _loadStyles("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,1,0..200&icon_names=description,priority,prompt_suggestion,refresh,settings,tag&display=block")
    ]).then(() => {
        if (fpInstance) {
          //TODO this code never seems to be invoked. Maybe remove it?
          console.log("Now destroying previous instance");
          fpInstance.destroy();
        }
        fpInstance = flatpickr("#datepicker", ${fpConfig});
      });

    // Detect when the Shift key is pressed or released globally
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        shiftPressed = true;
        //TODO add class for hover function 
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        shiftPressed = false;
        //TODO add class for hover function 
      }
    });
  </script>
</body>

</html>`;
    }
  }
  return plugin;
})();
