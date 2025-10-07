import { Resend } from "resend";

const resendClient = new Resend(process.env.RESEND_SECRET!);

function getResendClient() {
  return resendClient;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'getResendClient.ts'.
export {
  getResendClient,
};
