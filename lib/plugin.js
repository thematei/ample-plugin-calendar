const plugin = {
  _state: {
    jots: [],
    isFetchHappening: false,
  },
  _constants: {
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    settings: {
      FDOW: "First Day of the Week (number)",
      TAGS: "Tags (separated by comma)",
    },
    settingsPrompt: {
      inputs: [
        //Due to the implementation of the app.prompt dropdown, Sunday cannot have the value 0.
        //This is why fpConfig.locale.firstDayOfWeek will be assigned the value day%7. 
        //This turns Sunday from 7 to 0 and requires no change for the rest of the weekdays.
        { label: "First day of the week", type: "select", options: [{ label: "Monday", value: 1 }, { label: "Tuesday", value: 2 }, { label: "Wednesday", value: 3 }, { label: "Thursday", value: 4 }, { label: "Friday", value: 5 }, { label: "Saturday", value: 6 }, { label: "Sunday", value: 7 }] },
        { label: "Tags to filter jots by", type: "tags", limit: 3 },
      ],
    },
    classes: {
      NOJOT: "no-jot",
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
    
    window.callAmplenotePlugin("fetch").then(() => {
      console.log("fetch finished successfully!");
      refreshRibbon();
      fpInstance.redraw();
    });

    const refreshButton = document.createElement("div");
    refreshButton.className = "smol-button refresh";
    refreshButton.textContent = "⟳";
    //TODO add icon content
    refreshButton.addEventListener("click", function () {
      console.log("refresh clicked!");
      refreshRibbon();
      fpInstance.redraw();
    });

    const todayButton = document.createElement("div");
    todayButton.className = "smol-button today";
    todayButton.textContent = "🗓";
    //TODO add icon content
    todayButton.addEventListener("click", function () {
      console.log("today clicked!")
      //TODO only proceed if month is different?
      //flag for changed month?
      fpInstance.jumpToDate(new Date());
    });

    const settingsButton = document.createElement("div");
    settingsButton.className = "smol-button settings";
    settingsButton.textContent = "⚙️";
    //TODO add icon content
    settingsButton.addEventListener("click", function () {
      console.log("settings clicked!")
      window.callAmplenotePlugin("settings").then(({ success, firstDayOfWeek, tags }) => {
        //Currently only checks if user saved or cancelled
        //TODO also check whether different from initial values        
        if (success) {
          console.log("settings changed to", firstDayOfWeek, tags);
          firstDayOfWeek = firstDayOfWeek % 7; //this turns Sunday from a 7 to a 0
          fpInstance.set("locale", { firstDayOfWeek });
          //TODO implement jot lookup for new tags
          //TODO if tags have a - at the start (-tag), treat them as exclusions (^tag)
          //because that is how they are loaded from the plugin settings into the app.prompt
          console.log("updated tags to", tags);
        } else {
          console.log("settings were not changed");
        }
        //TODO display tags button
      });
    });

    const monthContainer = document.querySelector(".flatpickr-current-month");
    monthContainer.prepend(refreshButton);
    monthContainer.append(todayButton, settingsButton);
  },
  onMonthChange: () => {
    console.log("onMonthChange called");
    refreshRibbon();
  },
  onChange: (selectedDates, dateStr, fp) => {
    window.callAmplenotePlugin("navigate",
      selectedDates[0], //selected date object
      shiftPressed, //variable declared within script
      dateStr, //string, name of selected date (jot format),
    );
  },
  onDayCreate: (dObj, dStr, fp, dayElem) => {
    window.callAmplenotePlugin("create", dayElem.dateObj)
      .then(([hasJot, hasTasks]) => {
        if (hasJot) {
          if (hasTasks !== "none")
            dayElem.innerHTML += "<span class='event " + hasTasks + "'></span>";
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

    async function updateSettings(app, firstDayOfWeek, tags) {
      return Promise.all([
        app.setSetting(pluginConstants.settings.FDOW, firstDayOfWeek),
        app.setSetting(pluginConstants.settings.TAGS, tags),
      ]);
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
          return [...datedNotes, datedNote];
        } else return datedNotes;

        //TODO EXTRA if year is missing, use creation date instead?
      }, []);
      return filteredDatedNotes;
    }

    function removeOrdinalSuffix(date) {
      const suffixRegex = /(st|nd|rd|th)\b/g;
      return date.replace(suffixRegex, "");
    }

    function getJotForDate(date) {
      const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
      const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
      return pluginState.jots.find((n) => (isSameDate(n)));
    }

    const [currentFDOW, currentTags] = [app.settings[this._constants.settings.FDOW], app.settings[this._constants.settings.TAGS]];

    switch (callType) {
      case "settings":

        const settingsPrompt = this._constants.settingsPrompt;
        settingsPrompt.inputs[0].value = parseInt(currentFDOW);
        settingsPrompt.inputs[1].value = currentTags;

        const userSettings = await app.prompt("Settings", settingsPrompt);

        if (userSettings) {
          const [firstDayOfWeek, tags] = userSettings;
          //TODO change calendar configuration, trigger redraw (within iframe caller function)
          await updateSettings(app, firstDayOfWeek, tags).then();
          return { success: true, firstDayOfWeek, tags };
        } else {
          return { success: false };
        }
      case "fetch":
        const userTags = app.settings[this._constants.settings.TAGS];

        return fetchNotesPromise(userTags).then(
          (notes) => {
            console.log("fetched jots", notes);
            const simpleNotes = getNotesWithDates(notes);
            return checkForTasksPromises(simpleNotes);
          }
        );
      case "refresh":
        const monthName = this._constants.monthNames[date]; // in this case, date is just a month integer (0 - 11)
        return [monthName, currentTags, this._state.jots.length];
      case "create":
        const jot = getJotForDate(date);

        return [!!jot, jot && jot.hasTasks];
      case "navigate":
        const note = getJotForDate(date);

        if (note) {
          app.navigate(`https://www.amplenote.com/notes/${note.uuid}`);
        }
        else if (shiftPressed) {
          //TODO convert string of tags to array of tag strings
          await app.createNote(dayName, [currentTags])
            .then((uuid) => {
              app.navigate(`https://www.amplenote.com/notes/${uuid}`);
              const [year, month, day] = [date.getFullYear(), pluginConstants.monthNames[date.getMonth()], date.getDate()];
              this._state.jots.push({ day, month, year, uuid, hasTasks: pluginConstants.hasTasks.NONE });
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

    const today = pluginConstants.monthNames[new Date().getMonth()];

    return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      background-color: #FFFFFF;
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
      width: 8px;
      height: 8px;
      border-radius: 2px;
      top: 6px;
      right: 4px;
      content: "✔";
      color: #FFFFFF;
      display: block;
      background: #3d8eb9;
    }

    .event.some {
      background: #3d8eb9;
    }

    .event.done {
      background: #0BBF7D;
    }

    .smol-button {
      display: inline;
      margin: 0px 3px 0px 3px;
    }

    .smol-button:hover {
      cursor: pointer;
    }

    .smol-button.settings {
      position: absolute;
      right: -10px;
      margin-right: 0px;
      top: 0.44em;
    }
  </style>
</head>

<body>
  <div class="ribbon" id="ribbon"></div>
  <div class="datepicker-root" id="datepicker"> </div>
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

    function refreshRibbon() {
      window.callAmplenotePlugin("refresh", fpInstance.currentMonth)
        .then((args) => drawRibbon(...args));
    }

    function drawRibbon(currentMonth, userTags, jotsCount) {

      const ribbon = document.getElementById("ribbon");
      
      const todayButton = document.createElement("div");
      if (currentMonth === "${today}") {
        todayButton.setAttribute("class", "current-month hidden");
      } else {
        todayButton.setAttribute("class", "current-month");
        todayButton.textContent = "🔙 " + "${today}";
      }
      
      const userTagDisplay = document.createElement("div");
      userTagDisplay.setAttribute("class", "current-month");
      userTagDisplay.textContent = "# " + userTags;

      const jotCount = document.createElement("div");
      jotCount.setAttribute("class", "current-month");
      jotCount.textContent = "🗓 " + jotsCount;

      ribbon.replaceChildren(todayButton, userTagDisplay, jotCount);
    };

    Promise.all([
      _loadLibrary("https://cdn.jsdelivr.net/npm/flatpickr"),
      _loadStyles("https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css")
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
      }
    });

    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        shiftPressed = false;
      }
    });
  </script>
</body>

</html>`;
  }
}
export default plugin;