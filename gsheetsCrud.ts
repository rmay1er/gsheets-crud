import { google } from "googleapis";

/**
 * Configuration interface for Google Sheets API operations
 * @typedef {Object} GoogleSheetsConfig
 * @property {string} [credentialsPath] - Path to Google API credentials file (default: './credentials.json')
 * @property {string} spreadsheetId - ID of the Google Spreadsheet to work with
 * @property {string} sheetName - Name of the specific sheet within the spreadsheet
 */
interface GoogleSheetsConfig {
  credentialsPath?: string;
  spreadsheetId: string;
  sheetName: string;
}

/**
 * Class providing CRUD operations for Google Sheets
 */
export class GSheets {
  private readonly credentialsPath?: string;
  private readonly spreadsheetId: string;
  private readonly sheetName: string;
  /** @private Main Google Sheets API instance */
  private mainInstance: any;

  /**
   * Creates a new GSheets instance
   * @param {GoogleSheetsConfig} config - Configuration object
   * @throws {Error} If spreadsheetId or sheetName are missing
   */
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

  /**
   * Factory method to create a ready-to-use GSheets instance
   * @static
   * @param {GoogleSheetsConfig} config - Configuration object
   * @returns {Promise<GSheets>} Initialized GSheets instance
   */
  static async create(config: GoogleSheetsConfig): Promise<GSheets> {
    const instance = new GSheets(config);
    await instance.initializeCredentials();
    return instance;
  }

  /**
   * Initializes Google API credentials
   * @private
   * @throws {Error} If credentials loading fails
   */
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

  /**
   * Retrieves sheet ID by sheet name
   * @private
   * @returns {Promise<number>} Numeric sheet ID
   * @throws {Error} If sheet ID retrieval fails
   */
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

  /**
   * Finds rows matching the query criteria
   * @param {number|Object} query - Row index (number) or search criteria (object)
   * @returns {Promise<Array<{rowIndex: number, data: Object}>>} Array of matching rows
   * @throws {Error} If query execution fails or invalid key format
   */
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
          if (index === 0) return;
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

  /**
   * Adds a new row to the sheet, creating headers if missing
   * @param {Object} rowData - Data to add (keys must start with uppercase)
   * @returns {Promise<{rowIndex: number, rowData: Object}>} Added row info
   * @throws {Error} If operation fails or invalid key format
   */
  async addRow(rowData: Record<string, string>) {
    try {
      const response = await this.mainInstance.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: this.sheetName,
      });

      let headers = response.data.values ? response.data.values[0] : null;
      let values;

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

        await this.mainInstance.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: this.sheetName,
          valueInputOption: "USER_ENTERED",
          resource: { values: [headers] },
        });
      } else {
        Object.keys(rowData).forEach((key) => {
          if (!headers.includes(key)) {
            headers.push(key);
          }
        });

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

  /**
   * Updates specified rows with new data
   * @param {number|number[]} rowIndexes - Single index or array of indexes
   * @param {Object} rowData - Data to update (keys must start with uppercase)
   * @returns {Promise<any>} API response
   * @throws {Error} If operation fails or invalid key format
   */
  async updateRow(
    rowIndexes: number[] | number,
    rowData: Record<string, string>,
  ) {
    try {
      const indexes = Array.isArray(rowIndexes) ? rowIndexes : [rowIndexes];

      if (indexes.includes(1)) {
        throw new Error("❌ Row index cannot be 1, because it header'.");
      }
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

      const requests = indexes.map((rowIndex) => {
        const rowRangeStart = `${this.sheetName}!A${rowIndex}`;
        const existingRow = response.data.values[rowIndex - 1] || [];

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

  /**
   * Deletes specified rows from the sheet
   * @param {number|number[]} rowIndexes - Single index or array of indexes
   * @returns {Promise<{countOfDeletedRows: number}>} Deletion result
   * @throws {Error} If operation fails
   */
  async deleteRow(rowIndexes: number[] | number) {
    try {
      const indexes = Array.isArray(rowIndexes) ? rowIndexes : [rowIndexes];
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

  /**
   * Converts Google Drive share link to direct download link
   * @param {string} url - Google Drive share URL
   * @returns {string} Direct download URL or original if conversion fails
   */
  async convertGoogleDriveLink(url: string) {
    const regex = /\/d\/([a-zA-Z0-9_-]+)/;

    // Проверка, что параметр url определен и является строкой
    if (typeof url !== "string") {
      console.error("Invalid URL provided. Expected a string, but got:", url);
      return url; // возвращаем исходный url в случае неверного формата
    }

    try {
      const match = url.match(regex);

      if (match && match[1]) {
        return `https://drive.google.com/uc?id=${match[1]}`;
      }

      console.warn("No match found in the provided URL:", url);
      return url;
    } catch (error) {
      console.error("Error occurred during URL conversion:", error);
      throw error;
    }
  }
}
