import sheets,{auth} from "../config/db.js";
import { SHEET_NAMES } from "../constants/sheetNames.js";

export const appendNotification = async ({
  userID,
  role,
  division,
  type,
  title,
  message,
  reference,
  read,
  readAt,
  createdAt,
}) => {
  const authClient = await auth.getClient();

  await sheets.spreadsheets.values.append({
    auth: authClient,
    spreadsheetId:process.env.NOTIFICATION_SHEET_ID,
    range: `${SHEET_NAMES.NOTIFICATIONS}!A:K`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        crypto.randomUUID(),
        role,
        division,
        type,
        title,
        message,
        reference,
        false,
        null,
        userID,
        createdAt,
      ]],
    },
  });
};