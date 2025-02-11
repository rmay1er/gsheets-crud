import { google } from "googleapis";

interface GoogleSheetsConfig {
  credentialsPath?: string;
  spreadsheetId: string;
  sheetName: string;
}

export class GSheets {
  private readonly credentialsPath?: string;
  private readonly spreadsheetId: string;
  private readonly sheetName: string;
  private mainInstance: any; // Main instance for working with Google Sheets

  constructor(config: GoogleSheetsConfig) {
    if (!config.spreadsheetId)
      throw new Error("❌ ID of spreadsheet is required");
    if (!config.sheetName)
      throw new Error("❌ Name of sheet in your spreadsheet is required");

    this.credentialsPath = config.credentialsPath
      ? config.credentialsPath
      : "./credentials.json";
    this.spreadsheetId = config.spreadsheetId;
    this.sheetName = config.sheetName;
  }
  // Create new instance of GSheets
  static async create(config: GoogleSheetsConfig): Promise<GSheets> {
    const instance = new GSheets(config);
    await instance.initializeCredentials();
    return instance;
  }

  // Initilase credentials from path
  private async initializeCredentials() {
    try {
      if (!this.credentialsPath) {
        throw new Error("❌ Credentials path is undefined.");
      }
      const credentials = await Bun.file(this.credentialsPath).json();
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const authClient = await auth.getClient();
      this.mainInstance = google.sheets({
        version: "v4",
        auth: authClient as any,
      });
    } catch (error) {
      throw new Error("❌ Error loading credentials: " + error);
    }
  }

  // Get sheet ID by name for batchUpdate method
  private async getSheetId() {
    try {
      const sheetsResponse = await this.mainInstance.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      const sheet = sheetsResponse.data.sheets.find(
        (s: any) => s.properties.title === this.sheetName,
      );
      return sheet.properties.sheetId;
    } catch (error) {
      throw new Error("❌ Error getting sheet ID: " + error);
    }
  }

  // Find row by query, query can be number or object with key-value pairs
  async findRow(query: number | Record<string, string>) {
    try {
      const response = await this.mainInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
      });

      const rows = response.data.values;
      if (!rows || rows.length === 0) {
        return [];
      }

      const headers = rows[0];
      let results = [];

      if (typeof query === "number") {
        // Check for invalid row index 1
        if (query === 1) {
          throw new Error("❌ Row index cannot be 1, because it header'.");
        }
        if (query <= rows.length) {
          const data: Record<string, any> = {};
          headers.forEach((header: any, index: number) => {
            data[header] = rows[query - 1][index];
          });
          results.push({ rowIndex: query, data });
        }
      } else {
        rows.forEach((row: any, index: number) => {
          if (index === 0) return; // Skip header row
          // Check that all keys in rowData start with an uppercase letter
          const invalidKey = Object.keys(query).find(
            (key) => key[0] !== key[0].toUpperCase(),
          );

          if (invalidKey) {
            throw new Error(
              `❌ Key "${invalidKey}" must start with an uppercase letter.`,
            );
          }
          const matchesQuery = Object.entries(query).every(([key, value]) => {
            const colIndex = headers.indexOf(key);
            if (colIndex === -1) return false;
            const cellValue = row[colIndex];
            if (typeof cellValue === "string" && typeof value === "string") {
              const cellValues = cellValue
                .split(",")
                .map((v) => v.trim().toLowerCase());
              return cellValues.some((v) => v === value.toLowerCase());
            }
            return cellValue === value;
          });

          if (matchesQuery) {
            const data: Record<string, any> = {};
            headers.forEach((header: any, colIndex: number) => {
              data[header] = row[colIndex];
            });
            results.push({ rowIndex: index + 1, data });
          }
        });
      }

