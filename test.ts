import { GSheets } from "./index.ts";

const people = [
  { Name: "John", Age: 22, Gender: "Male" },
  { Name: "Mary", Age: 25, Gender: "Female" },
  { Name: "Alex", Age: 30, Gender: "Male" },
];

const sheet = await GSheets.create({
  credentialsPath: "./credentials.json",
  spreadsheetId: "19MoJAvrt26b-shxUmofWlEn1rqzuwkfQXqqzHJSVDkU",
  sheetName: "test",
});

// const data = await sheet.findRow({ name: "oleh" });

// console.log(data);

// console.log(await sheet.addRow({ Name: "sasn", Age: "32", gender: "kurwa" }));
// console.log(await sheet.updateRow(3, { сity: "Moscow" }));

console.log(await sheet.deleteRow(3));
