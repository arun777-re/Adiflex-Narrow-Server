import sheets from "../config/db.js"
import { DELEGATION_COLUMNS } from "../constants/delegationColumns.js";
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


export const mapDelegationSheet = ({rows=[]})=>{
    if(!Array.isArray(rows)){
        throw new Error("Raw data is not array");
    }
    return rows.slice(1).map((row) => {
      return {
        taskID: row[DELEGATION_COLUMNS.TASK_ID],
        description: row[DELEGATION_COLUMNS.TASK_NAME],
        assignedBy: row[DELEGATION_COLUMNS.ASSIGNED_BY],
        assignedTo: row[DELEGATION_COLUMNS.ASSIGNED_TO],
        assignedAt: row[DELEGATION_COLUMNS.ASSIGNED_AT],
        dueTime: row[DELEGATION_COLUMNS.DUE_TIME],
        priority: row[DELEGATION_COLUMNS.PRIORITY],
        status: row[DELEGATION_COLUMNS.STATUS],
      };
    });
}