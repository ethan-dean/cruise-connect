
///////////////////////////////////////////////////////////////////////////////////////////
// Util function to conditionally send response status and message.
function respondIf(condition: boolean, response: any, statusCode: number, message: string, error: string|null = "") {
  if (condition) {
    response.status(statusCode).json({ message: message, error: error });
    return true;
  }
  return false;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'respondIf.ts'.
export { 
  respondIf,
};
