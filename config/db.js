import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();
import fs from "fs";

console.log(fs.existsSync("config/credentials.json"));

export const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({
  version: "v4",
  auth,
});

export default sheets;