      return results;
    } catch (error) {
      throw new Error("❌ Error finding row: " + error);
    }
  }

  // Add new row with data to the table. If headers are missing, they will be created.
  async addRow(rowData: Record<string, string>) {
    try {
      const response = await this.mainInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
      });

      let headers = response.data.values ? response.data.values[0] : null;
      let values;

      // Check that all keys in rowData start with an uppercase letter
      const invalidKey = Object.keys(rowData).find(
        (key) => key[0] !== key[0].toUpperCase(),
      );

      if (invalidKey) {
        throw new Error(
          `❌ Key "${invalidKey}" must start with an uppercase letter.`,
        );
      }

      if (!headers) {
        headers = Object.keys(rowData);
        values = headers.map((header: any) => rowData[header] || "");

        // Add headers to the table
        await this.mainInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: this.sheetName,
          valueInputOption: "USER_ENTERED",
          resource: { values: [headers] },
        });
      } else {
        // Add missing keys to headers
        Object.keys(rowData).forEach((key) => {
          if (!headers.includes(key)) {
            headers.push(key);
          }
        });

        // Update headers in the table if they have changed
        await this.mainInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: this.sheetName,
          valueInputOption: "USER_ENTERED",
          resource: { values: [headers, ...response.data.values.slice(1)] },
        });

        values = headers.map((header: any) => rowData[header] || "");
      }

      const appendResponse = await this.mainInstance.spreadsheets.values.append(
        {
          spreadsheetId: this.spreadsheetId,
          range: this.sheetName,
          valueInputOption: "USER_ENTERED",
          resource: { values: [values] },
        },
      );

      const updatedRange = appendResponse.data.updates.updatedRange;
      const rowIndex = parseInt(updatedRange.split(":")[0].match(/\d+$/)[0]);
      return { rowIndex, rowData };
    } catch (error) {
      throw new Error("❌ Error adding row: " + error);
    }
  }

  // Update rows by specified indexes with new data.
  async updateRow(
    rowIndexes: number[] | number,
    rowData: Record<string, string>,
  ) {
    try {
      // Convert input data to an array if it's not an array
      const indexes = Array.isArray(rowIndexes) ? rowIndexes : [rowIndexes];

      // Check for invalid row index 1
      if (indexes.includes(1)) {
        throw new Error("❌ Row index cannot be 1, because it header'.");
      }
      // Check that all keys in rowData start with an uppercase letter
      const invalidKey = Object.keys(rowData).find(
        (key) => key[0] !== key[0].toUpperCase(),
      );

      if (invalidKey) {
        throw new Error(
          `❌ Key "${invalidKey}" must start with an uppercase letter.`,
        );
      }
      const response = await this.mainInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
      });

      const headers = response.data.values[0];

      // Prepare update requests for each specified index
      const requests = indexes.map((rowIndex) => {
        const rowRangeStart = `${this.sheetName}!A${rowIndex}`;
        const existingRow = response.data.values[rowIndex - 1] || [];

        // Only update specified keys in rowData
        const updatedValues = [...existingRow];
        for (const [key, value] of Object.entries(rowData)) {
          const index = headers.indexOf(key);
          if (index > -1) {
            updatedValues[index] = value;
          }
        }

        return {
          range: rowRangeStart,
          values: [updatedValues],
        };
      });

      const result = await this.mainInstance.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          valueInputOption: "USER_ENTERED",
          data: requests,
        },
      });
      return result.data;
    } catch (error) {
      throw new Error("❌ Error updating row: " + error);
    }
  }

  // Delete rows by specified indexes.
  async deleteRow(rowIndexes: number[] | number) {
    try {
      // Convert input data to an array if it's not an array
      const indexes = Array.isArray(rowIndexes) ? rowIndexes : [rowIndexes];

      // Sort indexes in reverse order so deletion starts from the end
      // This prevents index shifting when deleting multiple rows
      const sortedIndexes = indexes.sort((a, b) => b - a);

      const sheetId = await this.getSheetId();

      const requests = sortedIndexes.map((index) => ({
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: "ROWS",
            startIndex: index - 1,
            endIndex: index,
          },
        },
      }));

      const result = await this.mainInstance.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: { requests },
      });
      return { countOfDeletedRows: result.data.replies.length };
    } catch (error) {
      throw new Error("❌ Error deleting row: " + error);
    }
  }

  async convertGoogleDriveLink(url: string) {
    // Regular expression to find file ID
    const regex = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);

    if (match && match[1]) {
      // Form direct link
      return `https://drive.google.com/uc?id=${match[1]}`;
    }

    // If ID is not found, return the original link
    return url;
  }
}
