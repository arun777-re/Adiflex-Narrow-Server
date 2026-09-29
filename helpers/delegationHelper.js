import sheets from "../config/db.js"
import { SHEET_NAMES } from "../constants/sheetNames.js";

const SPREADSHEET_ID = process.env.DELEGATION_SHEET_ID;

export const getDelegations = async()=>{
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId:SPREADSHEET_ID,
            range:`${SHEET_NAMES.DELEGATION_SHEET}!A:H`,
        });
        return response.data.values || [];
    } catch (error) {
        console.error("getDelegation Error:",error);
        throw error;
    }
}


export const appendDelegation = async(values)=>{
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId:SPREADSHEET_ID,
            range:`${SHEET_NAMES.DELEGATION_SHEET}!A:H`,
            valueInputOption:"USER_ENTERED",
            insertDataOption:"INSERT_ROWS",
            requestBody:{
                values:[values]
            }
        });
        return true;
    } catch (error) {
        console.error("append Delegation Error:",error);
        throw error;
    }
}