import { jest } from "@jest/globals"
import { mockApp, mockPlugin, mockNote } from "../test-helpers.js"

const REPO_URL = "https://github.com/alloy-org/plugin-builder";
// --------------------------------------------------------------------------------------
describe("This here plugin", () => {
  const plugin = mockPlugin();
  plugin._testEnvironment = true;

  // --------------------------------------------------------------------------------------
  describe("With a shift-click on a day", () => {

    beforeEach(() => {
      const app = mockApp();
    });

    it("should create a new note with selected tags", async () => {
      //set up environment
      const date = {};
      const dayName = "";
      //make sure my plugin works with the selected tag
      const selectedTag = "daily-jots";
      const jotCount = plugin._state.jots.length;
      //load all notes from app
      const notes = await app.filterNotes({tag: selectedTag});
      //call plugin
      await plugin.onEmbedCall(app, "navigate", date, true, dayName);

      const newNotes = await app.filterNotes({tag: selectedTag});

      //valid note was created
      expect(newNotes.length).toBe(jotCount + 1);
      expect(plugin._state.jots.length).toBe(jotCount + 1);
      let newJot = plugin._state.jots.at(plugin._state.jots.length - 1);
      expect(newJot.day).toBe(date.getDate());
      expect(newJot.month).toBe(date.getMonth());
      expect(newJot.year).toBe(date.getFullYear());
      //test that a real note was actually created in app
        //compare with initially loaded notes
      const newlyCreatedNote = newNotes.filter((newNote) => {
        !notes.contains((note)=>(note.name === newNote.name, note.uuid === newNote.uuid));
      });
      expect(newlyCreatedNote.uuid).toBe(newJot.uuid);
      //test that uuid of new note matches uuid of jot
      await app.findNote({uuid: newJot.uuid});
    });
  });
  //   Shift-navigating to note
  // name reflects day correctly
  // tags are being saved properly

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
