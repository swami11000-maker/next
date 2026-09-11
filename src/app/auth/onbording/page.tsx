import { CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { callCheckOrderStatus } from "../../api/auth/self-activation/route";

interface OnboardingProps {
  searchParams: Promise<{
    order_id?: string;
  }>;
}

export default async function Onboarding({
  searchParams,
}: OnboardingProps) {
  const params = await searchParams;
  const orderId = params.order_id;

  if (!orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
        <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl dark:bg-black/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <CreditCard className="h-7 w-7 text-red-500" />
            </div>

            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
              Payment Status
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col items-center py-8">
              <p className="text-red-500 font-medium text-center">
                Order ID not found in URL
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  let error: string | null = null;
  let paymentConfirmed = false;

  try {
    const result = await callCheckOrderStatus(orderId);


    paymentConfirmed = true;
  } catch (err) {
    error =
      err instanceof Error
        ? err.message
        : "Failed to check payment status";
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-xl rounded-3xl dark:bg-black/60 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <div
              className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                error
                  ? "bg-red-500/10"
                  : "bg-[#ff3800]/10"
              }`}
            >
              <CreditCard
                className={`h-7 w-7 ${
                  error
                    ? "text-red-500"
                    : "text-[#ff3800]"
                }`}
              />
            </div>

            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white">
              Payment Status Check
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col items-center space-y-6 py-8">
              {error ? (
                <div className="text-center space-y-3">
                  <p className="text-red-500 font-medium">
                    {error}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-green-500 font-medium">
                    Payment confirmed!
                  </p>

                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Your payment has been successfully verified.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
