export const sendResponse = ({ res, statusCode, message, success,data }) => {
  return res.status(statusCode || 500).json({ 
    message: message || "An error occurred",
    success: success || false,
    data: data || null,
  });
};
