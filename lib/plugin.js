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

    let handlersString = Object.keys(handlers).reduce((result, key) => (`${result},\n ${key}: ${handlers[key].toString()}`), "");

    const stringifiedFpConfig = JSON.stringify({ ...config, locale: { firstDayOfWeek } });

    return `${stringifiedFpConfig.slice(0, -1)} ${handlersString}}`;
  }

  function stringifiedHelpers() {
    const helperFunctions = helpers();

    let helpersString = Object.keys(helperFunctions).reduce((result, key) => (`${helperFunctions[key].toString()};\n ${result}`), "");

    return helpersString; //TODO cleanup logging after tests
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

  function updatedRibbon(ribbon, userTags, jotsCount) {
    //TODO attempt implementation without passing document as a param
    //TODO attempt implementation with passing document as param

    const userTagDisplay = utilities.newHTMLElement("div", undefined, "tags", userTags.split(",")
      .map((tag) => (utilities.newHTMLElement("div", undefined, "tag-chip", [utilities.getMaterialIcon("tag"), tag],
        [{ eventName: 'click', eventAction: () => handleSettings() }] //TODO make sure this handleSettings call works
      )))
    );

    const jotCount = utilities.newHTMLElement("div", undefined, "jot-count", [jotsCount, utilities.getMaterialIcon("description")]);

    ribbon.replaceChildren(userTagDisplay, jotCount);
    return ribbon;
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
    newHTMLElement: function (tagName = "div", id = "", className = "", children = [], eventListeners = []) {
      const newElement = document.createElement(tagName);
      newElement.id = id;
      newElement.className = className;
      children.forEach((child) => newElement.append(child));
      eventListeners.forEach(({ eventName, eventAction }) => newElement.addEventListener(eventName, eventAction));
      return newElement;
    },
  }

  var helpers = () => {

    let newHTMLElement = utilities.newHTMLElement;

    let getMaterialIcon = utilities.getMaterialIcon;

    function drawMonthlyJotButton(fpInstance, onClick) {
      const existingButton = document.querySelector("div.smol-button.notepad");

      const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      window.callAmplenotePlugin("draw-month", currentDate, shiftPressed).then((newMonthlyButton) => {
        newMonthlyButton.addEventListener('click', () => onClick());
        if (existingButton) existingButton.replaceWith(newMonthlyButton);
        else document.querySelector(".flatpickr-current-month").prepend(newMonthlyButton);
      });
    };

    function navigateToMonthlyJot(fpInstance) {
      const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      window.callAmplenotePlugin("navigate-month", currentDate, shiftPressed)
        .then(() => {
          fpInstance.selectedDates = [];
          redrawCalendar(fpInstance);
        })
    };

    function drawRefreshButton(onClick) {
      const oldRefreshButton = document.getElementById("refreshButton");
      const refreshButton = newHTMLElement("div", "refreshButton", "smol-button refresh", [getMaterialIcon("refresh")], [[{ eventName: "click", eventAction: () => onClick(today) }]]);
      if (oldRefreshButton) oldRefreshButton.replaceWith(refreshButton);
      else document.querySelector(".flatpickr-current-month").prepend(refreshButton);
    };

    function fetchNotes(fpInstance) {
      const thisYearDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);

      window.callAmplenotePlugin("fetch", thisYearDate).then(() => {
        redrawCalendar(fpInstance); //TODO add redrawCalendar to config methods string
      });
    };

    function drawTodayButton(fpInstance, onClick) {
      const oldTodayButton = document.getElementById("todayButton");
      let todayButton;
      const today = new Date();
      if (fpInstance.currentMonth !== today.getMonth() || fpInstance.currentYear !== today.getFullYear())
        todayButton = newHTMLElement("div", "todayButton", "smol-button", [getMaterialIcon("prompt_suggestion")], [{ eventName: "click", eventAction: () => onClick(today) }]);
      else
        todayButton = newHTMLElement("div", "todayButton", "smol-button hidden", [getMaterialIcon("prompt_suggestion")]);

      if (oldTodayButton) oldTodayButton.replaceWith(todayButton);
      else document.querySelector(".flatpickr-current-month").prepend(todayButton);
    };

    function drawSettingsButton(onClick) {
      const oldSettingsButton = document.getElementById("settingsButton");

      const settingsButton = newHTMLElement("div", "settingsButton", "smol-button settings", [getMaterialIcon("settings")], [{ eventName: "click", eventAction: () => onClick() }]);

      if (oldSettingsButton) oldSettingsButton.replaceWith(settingsButton);
      else document.querySelector(".flatpickr-current-month").append(settingsButton);
    };

    function handleSettings(fpInstance) {
      window.callAmplenotePlugin("settings").then(({ status, firstDayOfWeek, tags }) => {
        const changed = pluginConstants.settingsReport;
        switch (status) {
          case changed.TAGS:
            console.log("settings changed to", firstDayOfWeek, tags);
            firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
            fpInstance.set("locale", { firstDayOfWeek });
            fetchNotes(fpInstance, true);
            break;
          case changed.FDOW:
            console.log("calendar was reconfigured");
            fpInstance.set("locale", { firstDayOfWeek });
            redrawCalendar(fpInstance);
            break;
          case changed.SAME:
            console.log("settings were not changed");
            break;
          case changed.NONE:
            console.log("changing settings was cancelled");
            break;
        }
      });
    };

    function drawWeeklyNotes(fpInstance) {
      const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      const weeks = document.querySelectorAll('.flatpickr-weeks .flatpickr-day');
      window.callAmplenotePlugin("draw-weeks", currentDate, shiftPressed, undefined, weeks)
        .then((newWeekElements) => {
          newWeekElements.forEach((elem) => {
            elem.addEventListener('click', (event) => {
              navigateToWeeklyJot(fp, currentDate, event.target.textContent);
            });
          });
        });
    };

    function navigateToWeeklyJot(fpInstance, currentDate, weekNumber) {
      window.callAmplenotePlugin("navigate-week", currentDate, shiftPressed, weekNumber)
        .then(() => {
          fpInstance.selectedDates = [];
          redrawCalendar(fpInstance);
        });
    };

    function refreshRibbon() {
      const ribbonElement = document.getElementById("ribbon");
      window.callAmplenotePlugin("refresh", undefined, undefined, undefined, [ribbonElement]
        //.then((args) => drawRibbon(fpInstance, ...args));
        .then((newRibbonElement) => {
          ribbonElement.replaceWith(newRibbonElement);
        }));
    };

    function redrawCalendar(fp) {
      fp.redraw();
      drawMonthlyJotButton(fp, () => {
        navigateToMonthlyJot(fp);
      });
      drawRefreshButton(() => {
        fetchNotes(fp);
      });
      drawTodayButton(fp, (todaysDate) => {
        fp.jumpToDate(todaysDate, true);
        redrawCalendar(fpInstance);
      });
      drawSettingsButton(() => {
        handleSettings(fp);
      });
      drawWeeklyNotes(fp);
      refreshRibbon(fp);
    };

    return {
      newHTMLElement,
      getMaterialIcon,
      drawMonthlyJotButton,
      navigateToMonthlyJot,
      drawRefreshButton,
      fetchNotes,
      drawTodayButton,
      drawSettingsButton,
      handleSettings,
      drawWeeklyNotes,
      navigateToWeeklyJot,
      refreshRibbon,
      redrawCalendar,
    };
  };

  var handlers = {
    getWeek: (date) => {
      //This simple implementation is possible because 
      // by default, flatpickr passes the last day of the week as a parameter to this hook
      return window.callAmplenotePlugin("getWeek", date).then(weekNumber => (weekNumber));
    },
    onReady: (_, __, fp) => {
      console.log("onReady triggered!");
      fetchNotes(fp);
    },
    onMonthChange: (_, __, fp) => {
      console.log("onMonthChange called");
      redrawCalendar(fp); //TODO add redrawCalendar to config methods string
    },
    onYearChange: (_, __, fp) => {
      console.log("onYearChange called");
      redrawCalendar(fp); //TODO add redrawCalendar to config methods string
    },
    onChange: (selectedDates, dateStr, fp) => {
      window.callAmplenotePlugin("navigate",
        selectedDates[0], //selected date object
        shiftPressed, //variable declared within rendered script
        dateStr, //string, name of selected date (matches plugin note naming convention)
      ).then(() => {
        drawWeeklyNotes(fp);
      })
    },
    onDayCreate: (_, __, ___, dayElem) => {
      console.log("onDayCreate triggered");
      window.callAmplenotePlugin("draw", undefined, undefined, undefined, [dayElem])
        //.then((newDayElem) => dayElem.replaceWith(newDayElem));
        .then((newDayElem) => {
          console.log("Replacing", dayElem, "with", newDayElem); //TODO test if replaceWith call is required
          dayElem.replaceWith(newDayElem);
        });
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
      const pluginHelpers = stringifiedHelpers();
      app.openSidebarEmbed(1, fpConfig, pluginHelpers, pluginStyle);
    },
    async onEmbedCall(app, callType, date, shiftPressed, dayName, elements) {

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
          ]);
        case "refresh":
          //TODO add monthly and weekly jots to counter
          return updatedRibbon(elements[0], currentTags, this._state.jots.length);
        case "draw":
          //This receives a dayElement instead of the date parameter
          const jot = getJotForDate(this._state.jots, elements[0].dateObj);
          return groomedElement(elements[0], !!jot, jot && jot.hasTasks);
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
        case "draw-weeks":
          const newWeekElements = elements.map((calendarElement) => {
            const weekNumber = parseInt(calendarElement.textContent);
            const weekJot = getWeekJotForWeek(this._state.weekJots, weekNumber, date.getFullYear());
            return groomedElement(calendarElement, !!weekJot, weekJot && weekJot.hasTasks);
          });
          return newWeekElements;
        case "navigate-week":
          const week = parseInt(dayName);
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
          const buttonGraphicsContainer = utilities.newHTMLElement("div", undefined, "graphics-container", [utilities.getMaterialIcon("description", "mirror-icon")]);
          const monthButton = utilities.newHTMLElement("div", undefined, "smol-button notepad", [buttonGraphicsContainer]);
          const newButtonContent = groomedElement(monthButton.firstChild, !!monthJot, monthJot && monthJot.hasTasks);
          monthButton.replaceChildren(newButtonContent);
          return monthButton;
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
    async renderEmbed(app, fpConfig, pluginHelpers, pluginStyle) {

      console.log("GOT upon rendering", fpConfig, "\n", pluginHelpers);

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

    ${pluginHelpers}

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
})()