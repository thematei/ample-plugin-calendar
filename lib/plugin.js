(() => {

  var pluginState = {
    jots: [],
    weekJots: [],
    monthJots: [],
  };

  function getState() {
    return {
      jots: [...pluginState.jots],
      weekJots: [...pluginState.weekJots],
      monthJots: [...pluginState.monthJots]
    };
  }

  function setState(newState) {
    const prevState = getState();

    // Update only the fields that are provided
    if (newState.jots) pluginState.jots = [...newState.jots];
    if (newState.weekJots) pluginState.weekJots = [...newState.weekJots];
    if (newState.monthJots) pluginState.monthJots = [...newState.monthJots];

    // Compare states to detect changes
    const hasChanges = ['jots', 'weekJots', 'monthJots'].some(key => {
      if (!newState[key]) return false;
      if (prevState[key].length !== pluginState[key].length) return true;
      return prevState[key].some((note, index) => {
        const newNote = pluginState[key][index];
        return note.uuid !== newNote.uuid || note.hasTasks !== newNote.hasTasks;
      });
    });

    return hasChanges;
  }

  const pluginConstants = {
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    settings: {
      FDOW: "First Day of the Week (number)",
      TAGS: "Tags (separated by comma)",
      TASKS: "Task source (jots or domain)",
      DOMAIN: "Domain Id (pick from settings menu)",
    },
    settingsReport: {
      FETCH: "changed",
      REDRAW: "configured",
      NOCHANGE: "unchanged",
      NOTHING: "canceled"
    },
    taskSource: {
      JOTS: "jots",
      DOMAIN: "domain",
    },
    settingsPrompt: {
      inputs: [
        //Due to the implementation of the app.prompt dropdown, Sunday cannot have the value 0.
        //This is why fpConfig.locale.firstDayOfWeek will be assigned the value day%7. 
        //This turns Sunday from 7 to 0 and requires no change for the rest of the weekdays.
        { label: "First day of the week", type: "select", options: [{ label: "Monday", value: "1" }, { label: "Tuesday", value: "2" }, { label: "Wednesday", value: "3" }, { label: "Thursday", value: "4" }, { label: "Friday", value: "5" }, { label: "Saturday", value: "6" }, { label: "Sunday", value: "7" }] },
        { label: "Tags to filter jots by", type: "tags", limit: 3 },
        { label: "Task source", type: "radio", options: [{ label: "Show me tasks found in daily jots, regardless of scheduled dates", value: "jots" }, { label: "Show me scheduled tasks from a Task Domain, regardless of their location", value: "domain" }] },
        { label: "Task domain", type: "select", options: [] },
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
      pointer-events: none !important;
    }

    .no-jot:hover {
      cursor: default !important;
    }

    .no-jot.shift-clickable {
      cursor: pointer !important;
      pointer-events: auto !important;
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
      //color: #5985E1;
      color: #569ff7;
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
      pointer-events: none;
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
      justify-content: space-around;
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
      align-items: center;
      flex-wrap: nowrap;
      height: 2.6rem;
      line-height: 1.25rem;
      font-family: "Roboto", sans-serif;
      font-weight: 400;
    }

    .tags {
      display: flex;
      width: 91%;
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
      margin-right: 3px;
      border: solid 1px #e8e8e8;
      cursor: pointer;
      z-index: 0;
    }

    .tag-chip:hover {
      background-color: #f3f3f3;
    }

    .settings {
      border-radius: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 32px;
      width: 9%;
      color: rgba(0, 0, 0, 0.9);
      background-color: #FFFFFF;
      position: relative;
    }

    .settings-popup {
      position: absolute;
      right: 0;
      top: 110%;
      background: white;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      font-size: 14px;
      white-space: nowrap;
      visibility: hidden;
      opacity: 0;
      transition: visibility 0s, opacity 0.2s ease;
      z-index: 1000;
    }

    .settings:hover {
      background-color: #f3f3f3;
      cursor: pointer;
    }

    .settings:hover .settings-popup {
      visibility: visible;
      opacity: 1;
    }

    .settings-popup::after {
      content: '';
      position: absolute;
      right: 6px;
      bottom: 100%;
      border-width: 6px;
      border-style: solid;
      border-color: transparent transparent white transparent;
    }`;

  async function updateSettingsPromise(app, firstDayOfWeek, tags, taskSource, taskDomain) {
    let promises = [];

    if (firstDayOfWeek) promises.push(app.setSetting(pluginConstants.settings.FDOW, firstDayOfWeek));
    if (tags) promises.push(app.setSetting(pluginConstants.settings.TAGS, tags));
    if (taskSource) promises.push(app.setSetting(pluginConstants.settings.TASKS, taskSource));
    if (taskDomain) promises.push(app.setSetting(pluginConstants.settings.DOMAIN, taskDomain));

    return Promise.all(promises);
  }

  async function getUserDomainOptions(app) {
    const taskDomains = await app.getTaskDomains();
    const domainOptions = taskDomains.map(({ name, uuid }) => {
      return { label: name, value: uuid };
    });

    return domainOptions;
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

    return `${stringifiedFpConfig.slice(0, -1)} ${handlersString}\n}`;
  }

  function stringifiedHelpers() {
    const helperFunctions = helpers();

    return Object.keys(helperFunctions).reduce((result, key) => (`${helperFunctions[key].toString()};\n ${result}`), "");
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
        datedNote.day = utils.removeOrdinalSuffix(datedNote.day);
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

  function getJotForDate(date) {
    const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
    const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
    const state = getState();
    return state.jots.find((n) => (isSameDate(n)));
  }
  function getWeekJotForWeek(weekNumber, year) {
    const isWeeklyNote = (jot) => (jot.type === pluginConstants.jotTypes.WEEK);
    const matchesWeek = (jot) => (jot.week == weekNumber && jot.year == year);
    const state = getState();
    return state.weekJots.find((n) => (isWeeklyNote(n) && matchesWeek(n)));
  }
  function getMonthJot(calendarDate) {
    const isMonthlyNote = (jot) => (jot.type === pluginConstants.jotTypes.MONTH);
    const matchesMonth = (jot) => (pluginConstants.monthNames[calendarDate.getMonth()] == jot.month && calendarDate.getFullYear() == jot.year);
    const state = getState();
    return state.monthJots.find((n) => (isMonthlyNote(n) && matchesMonth(n)));
  }
  async function getActiveDomainName(app) {
    const domains = await app.getTaskDomains();
    const currentDomain = app.settings[pluginConstants.settings.DOMAIN];
    const currentDomainObject = domains.find((domain) => domain.uuid === currentDomain);
    const currentDomainName = currentDomainObject ? currentDomainObject.name : "task";
    return currentDomainName;
  }


  function getSettingsButtonModel(taskSource, taskDomainName) {
    //Pick icon based on parameter
    const settingsIconName = taskSource === pluginConstants.taskSource.JOTS ? "stylus" : "date_range";
    const popupMessage = taskSource === pluginConstants.taskSource.JOTS ?
      "Showing tasks from jots" :
      `Showing scheduled tasks from ${taskDomainName}`;
    //Create the popup element model
    const popupModel = utils.getElementModel("div", undefined, "settings-popup", [popupMessage]);
    //Create the icon element model
    const iconModel = utils.getMaterialIcon(settingsIconName);
    //Generates the settings button model with both icon and popup
    const settingsButtonModel = utils.getElementModel("div", "settings", "settings", [iconModel, popupModel]);
    return settingsButtonModel;
  }

  function getMonthlyButtonModel(date) {
    //This is required for button status-related formatting (e.g. font color, bubble visibility and color)
    const monthJot = getMonthJot(date);
    //This intermediate container is required for bubble formatting relative to the monthly button icon
    let buttonGraphicsContainer = utils.getElementModel("div", undefined, "graphics-container", [utils.getMaterialIcon("description", "mirror-icon")]);
    buttonGraphicsContainer = utils.groomedElementModel(buttonGraphicsContainer, !!monthJot, monthJot && monthJot.hasTasks);
    //Generating the actual monthly button model, with graphic container child model
    let monthlyButtonModel = utils.getElementModel("div", "monthlyButton", "smol-button notepad", [buttonGraphicsContainer]);
    monthlyButtonModel = utils.groomedElementModel(monthlyButtonModel, !!monthJot, undefined);
    return monthlyButtonModel;
  }
  function getTodayButtonModel(date) {
    const today = new Date();

    const todayButtonModel = utils.getElementModel("div", "todayButton", "smol-button", [utils.getMaterialIcon("prompt_suggestion")]);

    if (date.getMonth() == today.getMonth() && date.getFullYear() == today.getFullYear())
      todayButtonModel.className = `${todayButtonModel.className} hidden`;

    return todayButtonModel;
  }

  function getWeeklyButtonsModel(date) {
    //Make a list of all the weekNumbers we have to display according to date param
    //Start from the first week of the month (week containing first day of the month)...
    const firstWeekNumber = utils.getWeekOfDate(date);
    //...and add the next 5 week numbers incrementally (calendar always displays 6 weeks/month)
    const displayedWeekNumbers = Array.from({ length: 6 }, (_, i) => (firstWeekNumber + i));
    //Map the element models to the list of week days
    const newWeekElementsModels = displayedWeekNumbers.map((weekNo) => {
      const weekElementModel = utils.getElementModel("span", "week-" + weekNo, "flatpickr-day", [weekNo]);
      //Tweak week elements look according to existing weekly jots
      const weekJot = getWeekJotForWeek(weekNo, date.getFullYear());
      const groomedWeekElementModel = utils.groomedElementModel(weekElementModel, !!weekJot, weekJot && weekJot.hasTasks);
      return groomedWeekElementModel;
    });
    //Append all week element models to one weeks element model
    const weeksElementsModel = utils.getElementModel("div", "weeks", "flatpickr-weeks", newWeekElementsModels);
    return weeksElementsModel;
  }
  function getRibbon(userTags, taskSource, taskDomainName) {
    //Generates the tag list model
    const userTagDisplayModel = utils.getElementModel("div", "tags", "tags", userTags.split(",")
      .map((tag) => (utils.getElementModel("div", undefined, "tag-chip", [utils.getMaterialIcon("tag"), tag],
      )))
    );
    //TODO leave out taskSource parameter and implement setting lookup within getSettingsButtonModel()
    const settingsButtonModel = getSettingsButtonModel(taskSource, taskDomainName);
    //Appends the tag list and settings button models to the ribbon container model
    const ribbonElementModel = utils.getElementModel("div", "ribbon", "ribbon", [userTagDisplayModel, settingsButtonModel]);
    return ribbonElementModel;
  }

  var utils = {
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
    getElementModel: function (tagName = "div", id = "", className = "", children = []) {
      return { tagName, id, className, children };
    },
    getMaterialIcon: function (name, ...classes) {
      const concatenatedClasses = classes.reduce((acc, cur) => (acc + " " + cur), "material-symbols-outlined");
      return this.getElementModel("span", undefined, concatenatedClasses, [name]);
    },
    groomedElementModel: function (elementModel, jotExists, hasTasks) {
      if (!jotExists)
        elementModel.className += (elementModel.className ? " " : "") + "no-jot";
      else if (hasTasks && hasTasks !== pluginConstants.hasTasks.NONE)
        elementModel.children.push(this.getMaterialIcon("priority", "event", hasTasks));
      return elementModel;
    },
  }

  var helpers = () => {

    function newHTMLElement({ tagName, id, className, children }, onClickHandler) {
      const newElement = document.createElement(tagName);
      if (id) newElement.setAttribute("id", id);
      newElement.setAttribute("class", className);

      onClickHandler && newElement.addEventListener("click", (event) => {
        event.stopPropagation(); //Stop event from bubbling to prevent double-handling
        onClickHandler(event);
      });

      children.forEach((child) => {
        if (typeof (child) === "object") newElement.append(newHTMLElement(child));
        else newElement.append(child);
      });

      return newElement;
    };

    function replaceHTMLElement(queryIdentifier, destinationQueryIdentifier, newElementGeneratorFc, shouldPrepend) {
      const oldElement = document.querySelector(queryIdentifier);

      let newElement = newElementGeneratorFc();

      if (oldElement) oldElement.replaceWith(newElement);
      else {
        const attach = shouldPrepend ? "prepend" : "append";
        document.querySelector(destinationQueryIdentifier)[attach](newElement);
      }
    };

    function navigateToWeeklyJot(fpInstance, weekNumber) {
      const currentDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      window.callAmplenotePlugin("navigate-week", currentDate, shiftPressed, weekNumber)
        .then(() => {
          fpInstance.selectedDates = [];
          redrawCalendar(fpInstance);
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

    function fetchNotes(fpInstance) {
      const thisYearDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);

      window.callAmplenotePlugin("fetch", thisYearDate).then((hasChanges) => {
        hasChanges && redrawCalendar(fpInstance);
      });
    };

    function handleSettings(fpInstance) {
      window.callAmplenotePlugin("settings").then(({ status, statusOptions, firstDayOfWeek, tags, taskSource, domainId }) => {
        const requires = statusOptions;
        switch (status) {
          case requires.FETCH:
            console.log("settings changed to", firstDayOfWeek, tags, taskSource, domainId);
            firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
            fpInstance.set("locale", { firstDayOfWeek });
            fetchNotes(fpInstance);
            break;
          case requires.REDRAW:
            console.log("calendar was reconfigured");
            firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
            fpInstance.set("locale", { firstDayOfWeek });
            redrawCalendar(fpInstance);
            break;
          case requires.NOCHANGE:
            console.log("settings were not changed");
            break;
          case requires.NOTHING:
            console.log("changing settings was cancelled");
            break;
        };
      });
    };

    function redrawCalendar(fpInstance) {
      const displayedMonthsDate = new Date(fpInstance.currentYear, fpInstance.currentMonth);
      const [prepend, append] = [true, false];

      window.callAmplenotePlugin("refresh", displayedMonthsDate).then(({ monthlyButton, todayButton, weeklyButtons, ribbon }) => {
        fpInstance.redraw();

        replaceHTMLElement("#monthlyButton", ".flatpickr-current-month", () => {
          return newHTMLElement(monthlyButton, () => navigateToMonthlyJot(fpInstance));
        }, prepend);

        replaceHTMLElement("#todayButton", ".flatpickr-current-month", () => {
          return newHTMLElement(todayButton, () => {
            fpInstance.jumpToDate(new Date(), true);
            redrawCalendar(fpInstance);
          });
        }, prepend);

        replaceHTMLElement(".flatpickr-weeks", ".flatpickr-weekwrapper", () => {
          return newHTMLElement(weeklyButtons, (event) => {
            const clickedWeekNumber = event.target.textContent;
            //This test is for calendar entries with a bubble
            const foundWeekNumber = /\b[1-5]?\d(?:priority)?\b/.test(clickedWeekNumber);
            foundWeekNumber && navigateToWeeklyJot(fpInstance, clickedWeekNumber);
          });
        }, append);

        replaceHTMLElement("#ribbon", ".calendar-container", () => {
          return newHTMLElement(ribbon, (event) => handleSettings(fpInstance));
        }, append);
      });
    };

    return {
      newHTMLElement,
      replaceHTMLElement,
      navigateToWeeklyJot,
      navigateToMonthlyJot,
      fetchNotes,
      handleSettings,
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

      // Start periodic fetching
      setInterval(() => {
        fetchNotes(fp);
      }, 10000); // 10 seconds
    },
    onMonthChange: (_, __, fp) => {
      console.log("onMonthChange called");
      redrawCalendar(fp);
    },
    onYearChange: (_, __, fp) => {
      console.log("onYearChange called");
      redrawCalendar(fp);
    },
    onChange: (selectedDates, dateStr, fp) => {
      window.callAmplenotePlugin("navigate",
        selectedDates[0], //selected date object
        shiftPressed, //variable declared within rendered script
        dateStr, //string, name of selected date (matches plugin note naming convention)
      ).then(({ redraw }) => {
        redraw && redrawCalendar(fp);
        //TODO maybe only call drawWeeklyNotes(fp); unless date belongs to adjacent month?
      })
    },
    onDayCreate: (_, __, ___, dayElem) => {
      window.callAmplenotePlugin("draw", dayElem.dateObj)
        .then(({ className, children }) => {
          className && dayElem.classList.add(className);
          children.forEach((childElement) => dayElem.append(newHTMLElement(childElement)));
        });
    },
  }

  var plugin = {

    _state: () => getState(), //TODO replace with function, assign getState

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

      //TODO validate taskSource and taskDomain

      //TODO SUGGESTION add "disabled" setting or various operation modes (full, jots, due tasks, birthdays)

      return [verdictFDOW, verdictTags];
    },
    appOption(app) {
      const fpDefaults = this._constants.fpConfig;
      const fpHandlers = handlers;
      const fpConfig = assembledFlatpickrConfigurationObject(app, fpDefaults, fpHandlers);
      const pluginHelpers = stringifiedHelpers();
      app.openSidebarEmbed(1, fpConfig, pluginHelpers, pluginStyle);
    },
    async onEmbedCall(app, callType, date, shiftPressed, dayName) {
      const pluginConstants = this._constants;

      const [currentFDOW, currentTags, currentSource, currentDomain] = Object.values(pluginConstants.settings).map((setting) => (app.settings[setting]));
      switch (callType) {
        case "settings":
          const settingsPrompt = this._constants.settingsPrompt;
          settingsPrompt.inputs[0].value = currentFDOW;
          settingsPrompt.inputs[1].value = currentTags;
          settingsPrompt.inputs[2].value = currentSource;
          settingsPrompt.inputs[3].options = await getUserDomainOptions(app);
          settingsPrompt.inputs[3].value = currentDomain;

          const requires = this._constants.settingsReport;

          const userSettings = await app.prompt("Settings", settingsPrompt);

          const statusOptions = requires;

          if (userSettings) {
            console.log("userSettings", userSettings);
            const [firstDayOfWeek, tags, taskSource, domainId] = userSettings;

            const fetchIsNeeded = (currentTags !== tags) || (currentSource !== taskSource) || (taskSource === pluginConstants.taskSource.DOMAIN && currentDomain !== domainId);
            const redrawIsNeeded = (currentFDOW !== firstDayOfWeek);

            const status = fetchIsNeeded ? requires.FETCH : (redrawIsNeeded ? requires.REDRAW : requires.NOCHANGE);

            return updateSettingsPromise(app, firstDayOfWeek, tags, taskSource, domainId).then(() => {

              //TODO handle failed settings update

              return Promise.resolve({ status, statusOptions, firstDayOfWeek, tags, taskSource, domainId });
            });
          } else {
            return { status: requires.NOTHING, statusOptions };
          }
        case "fetch":
          //TODO EXTRA if tags have a - at the start (-tag), treat them as exclusions (^tag) because that is how they are loaded from the plugin settings into the app.prompt
          return Promise.all([
            fetchNotesPromise(app, currentTags).then(
              (notes) => {
                const simpleNotes = filterNotesWithDates(notes);
                return checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  return { jots: notesWithTaskStatus };
                });
              }
            ),
            fetchWeekNotesPromise(app, currentTags, date.getFullYear()).then(
              (notes) => {
                const simpleNotes = filterNotesWithWeeks(notes);
                return checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  return { weekJots: notesWithTaskStatus };
                });
              }
            ),
            fetchMonthNotesPromise(app, currentTags, date.getFullYear()).then(
              (notes) => {
                const simpleNotes = filterNotesWithMonths(notes);
                return checkForTasksPromises(app, simpleNotes).then((notesWithTaskStatus) => {
                  return { monthJots: notesWithTaskStatus };
                });
              }
            )
          ]).then(([dailyNotes, weeklyNotes, monthlyNotes]) => {
            const hasChanges = setState({
              jots: dailyNotes.jots,
              weekJots: weeklyNotes.weekJots,
              monthJots: monthlyNotes.monthJots
            });
            return hasChanges;
          });
        case "refresh":
          return {
            monthlyButton: getMonthlyButtonModel(date),
            todayButton: getTodayButtonModel(date),
            weeklyButtons: getWeeklyButtonsModel(date),
            ribbon: getRibbon(currentTags, currentSource, await getActiveDomainName(app)),
          };
        case "draw":
          const jot = getJotForDate(date);
          return utils.groomedElementModel({ className: "", children: [] }, !!jot, jot && jot.hasTasks);
        case "navigate":
          const note = getJotForDate(date);

          if (note) {
            app.navigate(`https://www.amplenote.com/notes/${note.uuid}`);
          }
          else if (shiftPressed) {
            const currentTagsArray = currentTags.split(",");
            await app.createNote(dayName, currentTagsArray)
              .then((uuid) => {
                app.navigate(`https://www.amplenote.com/notes/${uuid}`);
                const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
                const state = getState();
                setState({
                  jots: [...state.jots, { day, month, year, uuid, hasTasks: pluginConstants.hasTasks.NONE }]
                });
              });
          } else {
            return { redraw: false };
          }
          return { redraw: true };
        case "navigate-week":
          const week = parseInt(dayName);
          const weekNote = getWeekJotForWeek(week, date.getFullYear());
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
                const state = getState();
                setState({
                  weekJots: [...state.weekJots, { year, week, uuid, hasTasks, type }]
                });
              });
          }
          break;
        case "navigate-month":
          const monthName = pluginConstants.monthNames[date.getMonth()];
          const monthNote = getMonthJot(date);

          console.log("shiftPressed", shiftPressed);

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
                const state = getState();
                setState({
                  monthJots: [...state.monthJots, { year, month, uuid, hasTasks, type }]
                });
              });
          }
          break;
        case "getWeek":
          return utils.getWeekCount(date);
        default:
          console.log("Warning! Wrong call type provided!");
          return;
      }
    },
    async renderEmbed(app, fpConfig, pluginHelpers, pluginStyle) {

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
      _loadStyles("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,300,1,0..200&icon_names=date_range,description,priority,prompt_suggestion,stylus,tag&display=block")
    ]).then(() => {
        if (fpInstance) {
          //TODO this code never seems to be invoked. Maybe remove it?
          console.log("Now destroying previous instance");
          fpInstance.destroy();
        }
        fpInstance = flatpickr("#datepicker", ${fpConfig});
      });

    function makeClickable(event) {
      [".dayContainer .flatpickr-day", ".flatpickr-weeks .flatpickr-day", "#monthlyButton"].forEach((identifier) => {
        const elements = document.querySelectorAll(identifier);
        elements.forEach(element => {
          const rect = element.getBoundingClientRect();
          if (event.clientX >= rect.left && event.clientX <= rect.right &&
              event.clientY >= rect.top && event.clientY <= rect.bottom &&
              element.classList.contains("no-jot")) {
            element.classList.add("shift-clickable");
          }
        });
      });
    }

    function removeClickable(event) {
      [".dayContainer .flatpickr-day", ".flatpickr-weeks .flatpickr-day", "#monthlyButton"].forEach((identifier) => {
        const elements = document.querySelectorAll(identifier);
        elements.forEach(element => {
          if (element.classList.contains("no-jot")) {
            element.classList.remove("shift-clickable");
          }
        });
      });
    }

      // Detect when the Shift key is pressed or released globally
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Shift') {
        shiftPressed = true;
        makeClickable(event);
        // Add mousemove listener when shift is pressed
        document.addEventListener('mousemove', makeClickable);
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        shiftPressed = false;
        removeClickable(event);
        // Remove mousemove listener when shift is released
        document.removeEventListener('mousemove', makeClickable);
      }
    });
  </script>
</body>

</html>`;
    }
  }
  return plugin;
})()