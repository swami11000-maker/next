import z from "zod";

export const submitSchema = z.object({
  vehicle_no: z.string().min(4, {
    message: "Vehicle number is required",
  }),

  mobile_no: z.string().min(10, {
    message: "Mobile number is required",
  }),

  frontside: z.string().min(1, {
    message: "Front side photo is required",
  }),

  backside: z.string().min(1, {
    message: "Back side photo is required",
  }),
});
