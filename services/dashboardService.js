// ADMIN DASHBOARD

import { getDashboardKPI, getInventorySummary, getProductionAnalytics, getRecentActivities, getRecentOrders, getSummary } from "../helpers/dashboardHelper.js";

export const getAdminDashboardService = async ()=>{

    const kpi = await getDashboardKPI();

    const productionAnalytics =
        await getProductionAnalytics();

    const summary =
        await getSummary();

    const activities =
        await getRecentActivities();

    const inventory =
        await getInventorySummary();

    const recentOrders =
        await getRecentOrders();

    return {

        kpi,

        productionAnalytics,

        summary,

        activities,

        inventory,

        recentOrders,
    };

}