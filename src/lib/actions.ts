import { runQuery } from "@/lib/auth";

export interface ServiceFeeResult {
  balance: number;
  fee: number;
}

export async function getServiceFee(userId: number | string, feeColumn: string, defaultFee = 50): Promise<ServiceFeeResult> {
  const feeRows = await runQuery<
    {
      balance: number;
      fee: number;
    }[]
  >(
    `
      SELECT
        balance,
        \`${feeColumn}\` AS fee
      FROM retailer
      WHERE id = ?
      LIMIT 1
    `,
    [userId],
  );

  if (feeRows.length === 0) {
    throw new Error("Retailer account not found");
  }

  return {
    balance: Number(feeRows[0].balance ?? 0),

    fee: Number(feeRows[0].fee ?? defaultFee),
  };
}

