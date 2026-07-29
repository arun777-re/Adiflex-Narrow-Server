import { updateCell } from "../config/db.js";
import { appendDispatch } from "../services/dispatchSheet.js";
import { handleInternalFG } from "../services/fgSheets.js";

export const handleFinishedGoods = async ({
    soNo,
    product,
    division,
    manufacturedQty,
    wastageQty,
    updatedBy
}) => {

    const nettQty = manufacturedQty - wastageQty;

    const orderType = await getOrderType(soNo, product);

    if (orderType === "Customer") {

        await appendDispatch({
            values: [
                soNo,
                product,
                division,
                manufacturedQty,
                wastageQty,
                nettQty,
                0,
                nettQty,
                "Ready To Dispatch",
                new Date().toLocaleString(),
                new Date().toLocaleString(),
            ],
        });

    } else {

        await handleInternalFG({
            soNo,
            product,
            qty: nettQty,
            updatedBy,
        });

    }

    return nettQty;
};


export const resetProductionCycle = async ({
    division,
    rowNumber,
    remainingQty,
}) => {

    // Target Qty
    await updateCell({
        division,
        range: `E${rowNumber}`,
        value: remainingQty,
    });

    // Production Qty
    await updateCell({
        division,
        range: `G${rowNumber}`,
        value: "",
    });

    // Job Work
    await updateCell({ division, range:`H${rowNumber}`, value:"" });
    await updateCell({ division, range:`I${rowNumber}`, value:"" });
    await updateCell({ division, range:`J${rowNumber}`, value:"" });

    // Warping
    await updateCell({ division, range:`K${rowNumber}`, value:"" });
    await updateCell({ division, range:`L${rowNumber}`, value:"" });
    await updateCell({ division, range:`M${rowNumber}`, value:"" });

    // Filling
    await updateCell({ division, range:`N${rowNumber}`, value:"" });
    await updateCell({ division, range:`O${rowNumber}`, value:"" });
    await updateCell({ division, range:`P${rowNumber}`, value:"" });

    // Machine
    await updateCell({ division, range:`Q${rowNumber}`, value:"" });
    await updateCell({ division, range:`R${rowNumber}`, value:"" });
    await updateCell({ division, range:`S${rowNumber}`, value:"" });

    // Finishing
    await updateCell({ division, range:`T${rowNumber}`, value:"" });
    await updateCell({ division, range:`U${rowNumber}`, value:"" });
    await updateCell({ division, range:`V${rowNumber}`, value:"" });

    // Quality
    await updateCell({ division, range:`W${rowNumber}`, value:"" });
    await updateCell({ division, range:`X${rowNumber}`, value:"" });
    await updateCell({ division, range:`Y${rowNumber}`, value:"" });

    // Wastage
    await updateCell({ division, range:`Z${rowNumber}`, value:0 });

    // Rolling
    await updateCell({ division, range:`AA${rowNumber}`, value:"" });
    await updateCell({ division, range:`AB${rowNumber}`, value:"" });
    await updateCell({ division, range:`AC${rowNumber}`, value:"" });

    // Packing
    await updateCell({ division, range:`AD${rowNumber}`, value:"" });
    await updateCell({ division, range:`AE${rowNumber}`, value:"" });
    await updateCell({ division, range:`AF${rowNumber}`, value:"" });

    // Status
    await updateCell({
        division,
        range:`AG${rowNumber}`,
        value:"Pending",
    });

    // Nett Qty
    await updateCell({
        division,
        range:`AH${rowNumber}`,
        value:"",
    });

    // Updated By
    await updateCell({
        division,
        range:`AI${rowNumber}`,
        value:"",
    });

    // Updated Time
    await updateCell({
        division,
        range:`AJ${rowNumber}`,
        value:"",
    });

    return true;
};