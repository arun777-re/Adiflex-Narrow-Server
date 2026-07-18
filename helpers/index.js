// helpers/index.js

export const columnToIndex = (
  column
) => {

  let result = 0;


  for (
    let i = 0;
    i < column.length;
    i++
  ) {

    result =
      result * 26 +

      column.charCodeAt(i) -

      64;

  }


  return result - 1;

};

