const plugin = {
  _state: {
    jots: []
  },
  _constants: {
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
      fields: {
        dateFormat: "F J, Y",
        weekNumbers: true,
        clickOpens: false,
        inline: true,
        static: true,
        locale: {
          firstDayOfWeek: 1,
        },
      },
      methods: `
  onReady: () => {
    console.log("onReady triggered!");
    
    fetchNotes(true, true);

    const refreshButton = document.createElement("div");
    refreshButton.className = "smol-button refresh";
    refreshButton.append(getMaterialIcon("refresh"));
    refreshButton.addEventListener("click", function () {
    //TODO remove the shift-pressing of this button. It should always fetch jots anew.
      if(shiftPressed) {
        console.log("shift-clicked refresh!");
        fetchNotes(true, true);
      } else {
        console.log("refresh clicked!");
        refreshRibbon();
        fpInstance.redraw();
      }
    });

    const settingsButton = document.createElement("div");
    settingsButton.className = "smol-button settings";
    settingsButton.append(getMaterialIcon("settings"));
    settingsButton.addEventListener("click", function () {
      console.log("settings clicked!")
      handleSettings();
    });

    const monthContainer = document.querySelector(".flatpickr-current-month");
    monthContainer.prepend(refreshButton);
    monthContainer.append(settingsButton);

    drawTodayButton();
  },
  onMonthChange: () => {
    //get all week (.flatpickr-weeks .flatpickr-day) elements
    const weeks = document.querySelectorAll('.flatpickr-weeks .flatpickr-day');
    weeks.forEach((element) => {
      //attach the click handler to navigate/create to the content of the note
      element.addEventListener('click', () => {
          const todaysDate = new Date();
          const todaysDateString = fpInstance.formatDate(todaysDate, "F J, Y");
          window.callAmplenotePlugin("navigate-week", todaysDate, shiftPressed, todaysDateString)
          .then(([hasJot, hasTasks]) => {
            if (hasJot) {
              if (hasTasks !== "none")
                dayElem.append(getMaterialIcon("priority", "event", hasTasks));
            } else {
              //TODO add css classes to constants
              dayElem.className += " no-jot";
            }
          });
        
        });
});

    drawTodayButton();
  },
  onYearChange: () => {
    console.log("onYearChange called");
    drawTodayButton();
  },
  onChange: (selectedDates, dateStr, fp) => {
    console.log("onChange triggered");
    window.callAmplenotePlugin("navigate",
      selectedDates[0], //selected date object
      shiftPressed, //variable declared within script
      dateStr, //string, name of selected date (jot format),
    );
  },
  onDayCreate: (dObj, dStr, fp, dayElem) => {
    console.log("onDayCreate triggered");
    window.callAmplenotePlugin("draw", dayElem.dateObj)
      .then(([hasJot, hasTasks]) => {
        if (hasJot) {
          if (hasTasks !== "none")
            dayElem.append(getMaterialIcon("priority", "event", hasTasks));
        } else {
          //TODO add css classes to constants
          dayElem.className += " no-jot";
        }
      });
  }`,
    },
  },
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
    app.openSidebarEmbed(1);
  },
  async onEmbedCall(app, callType, date, shiftPressed, dayName) {

    const pluginConstants = this._constants;

    const pluginState = this._state;

    async function updateSettingsPromise(app, firstDayOfWeek, tags) {
      let promises = [];

      if (firstDayOfWeek) promises.push(app.setSetting(pluginConstants.settings.FDOW, firstDayOfWeek));
      if (tags) promises.push(app.setSetting(pluginConstants.settings.TAGS, tags));

      return Promise.all(promises);
    }

    async function fetchNotesPromise(tag) {
      return app.filterNotes({ tag });
    }

    async function checkForTasksPromises(notes) {

      //This deletes the previously saved jots
      pluginState.jots = [];

      const tasks = pluginConstants.hasTasks;
      let hasTasks = tasks.NONE;
      const todo = (task) => (!task.completedAt && !task.dismissedAt);

      return Promise.all(
        notes.map((n) => {
          return app.getNoteTasks(n, { includeDone: true })
            .then((taskList) => {
              hasTasks = (taskList.length === 0) ? tasks.NONE : (taskList.some(todo) ? tasks.SOME : tasks.DONE);
              pluginState.jots.push({ ...n, hasTasks });
            });
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
    function getNotesWithDates(notes) {
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
          datedNote.day = removeOrdinalSuffix(datedNote.day);

          //Establishes whether jot is weekly or daily note
          const isWeeklyNote = /^Week of /.test(currentNote.name);
          if(isWeeklyNote) {
            datedNote.type = jotType.WEEK;
            datedNote.week = getWeekOfDate(new Date(datedNote.year, datedNote.month, datedNote.day), currentFDOW);
          } else {
            datedNote.type = jotType.DAY;
          }
          
          return [...datedNotes, datedNote];
        } else return datedNotes;

        //TODO EXTRA if year is missing, use creation date instead?
      }, []);
      return filteredDatedNotes;
    }

    function getNotesWithMonths(notes) {
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

    function removeOrdinalSuffix(date) {
      const suffixRegex = /(st|nd|rd|th)\b/g;
      return date.replace(suffixRegex, "");
    }

    function getWeekOfDate(dateInput, firstDayOfWeek = 1) {
      console.log("passed params", dateInput, firstDayOfWeek)
      const date = new Date(dateInput);
      const startOfYear = new Date(date.getFullYear(), 0, 1); // Jan 1 of that year
    
      // Get the day of the week for Jan 1
      const janFirstDay = startOfYear.getDay();
      const dayOffset = (janFirstDay - firstDayOfWeek + 7) % 7;
    
      // Calculate the start of the first week
      const startOfFirstWeek = new Date(startOfYear);
      startOfFirstWeek.setDate(startOfYear.getDate() - dayOffset);
    
      // Calculate the difference in days between the target date and start of first week
      const msInDay = 1000 * 60 * 60 * 24;
      const daysSinceFirstWeek = Math.floor((date - startOfFirstWeek) / msInDay);
    
      // Return the week number
      return Math.floor(daysSinceFirstWeek / 7) + 1;
    }

    function getJotForDate(date) {
      const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
      const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
      return pluginState.jots.find((n) => (isSameDate(n)));
    }

    function getWeekJotForDate(date) {
      console.log("passed date is ", date);
      const isWeeklyNote = (jot) => (jot.type === pluginConstants.jotTypes.WEEK);
      const matchesWeek = (jot) => (getWeekOfDate(jot, currentFDOW) === getWeekOfDate(date, currentFDOW));
      return pluginState.jots.find((n) => (isWeeklyNote(n) && matchesWeek(n)));
    }

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

            return Promise.resolve({ status, firstDayOfWeek, tags });
          });
        } else {
          return { status: changed.NONE };
        }
      case "fetch":
        const userTags = app.settings[this._constants.settings.TAGS];

        //TODO EXTRA if tags have a - at the start (-tag), treat them as exclusions (^tag) because that is how they are loaded from the plugin settings into the app.prompt

        return fetchNotesPromise(userTags).then(
          (notes) => {
            console.log("fetched jots", notes);
            const simpleNotes = [...getNotesWithDates(notes), ...getNotesWithMonths(notes)];
            return checkForTasksPromises(simpleNotes);
          }
        );
      case "refresh":
        return [currentTags, this._state.jots.length];
      case "draw":
        const jot = getJotForDate(date);

        return [!!jot, jot && jot.hasTasks];
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
              this._state.jots.push({ day, month, year, uuid, hasTasks: pluginConstants.hasTasks.NONE });
            });
        }
        break;
        case "navigate-week":
          const weekNote = getWeekJotForDate(date);
  
          if (weekNote) {
            app.navigate(`https://www.amplenote.com/notes/${weekNote.uuid}`);
          }
          else if (shiftPressed) {
            const currentTagsArray = currentTags.split(",");
            dayName = "Week of " + dayName;
            await app.createNote(dayName, currentTagsArray)
              .then((uuid) => {
                app.navigate(`https://www.amplenote.com/notes/${uuid}`);
                const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
                this._state.jots.push({ day, month, year, uuid, hasTasks: pluginConstants.hasTasks.NONE, type: pluginConstants.jotTypes.WEEK });
              });
          }
        break;
      default:
        console.log("Warning! Wrong call type provided!");
        return;
    }
  },
  async renderEmbed(app) {

    const pluginConstants = this._constants;

    const pluginState = this._state;

    function loadSettingsIntoConfig() {
      const firstDayOfWeek = app.settings[pluginConstants.settings.FDOW] % 7; //this turns Sunday from a 7 to a 0

      const fpConfigUpdatedFields = { ...pluginConstants.fpConfig.fields, locale: { firstDayOfWeek } };
      const fpConfigUpdatedFieldsString = JSON.stringify(fpConfigUpdatedFields).slice(0, -1); //to remove closed bracket

      return `${fpConfigUpdatedFieldsString}, ${pluginConstants.fpConfig.methods}}`;
    }

    const fpConfig = loadSettingsIntoConfig();

    const changed = pluginConstants.settingsReport;

    return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
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
      color: #b0b0b0;
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

    .smol-button {
      display: inline;
      margin: 0px 3px 0px 3px;
    }

    .smol-button:hover {
      cursor: pointer;
    }

    .smol-button.hidden {
      color: #FFFFFF;
      cursor: default;
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
    }

    .flatpickr-monthDropdown-months {
      text-align: center;
    }

    .flatpickr-monthDropdown-month {
      text-align: center;
    }

    .flatpickr-weekwrapper {
      width: 40px;
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
    }
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

    function getMaterialIcon(name, ...classes) {
      const newIconElement = document.createElement("span");
      const concatenatedClasses = classes.reduce((acc, cur) => (acc + " " + cur), "material-symbols-outlined");
      newIconElement.setAttribute("class", concatenatedClasses);
      newIconElement.textContent = name;
      return newIconElement;
    }

    function handleSettings() {
      window.callAmplenotePlugin("settings").then(({ status, firstDayOfWeek, tags }) => {

        switch(status) {
          case "${changed.TAGS}":
            console.log("settings changed to", firstDayOfWeek, tags);
            firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
            fpInstance.set("locale", { firstDayOfWeek });
            fetchNotes(true, true);
            break;
          case "${changed.FDOW}":
            console.log("calendar was reconfigured");
            fpInstance.set("locale", { firstDayOfWeek });
            fpInstance.redraw();
            break;
          case "${changed.SAME}":
            console.log("settings were not changed");
            break;
          case "${changed.NONE}":
            console.log("changing settings was cancelled");
            break;
        }
      });
    }

    function drawTodayButton() {
      const oldTodayButton = document.getElementById("todayButton");
      const todayButton = document.createElement("div");
      todayButton.setAttribute("id", "todayButton");
      todayButton.setAttribute("class", "smol-button hidden");
      todayButton.append(getMaterialIcon("prompt_suggestion"));
    
      if (!oldTodayButton) { //first ever call can use prepend. Subsequent calls must use replaceWith
        document.querySelector(".flatpickr-current-month").prepend(todayButton);
      } else {
        const today = new Date();
        if (fpInstance.currentMonth !== today.getMonth() || fpInstance.currentYear !== today.getFullYear()) {
          todayButton.setAttribute("class", "smol-button");
          todayButton.addEventListener("click", function () {
            console.log("back to today clicked!")
            fpInstance.jumpToDate(today, true);
          });
        }
        oldTodayButton.replaceWith(todayButton);
      }
    }
    
    function fetchNotes(ribbonNeedsRefresh, tableNeedsRedraw) {
      window.callAmplenotePlugin("fetch").then(() => {
        console.log("fetch finished successfully!");
        if (ribbonNeedsRefresh) refreshRibbon();
        if (tableNeedsRedraw) fpInstance.redraw();
      });
    }

    function refreshRibbon() {
      window.callAmplenotePlugin("refresh")
        .then((args) => drawRibbon(...args));
    }

    function drawRibbon(userTags, jotsCount) {

      const ribbon = document.getElementById("ribbon");
      
      const userTagDisplay = document.createElement("div");
      userTags.split(",").forEach((tag) => {
        const tagElement = document.createElement("div");
        tagElement.setAttribute("class", "tag-chip");
        tagElement.append(getMaterialIcon("tag"), tag);
        userTagDisplay.append(tagElement);
      });
      userTagDisplay.setAttribute("class", "tags");
      userTagDisplay.addEventListener("click", () => {
      console.log("tag settings clicked!")
      handleSettings();
    });

      const jotCount = document.createElement("div");
      jotCount.setAttribute("class", "jot-count");
      jotCount.append(jotsCount, getMaterialIcon("description"));

      ribbon.replaceChildren(userTagDisplay, jotCount);
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
export default plugin;