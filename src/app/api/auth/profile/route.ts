import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { comparePassword, getUserFromRequest, hashPassword, runTransaction } from "@/lib/auth";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface ExistingUserRow extends RowDataPacket {
  id: number;
  password: string;
}

interface DuplicateUserRow extends RowDataPacket {
  id: number;
  email: string;
  mobile: string;
}

interface ProfileUser extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  mobile: string;
  usertype: string;
}

type UpdateResult = { ok: true; user: ProfileUser } | { ok: false; status: 400 | 404 | 409; message: string };

const profileUpdateSchema = z
  .object({
    retailerName: z.string().trim().min(2, "Retailer name must be at least 2 characters"),
    email: z
      .string()
      .trim()
      .email("Please enter a valid email address")
      .transform((value) => value.toLowerCase()),
    mobile: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, context) => {
    const hasCurrentPassword = Boolean(data.currentPassword);
    const hasNewPassword = Boolean(data.newPassword);
    const hasConfirmPassword = Boolean(data.confirmPassword);

    if (!hasCurrentPassword && !hasNewPassword && !hasConfirmPassword) {
      return;
    }

    if (!hasCurrentPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Current password is required to change password",
        path: ["currentPassword"],
      });
    }

    if (!hasNewPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password is required",
        path: ["newPassword"],
      });
    } else if (data.newPassword && data.newPassword.length < 8) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password must be at least 8 characters",
        path: ["newPassword"],
      });
    }

    if (hasConfirmPassword && data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password and confirm password do not match",
        path: ["confirmPassword"],
      });
    }
  });

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return unauthorized();
    }

    return NextResponse.json(
      {
        id: user.id,
        retailerName: user.name ?? "",
        name: user.name ?? "",
        email: user.email ?? "",
        mobile: user.mobile ?? "",
        role: user.usertype ?? "retailer",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return unauthorized();
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const result = profileUpdateSchema.safeParse(body);

    if (!result.success) {
      return badRequest(result.error.issues[0]?.message ?? "Invalid request");
    }

    const { retailerName, email, mobile, currentPassword, newPassword } = result.data;

    const changingPassword = Boolean(currentPassword || newPassword);

    const updateResult: UpdateResult = await runTransaction(async (connection) => {
      const [existingRows] = await connection.query<ExistingUserRow[]>(
        `
          SELECT id, password
          FROM retailer
          WHERE id = ?
            AND status = 'active'
          LIMIT 1
          FOR UPDATE
        `,
        [user.id],
      );

      const existingUser = existingRows[0];

      if (!existingUser) {
        return {
          ok: false,
          status: 404,
          message: "User not found",
        };
      }

      const [duplicateRows] = await connection.query<DuplicateUserRow[]>(
        `
          SELECT id, email, mobile
          FROM retailer
          WHERE id <> ?
            AND (LOWER(email) = LOWER(?) OR mobile = ?)
          LIMIT 1
          FOR UPDATE
        `,
        [user.id, email, mobile],
      );

      const duplicateUser = duplicateRows[0];

      if (duplicateUser) {
        if (duplicateUser.email?.toLowerCase() === email) {
          return {
            ok: false,
            status: 409,
            message: "This email address is already registered",
          };
        }

        return {
          ok: false,
          status: 409,
          message: "This mobile number is already registered",
        };
      }

      const updateColumns = ["name = ?", "email = ?", "mobile = ?"];
      const updateValues: Array<string | number> = [retailerName, email, mobile];

      if (changingPassword) {
        const passwordMatched = await currentPassword === existingUser.password;

        if (!passwordMatched) {
          return {
            ok: false,
            status: 400,
            message: "Current password is incorrect",
          };
        }

        updateColumns.push("password = ?");
        updateValues.push( await newPassword || "");
      }

      updateValues.push(user.id);

      const [updateResponse] = await connection.query<ResultSetHeader>(`UPDATE retailer SET ${updateColumns.join(", ")} WHERE id = ? LIMIT 1`, updateValues);

      if (updateResponse.affectedRows !== 1) {
        return {
          ok: false,
          status: 404,
          message: "User not found",
        };
      }

      const [updatedRows] = await connection.query<ProfileUser[]>(
        `
          SELECT id, name, email, mobile, usertype
          FROM retailer
          WHERE id = ?
          LIMIT 1
        `,
        [user.id],
      );

      const updatedUser = updatedRows[0];

      if (!updatedUser) {
        return {
          ok: false,
          status: 404,
          message: "User not found",
        };
      }

      return { ok: true, user: updatedUser };
    });

    if (!updateResult.ok) {
      return NextResponse.json({ message: updateResult.message }, { status: updateResult.status });
    }

    return NextResponse.json(
      {
        message: changingPassword ? "Profile and password updated successfully" : "Profile updated successfully",
        user: updateResult.user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
