# GSheets CRUD Library

A lightweight and modern TypeScript library for performing CRUD (Create, Read, Update, Delete) operations on Google Sheets using the Google Sheets API. Built with ES6+ features and designed for Node.js environments.

---

## Features

- **Simple API**: Perform CRUD operations with minimal setup.
- **TypeScript Support**: Fully typed for better development experience.
- **Modern JavaScript**: Uses ES6+ features like `async/await`, `import`, and `class`.
- **Error Handling**: Clear error messages for common issues.
- **Dynamic Headers**: Automatically creates or updates headers based on input data.
- **Batch Operations**: Supports batch updates and deletions.

---

## Installation

Install the library using your preferred package manager:

```bash
npm install gsheets-crud
# or
yarn add gsheets-crud
# or
bun add gsheets-crud
```

---

## Prerequisites

1. **Google API Credentials**:
   - Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
   - Enable the **Google Sheets API** and **Google Drive API**.
   - Download the credentials JSON file and save it as `credentials.json` in your project root.

2. **Spreadsheet Access**:
   - Share your Google Sheet with the email address from your credentials file.

---

## Usage

### 1. Import and Initialize

```javascript
import { GSheets } from "gsheets-crud";

const config = {
  credentialsPath: "./credentials.json", // Path to your credentials file
  spreadsheetId: "your-spreadsheet-id", // ID of your Google Sheet
  sheetName: "Sheet1", // Name of the sheet to work with
};

// Initialize the GSheets instance
const gsheets = await GSheets.create(config);
```

### 2. CRUD Operations

#### **Create (Add a Row)**

```javascript
const newRow = {
  Name: "John Doe",
  Email: "john.doe@example.com",
  Age: "30",
};

const addedRow = await gsheets.addRow(newRow);
console.log("Added Row:", addedRow);
```

#### **Read (Find Rows)**

```javascript
// Find by row index
const rowByIndex = await gsheets.findRow(2); // Row index (1-based)
console.log("Row by Index:", rowByIndex);

// Find by query
const rowByQuery = await gsheets.findRow({ Name: "John Doe" });
console.log("Row by Query:", rowByQuery);
```

#### **Update (Modify Rows)**

```javascript
const updatedData = {
  Name: "Jane Doe",
  Email: "jane.doe@example.com",
};

// Update single row
await gsheets.updateRow(2, updatedData);

// Update multiple rows
await gsheets.updateRow([2, 3], updatedData);
```

#### **Delete (Remove Rows)**

```javascript
// Delete single row
await gsheets.deleteRow(2);

// Delete multiple rows
await gsheets.deleteRow([2, 3]);
```

---

## Configuration

### `GoogleSheetsConfig` Interface

| Property          | Type     | Description                                                                 |
|-------------------|----------|-----------------------------------------------------------------------------|
| `credentialsPath` | `string` | Path to the Google API credentials file (default: `./credentials.json`).    |
| `spreadsheetId`   | `string` | ID of the Google Spreadsheet to work with (required).                       |
| `sheetName`       | `string` | Name of the specific sheet within the spreadsheet (required).               |

---

## Error Handling

The library throws descriptive errors for common issues, such as:

- Missing `spreadsheetId` or `sheetName`.
- Invalid credentials file.
- Attempting to modify the header row (row index 1).
- Invalid key format (keys must start with an uppercase letter).

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Submit a pull request with a detailed description of your changes.

---

## License

This project is licensed under the MIT License.

---

## Support

If you find this library useful, consider giving it a ⭐️ on GitHub or [buying me a coffee](https://www.buymeacoffee.com/rstupa).

---

## Author

**Ruslan Mayer**
GitHub: [rstupa](https://github.com/rstupa)

---

## Keywords

- google-sheets
- crud
- typescript
- nodejs
- api
- spreadsheet
- automation
