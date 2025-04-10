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
    it("should create a new note with selected tags", async () => {
      //set up environment
      const date = new Date("March 31 2025");
      const dayName = "March 31st, 2025";
      //make sure my plugin works with the selected tag
      const selectedTag = "daily-jots";
      const jotCount = plugin._state.jots.length;
      const monthNames = plugin._constants.monthNames;
      //load all notes from app
      app.settings[plugin._constants.settings.TAGS] = selectedTag;
      let notes = await app.filterNotes({tag: selectedTag});
      //call plugin
      await plugin.onEmbedCall(app, "navigate", date, true, dayName);

      const newNotes = await app.filterNotes({tag: selectedTag});

      //valid note was created
      expect(newNotes.length).toBe(jotCount + 1);
      expect(plugin._state.jots.length).toBe(jotCount + 1);
      let newJot = plugin._state.jots.at(plugin._state.jots.length - 1);
      expect(newJot.day).toBe(date.getDate());
      expect(newJot.month).toBe(monthNames[date.getMonth()]);
      expect(newJot.year).toBe(date.getFullYear());
      //test that a real note was actually created in app
        //compare with initially loaded notes
      const newlyCreatedNote = newNotes.find((newNote) => {
        return !notes.some((note)=>(note.uuid === newNote.uuid && note.name === newNote.name));
      });
      expect(newlyCreatedNote.uuid).toBe(newJot.uuid);
      //test that uuid of new note matches uuid of jot
      await app.findNote({uuid: newJot.uuid});
    });
  });

  describe("with an existing daily jot", () => {
  beforeEach(() => {
    const app = mockApp();
      app.createNote({uuid: "whatever"});
    });

    it("shouldn't create a new note if note exists", async () => {
    
      const date = {};
      const dayName = "";

      await plugin.onEmbedCall(app, "navigate", date, true, dayName);

      expect(newNotes.length).toBe(jotCount);
    
    });
  });
  
});
