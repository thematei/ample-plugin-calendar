const plugin = {
  _constants: {
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    jots: [],
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
        onMonthChange: () => console.log("onMonthChange called"),
        onChange: (selectedDates, dateStr, fp) => {
          //this calls upon onEmbedCall() from within the plugin script
          window.callAmplenotePlugin(selectedDates[0].getMonth(), //number, 0-11
                                    selectedDates[0].getDate(), //number, 1-31
                                    shiftPressed, //variable declared within script
                                    dateStr, //string, name of selected date (jot format),
                                    "navigate"
                                    );
        },
        onDayCreate: function(dObj, dStr, fp, dayElem){
          console.log("onDayCreate called");
        window.callAmplenotePlugin(dayElem.dateObj.getMonth(),
                                  dayElem.dateObj.getDate(),
                                  false, "",
                                  "create")
                .then(([hasJot, hasTasks]) => {
                  if(hasJot) {
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
  appOption(app) {
    app.openSidebarEmbed(1);
  },
  async onEmbedCall(app, month, day, shiftPressed, dayName, callType) {
    //console.log("all links", this._constants.jots);
    month = this._constants.monthNames[month];
    day = "" + day;
    const jot = this._constants.jots.find((n) => n.month == month && n.day == day);

    //TODO there might be a more elegant solution to this
    if(callType === "create") {
      //console.log("returning", jot.hasTasks);
      return [!!jot, jot && jot.hasTasks];
    }
    
    if(jot) {
      console.log("navigating to", jot.uuid);
      app.navigate(`https://www.amplenote.com/notes/${jot.uuid}`);
      }
    else if (shiftPressed) {
      console.log("CREATING NEW JOT", day, month);
      await app.createNote(dayName, ["daily-jots"])
            .then((uuid) => {
              app.navigate(`https://www.amplenote.com/notes/${uuid}`);
              this._constants.jots.push({day, month, uuid});
            });
    }
  },
  async renderEmbed(app) {
    console.log("renderEmbed called");
    
    const pluginConstants = this._constants;

    async function fetchNotes(...tags) {
      let commaSeparatedTags = tags.reduce((tag, result) => {return result + "," + tag}, "");
      let notes = await app.filterNotes({tag: commaSeparatedTags});
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
        app.getNoteTasks(n, {includeDone: true})
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
            pluginConstants.jots.push({...n, hasTasks});
          });
       });
    }

    function getNotesWithDates(notes) {
      const notesWithDates = notes.map(({name, uuid}) => {        

        //extract date components from jot name
        //TODO handle different names for weekly and monthly jots
        let slices = name.split(" ");
        let day = slices[1].slice(0, -3); //one for comma, two for ordinal suffix
        
        return {day, month: slices[0], year: slices[2], uuid};
      });
      return notesWithDates;
    }

    const notes = await fetchNotes(["daily-jots"]);
    const simpleNotes = getNotesWithDates(notes);
    checkForTasks(simpleNotes);
    
   return `
   <!DOCTYPE html>
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
    </style>
  </head>
  <body>
    <div id="datepicker">
    <script>
    
    var fpinstance = null;

    var shiftPressed = false;
    
    function _loadLibrary(url) {
        return new Promise(function(resolve) {
            const script = document.createElement("script");
            script.setAttribute("type", "text/javascript");
            script.setAttribute("src", url);
            script.addEventListener("load", function() {
                resolve(true);
            });
            document.body.appendChild(script);
        });
    };
  
    _loadLibrary("https://cdn.jsdelivr.net/npm/flatpickr")
      .then(() => {
        if (fpinstance) {
        //TODO this code never seems to be invoked. Maybe remove it?
        console.log("Now destroying previous instance");
                fpinstance.destroy();
        }
        //TODO save config as object and JSON.stringify then JSON.parse to insert here
        fpinstance = flatpickr("#datepicker", ${this._constants.fpConfig});
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
  </html>
    `;
  }  
}
export default plugin;