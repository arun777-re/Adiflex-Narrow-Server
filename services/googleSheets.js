import sheets  from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";



const spreadsheetId = process.env.GOOGLE_SHEET_ID;

// cache for users 
const USERS_CACHE_TTL =  60 * 1000; // 8 hours in milliseconds

let usersCache = null;
let usersCacheTime = 0;

 

export const getUsers = async () => {
  try {
    const now = Date.now();


    // return cache if valid 
    if (usersCache && now - usersCacheTime < USERS_CACHE_TTL) {
      console.log("⚡ USERS CACHE HIT");
      return usersCache;
    }
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAMES.USERS}!A:G`,
    });

    usersCache = response.data.values || [];
    usersCacheTime = now;

    return usersCache;
  } catch (error) {
    console.error("FULL ERROR:");
    console.error(error);
    throw error;
  }
};

export const clearUsersCache = ()=>{
  usersCache = null;
  usersCacheTime = 0;

  console.log("🧹 USERS CACHE CLEARED");
}


