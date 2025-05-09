import { mockApp, mockPlugin, mockNote } from "../lib/test-helpers.js"

const REPO_URL = "https://github.com/alloy-org/plugin-builder";
// --------------------------------------------------------------------------------------
describe("This here plugin,", () => {
  const plugin = mockPlugin();
  plugin._testEnvironment = true;

  // --------------------------------------------------------------------------------------
  describe("with a shift-click on a day,", () => {

    var app;

    beforeEach(() => {
      app = mockApp();
    });

    //   Shift-navigating to note: name reflects day correctly; tags are being saved properly;
    it("should create a new note with selected tag", async () => {
      //set up environment
      const date = new Date("March 31 2025");
      const dayName = "March 31st, 2025";
      //make sure my plugin works with the selected tag
      const selectedTag = "daily-jots";
      const jotCount = plugin._state.jots.length;
      const monthNames = plugin._constants.monthNames;
      //load all notes from app
      app.settings[plugin._constants.settings.TAGS] = selectedTag;
      let notes = await app.filterNotes({ tag: selectedTag });
      //call plugin
      await plugin.onEmbedCall(app, "navigate", date, true, dayName);
      //valid note was created
      const newNotes = await app.filterNotes({ tag: selectedTag });
      expect(newNotes.length).toBe(jotCount + 1);
      expect(plugin._state.jots.length).toBe(jotCount + 1);
      let newJot = plugin._state.jots.at(plugin._state.jots.length - 1);
      expect(newJot.day).toBe(date.getDate());
      expect(newJot.month).toBe(monthNames[date.getMonth()]);
      expect(newJot.year).toBe(date.getFullYear());
      //test that a real note was actually created in app
      //compare with initially loaded notes
      const newlyCreatedNote = newNotes.find((newNote) => {
        return !notes.some((note) => (note.uuid === newNote.uuid && note.name === newNote.name));
      });
      expect(newlyCreatedNote.uuid).toBe(newJot.uuid);
      //test that uuid of new note matches uuid of jot
      const foundNote = await app.findNote({ uuid: newJot.uuid });
      expect(foundNote.uuid).toBe(newlyCreatedNote.uuid);

      //test that tags match exactly
      //test that note has all tags
      expect(foundNote.tags).toContainEqual(selectedTag);
      //test that note does not have additional tags
      const tagsRemoved = foundNote.tags.filter((tag) => !(tag == selectedTag));
      expect(tagsRemoved.length).toBe(0);

      //TODO test for multiple tags
    });
  });

  describe("with a shift-click on a week number,", () => {

    var app;

    beforeEach(() => {
      app = mockApp();
      plugin._state.weekJots = [];
    });

    //   Shift-navigating to note: name reflects day correctly; tags are being saved properly;
    it("should create a new weekly with the selected tags", async () => {
      //set up environment
      const date = new Date("March 31 2025");
      const weekNumber = plugin.getWeekOfDate(date);
      const dayName = "Week " + weekNumber + " of 2025";
      //make sure my plugin works with the selected tag
      const selectedTag = "daily-jots";
      const jotCount = plugin._state.weekJots.length;
      //load all notes from app
      app.settings[plugin._constants.settings.TAGS] = selectedTag;
      let notes = await app.filterNotes({ tag: selectedTag });
      //call plugin for the right week
      await plugin.onEmbedCall(app, "navigate-week", date, true, weekNumber);
      //valid note was created
      const newNotes = await app.filterNotes({ tag: selectedTag });
      expect(newNotes.length).toBe(jotCount + 1);
      expect(plugin._state.weekJots.length).toBe(jotCount + 1);
      let newJot = plugin._state.weekJots.at(plugin._state.weekJots.length - 1);
      expect(newJot.week).toBe(weekNumber);
      expect(newJot.year).toBe(date.getFullYear());
      //test that a real note was actually created in app
      //compare with initially loaded notes
      const newlyCreatedNote = newNotes.find((newNote) => {
        return !notes.some((note) => (note.uuid === newNote.uuid && note.name === newNote.name));
      });
      expect(newlyCreatedNote.uuid).toBe(newJot.uuid);
      //test that uuid of new note matches uuid of jot
      const foundNote = await app.findNote({ uuid: newJot.uuid });
      expect(foundNote.uuid).toBe(newlyCreatedNote.uuid);
      //test that tags match
      expect(foundNote.tags).toContainEqual(selectedTag);
      //TODO test for multiple tags
    });
  });

  describe("with a shift-click on the month button,", () => {

    var app;

    beforeEach(() => {
      app = mockApp();
    });

    //   Shift-navigating to note: name reflects day correctly; tags are being saved properly;
    it("should create a new monthly note with the selected tags", async () => {
      //set up environment
      const date = new Date("March 1 2025");
      const monthName = plugin._constants.monthNames[date.getMonth()];
      const jotName = "Month of " + monthName + ", 2025";
      //make sure my plugin works with the selected tag
      const selectedTag = "daily-jots";
      const jotCount = plugin._state.monthJots.length;
      //load all notes from app
      app.settings[plugin._constants.settings.TAGS] = selectedTag;
      let notes = await app.filterNotes({ tag: selectedTag });
      //call plugin for the right week
      await plugin.onEmbedCall(app, "navigate-month", date, true);
      //valid note was created
      const newNotes = await app.filterNotes({ tag: selectedTag });
      expect(newNotes.length).toBe(jotCount + 1);
      expect(plugin._state.monthJots.length).toBe(jotCount + 1);
      let newJot = plugin._state.monthJots.at(plugin._state.monthJots.length - 1);
      expect(newJot.month).toBe(monthName);
      expect(newJot.year).toBe(date.getFullYear());
      //test that a real note was actually created in app
      //compare with initially loaded notes
      const newlyCreatedNote = newNotes.find((newNote) => {
        return !notes.some((note) => (note.uuid === newNote.uuid && note.name === newNote.name));
      });
      expect(newlyCreatedNote.uuid).toBe(newJot.uuid);
      //test that uuid of new note matches uuid of jot
      const foundNote = await app.findNote({ uuid: newJot.uuid });
      expect(foundNote.uuid).toBe(newlyCreatedNote.uuid);
      //test that tags match
      expect(foundNote.tags).toContainEqual(selectedTag);
      //TODO test for multiple tags
    });
  });

  describe("with an existing daily jot", () => {
    var app;

    beforeEach(() => {
      app = mockApp();
      plugin._state.jots = [];
    });

    it("shouldn't create a new note for the same date", async () => {

      //set up environment
      //pick a date
      const date = new Date("March 31 2025");
      const dayName = "March 31st, 2025";
      const selectedTag = "daily-jots";

      app.settings[plugin._constants.settings.TAGS] = selectedTag;

      //check initial amount of jots
      const initialNotesCount = await app.filterNotes({ tags: selectedTag }).length;
      expect(initialNotesCount).toBe(0);

      //create jot with said date
      let notesAfterCreationCount = 0;
      await plugin.onEmbedCall(app, "navigate", date, true, dayName).then(() => {
        notesAfterCreationCount = plugin._state.jots.length;
        expect(notesAfterCreationCount).toBe(initialNotesCount + 1);
      });

      //attempt creating new jot
      await plugin.onEmbedCall(app, "navigate", date, true, dayName);

      //check if existing jots are different than before
      const notesAfterFailedCreationCount = plugin._state.jots.length;
      expect(notesAfterFailedCreationCount).toBe(notesAfterCreationCount);
    });

    it("shouldn't create a new note if shift wasn't pressed", async () => {

      //set up environment
      //pick a date
      const date = new Date("March 31 2025");
      const dayName = "March 31st, 2025";
      const selectedTag = "daily-jots";

      app.settings[plugin._constants.settings.TAGS] = selectedTag;

      //check initial amount of jots
      const initialNotesCount = await app.filterNotes({ tags: selectedTag }).length;
      expect(plugin._state.jots.length).toBe(initialNotesCount);

      //attempt to create jot with shift not pressed
      await plugin.onEmbedCall(app, "navigate", date, false, dayName).then(() => {
        expect(plugin._state.jots.length).toBe(initialNotesCount);
      });
    });

    it("should display the appropriate task status bubbles", async () => {
      //set up environment
      const date = new Date("March 31 2025");
      const dayName = "March 31st, 2025";
      const tags = ["daily-jots"];

      const tasks = plugin._constants.hasTasks;

      const newNotesWithContent = [
        {
          name: "May 6th, 2025",
          tags: ["daily-jots"],
          expectation: tasks.SOME,
          content: `
- [ ] Task for blue bubble with no completed tasks<!-- {"uuid":"e97074fb-d079-4138-b01e-72fb0929d19a"} -->

- [ ] Second task<!-- {"uuid":"a3fcf853-ee84-4087-9dc8-f29f83bdbc32"} -->`
        },
        {
          name: "May 7th, 2025",
          tags: ["daily-jots"],
          expectation: tasks.DONE,
          content: `
### Other note content

Like this [list][^1] 

- Item 1

- Item 2


---

\

\

# Completed tasks<!-- {"omit":true} -->

- [x] Task for green bubble<!-- {"uuid":"0b55e927-77bb-400b-96d4-b16cf9259fff"} -->

[^1]: [list]()

    And this rich footnote
`
        },
        {
          name: "May 8th, 2025",
          tags: ["daily-jots"],
          expectation: tasks.NONE,
          content: `
Note for no bubble

### Other note content

Like this [list][^1] 

- Item 1

- Item 2


---

\

\

[^1]: [list]()

    And this rich footnote

`
        },
        {
          name: "May 9th, 2025",
          tags: ["daily-jots"],
          expectation: tasks.SOME,
          content: `
- [ ] Task for blue bubble<!-- {"uuid":"c1647485-4573-4bb7-9607-0cd3978a1c68"} -->

### Other note content

Like this [list][^1] 

- Item 1

- Item 2


---

\

# Completed tasks<!-- {"omit":true} -->

- [x] Completed task for blue bubble<!-- {"uuid":"42fcea1a-7abe-478a-864d-9bfec1d72cff"} -->

[^1]: [list]()

    And this rich footnote
`
        },
      ];

      let expectations = [];
      //create four notes
      newNotesWithContent.forEach((note) => {
        app.createNote(note.name, tags).then((createdNote) => {
          //change content of the notes
          app.replaceNoteContent(createdNote, note.content);
          expectations = [...expectations, { uuid: createdNote.uuid, expectation: note.expectation }];
        });
      })

      //refresh the jots list
      plugin.onEmbedCall(app, "fetch", date, false).then(() => {
        //check status of hasTasks fields in the _state.jots list
        plugin._state.jots.forEach(({ uuid, hasTasks }) => {
          const expct = expectations.find(({ expId }) => (uuid == expId));
          expect(hasTasks).toBe(expct.hasTasks);
        });
      })
    });
  });
});
