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

    const refreshButton = document.createElement("div");
    refreshButton.className = "smol-button refresh";
    refreshButton.textContent = "⟳";
    //TODO add icon content
    refreshButton.addEventListener("click", function () {
      console.log("refresh clicked!")
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
  onMonthChange: () => console.log("onMonthChange called"),
  onChange: (selectedDates, dateStr, fp) => {
    //this calls upon onEmbedCall() from within the plugin script
    window.callAmplenotePlugin("navigate",
      selectedDates[0], //selected date object
      shiftPressed, //variable declared within script
      dateStr, //string, name of selected date (jot format),
    );
  },
  onDayCreate: (dObj, dStr, fp, dayElem) => {
    console.log("onDayCreate called");
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

    var settingNames = this._constants.settings;

    async function updateSettings(app, firstDayOfWeek, tags) {
      return Promise.all([
        app.setSetting(settingNames.FDOW, firstDayOfWeek),
        app.setSetting(settingNames.TAGS, tags),
      ]);
    }

    if (callType === "settings") {
      const [currentFDOW, currentTags] = [app.settings[this._constants.settings.FDOW], app.settings[this._constants.settings.TAGS]];

      const settingsPrompt = this._constants.settingsPrompt;
      settingsPrompt.inputs[0].value = parseInt(currentFDOW);
      settingsPrompt.inputs[1].value = currentTags;

      const userSettings = await app.prompt("Settings", settingsPrompt);

      if (userSettings) {
        const [firstDayOfWeek, tags] = userSettings;
        console.log("TAGS", tags);
        //TODO change calendar configuration, trigger redraw
        await updateSettings(app, firstDayOfWeek, tags).then();
        return { success: true, firstDayOfWeek, tags };
      } else {
        return { success: false };
      }
    }

    const [year, month, day] = [date.getFullYear(), this._constants.monthNames[date.getMonth()], date.getDate()];
    const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
    const jot = this._state.jots.find((n) => (isSameDate(n)));

    //TODO there might be a more elegant solution to this
    if (callType === "create") {
      //console.log("returning", jot.hasTasks);
      return [!!jot, jot && jot.hasTasks];
    }

    if (jot) {
      console.log("navigating to", jot.uuid);
      app.navigate(`https://www.amplenote.com/notes/${jot.uuid}`);
    }
    else if (shiftPressed) {
      //console.log("CREATING NEW JOT", day, month, year);
      await app.createNote(dayName, currentTags)
        .then((uuid) => {
          app.navigate(`https://www.amplenote.com/notes/${uuid}`);
          this._state.jots.push({ day, month, year, uuid });
        });
    }
  },
  async renderEmbed(app) {
    console.log("renderEmbed called");

    const pluginConstants = this._constants;

    const pluginState = this._state;

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
              if (taskList.length === 0)
                hasTasks = tasks.NONE;
              else {
                if (taskList.some(todo))
                  hasTasks = tasks.SOME;
                else
                  hasTasks = tasks.DONE;
              }
              pluginState.jots.push({ ...n, hasTasks });
            });
        }),
      );
    }

    function getNotesWithDates(notes) {
      const notesWithDates = notes.map(({ name, uuid }) => {

        //extract date components from jot name
        //TODO handle different names for weekly and monthly jots
        let slices = name.split(" ");
        let day = slices[1].slice(0, -3); //one for comma, two for ordinal suffix

        return { day, month: slices[0], year: slices[2], uuid };
      });
      return notesWithDates;
    }

    function loadSettingsIntoConfig() {
      const firstDayOfWeek = app.settings[pluginConstants.settings.FDOW] % 7; //this turns Sunday from a 7 to a 0

      const fpConfigUpdatedFields = { ...pluginConstants.fpConfig.fields, locale: { firstDayOfWeek } };
      const fpConfigUpdatedFieldsString = JSON.stringify(fpConfigUpdatedFields).slice(0, -1); //to remove closed bracket

      return `${fpConfigUpdatedFieldsString}, ${pluginConstants.fpConfig.methods}}`;
    }

    function fetchAndLoadNotes(userDefinedTags, debounce) {
      //This debounce implementation is required because renderEmbed is being called twice 
      //when first calling the plugin from the appOption menu, 
      //when re-opening the side panel, 
      //when collapsing and expanding the plugin note.
      //Fetching becomes twice as expensive. Therefore this workaround is needed.
      //I have reported this bug, waiting for an update (03/17/2025)
      if (debounce) {
        console.log("Leaving fetch function execution.");
        return;
      }

      pluginState.isFetchHappening = true;
      console.log("Fetching...", userDefinedTags);

      //TODO fetch tags from user settings
      fetchNotesPromise(userDefinedTags).then(
        (notes) => {
          console.log("fetched jots", notes);
          const simpleNotes = getNotesWithDates(notes);
          return checkForTasksPromises(simpleNotes);
        }
      ).then(() => {
        pluginState.isFetchHappening = false;
        //TODO trigger calendar redraw

        console.log("jots after promises", pluginState.jots);
      });
    }

    const fpConfig = loadSettingsIntoConfig();

    const userTags = app.settings[pluginConstants.settings.TAGS];

    fetchAndLoadNotes(userTags, pluginState.isFetchHappening);

    return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
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
  <div class="datepicker-root" id="datepicker"> </div>
  <!-- TODO <div class="current-month"> Go to current month </div> -->
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
        document.body.appendChild(script);
      });
    };

    _loadLibrary("https://cdn.jsdelivr.net/npm/flatpickr")
      .then(() => {
        if (fpInstance) {
          //TODO this code never seems to be invoked. Maybe remove it?
          console.log("Now destroying previous instance");
          fpInstance.destroy();
        }
        //TODO save config as object and JSON.stringify then JSON.parse to insert here
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