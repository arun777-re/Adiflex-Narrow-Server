import { getAllActivityBasedOnDate } from "../services/activity.service.js";




export const getAllActivities = async (req, res) => {
    try{
        const {date} = req.query;
        console.log('Received date:', date); // Debugging log
await getAllActivityBasedOnDate(date).then((activities)=>{
    res.status(200).json({activities});
}).catch((error)=>{
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Internal server error' });
})
        // Fetch activities from the database based on the provided date

    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}