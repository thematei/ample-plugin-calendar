const plugin = {
  _constants: {
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    settings: {
      FDOW: "First Day of the Week (number)",
      TAGS: "Tags (separated by comma)",
    },
    settingsPrompt: {
      inputs: [
        { label: "First day of the week", type: "select", options: [{ label: "Sunday", value: 0 }, { label: "Monday", value: 1 }, { label: "Tuesday", value: 2 }, { label: "Wednesday", value: 3 }, { label: "Thursday", value: 4 }, { label: "Friday", value: 5 }, { label: "Saturday", value: 6 },] },
        { label: "Tags to filter jots by", type: "tags", limit: 3 },
      ],
    },
    jots: [],
    classes: {
      NOJOT: "no-jot",
    },
    hasTasks: {
      NONE: "none",
      SOME: "some",
      DONE: "done"
    },
    fpConfig: `{
  dateFormat: "F J, Y",
  weekNumbers: true,
  clickOpens: false,
  inline: true,
  static: true,
  locale: {
    firstDayOfWeek: 1,
  },
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
          fpInstance.config = { ...fpInstance.config, locale: { firstDayOfWeek } };
          fpInstance.redraw();
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
  onDayCreate: function (dObj, dStr, fp, dayElem) {
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
  },
}`,
  },
  validateSettings(app, settings) {
    const firstDayOfWeek = settings[this._constants.settings.FDOW];
    const isValidFDOW = /^[0-6]$/.test(firstDayOfWeek);
    const verdictFDOW = isValidFDOW ? "" : "The first day of the week needs to be a number value between 0 and 6, where 0 = Sunday, 1 = Monday etc.";

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
        //TODO change calendar configuration, trigger redraw
        await updateSettings(app, firstDayOfWeek, tags).then();
        return { success: true, firstDayOfWeek, tags };
      } else {
        return { success: false };
      }
    }

    const [year, month, day] = [date.getFullYear(), this._constants.monthNames[date.getMonth()], date.getDate()];
    const isSameDate = (jot) => { return (jot.year == year && jot.month == month && jot.day == day) };
    const jot = this._constants.jots.find((n) => (isSameDate(n)));

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
      console.log("CREATING NEW JOT", day, month);
      await app.createNote(dayName, ["daily-jots"])
        .then((uuid) => {
          app.navigate(`https://www.amplenote.com/notes/${uuid}`);
          this._constants.jots.push({ day, month, uuid });
        });
    }
  },
  async renderEmbed(app) {
    console.log("renderEmbed called");

    const pluginConstants = this._constants;

    async function fetchNotes(...tags) {
      let commaSeparatedTags = tags.reduce((result, tag) => { return result + "," + tag }, "");
      let notes = await app.filterNotes({ tag: commaSeparatedTags });
      console.log("fetched", commaSeparatedTags, notes);
      return notes;
    }

    async function checkForTasks(notes) {

      //TODO performance: This deletes the previously saved jots
      pluginConstants.jots = [];

      const tasks = pluginConstants.hasTasks;
      let hasTasks = tasks.NONE;
      const todo = (task) => (!task.completedAt && !task.dismissedAt);

      notes.forEach((n) => {
        app.getNoteTasks(n, { includeDone: true })
          .then((taskList) => {
            if (taskList.length === 0)
              hasTasks = tasks.NONE;
            else {
              if (taskList.some(todo))
                hasTasks = tasks.SOME;
              else
                hasTasks = tasks.DONE;
            }
            //TODO performance: Why does this function (checkForTasks) run twice when reopening the plugin note in the side panel?
            //seems to be an amplenote bug. Requires a workaround
            pluginConstants.jots.push({ ...n, hasTasks });
          });
      });
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

    const notes = await fetchNotes(["daily-jots"]);
    const simpleNotes = getNotesWithDates(notes);
    checkForTasks(simpleNotes);
    setTimeout(() => console.log("jots", pluginConstants.jots), 3000);

    return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <style>
    body {
      background-color: #F2F3F3;
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
        fpInstance = flatpickr("#datepicker", ${ this._constants.fpConfig });
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