import { GSheets } from "./index.ts";
import { expect, test, describe } from "bun:test";

describe("GSheets", () => {
  test("create should initialize a sheet", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    expect(sheet).toBeDefined();
  });

  test("addRow should add a row to the sheet", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    const result = await sheet.addRow({
      Name: "Test",
      Age: "test age",
      Quality: "test qualiity",
    });
    expect(result).toBeTruthy();
  });

  test("addRow should throw error if keys aren't uppercase", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    expect(
      sheet.addRow({
        name: "Test",
        Age: "test age",
        Quality: "test quality",
      }),
    ).rejects.toThrow();
  });

  test("updateRow should update a row in the sheet", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    const result = await sheet.updateRow(4, { Name: "Sasha" });
    expect(result).toBeTruthy();
  });

  test("updateRow should throw error if keys aren't uppercase", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    expect(sheet.updateRow(4, { name: "Test name" })).rejects.toThrow();
  });

  test("updateRow should throw error if rowIndexes include 1", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    expect(sheet.updateRow(1, { Name: "not updated row" })).rejects.toThrow();
  });

  test("deleteRow should delete a row from the sheet", async () => {
    const sheet = await GSheets.create({
      spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
      sheetName: "test",
    });

    const result = await sheet.deleteRow(3);
    expect(result).toBeTruthy();
  });
});
