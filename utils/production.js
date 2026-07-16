//  to find production row
export const findProductionRow = async (
  soNo,
  product
) => {

  const rows = await getProductionOrders();

  const index = rows.findIndex(
    (row) =>
      row[0] === soNo &&
      row[1] === product
  );

  return {

    rowNumber: index + 1,

    rows,
  };
};




//  update cell function 
export const updateCell = async (
  range,
  value
) => {

  await sheets.spreadsheets.values.update({

    auth: await auth.getClient(),

    spreadsheetId,

    range,

    valueInputOption: "USER_ENTERED",

    requestBody: {

      values: [[value]],
    },
  });
};