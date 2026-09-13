"use client";

import { useEffect, useState } from "react";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Store,
  Save,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

/* =========================================================
   VALIDATION
========================================================= */

const profileSchema = z
  .object({
    retailerName: z
      .string()
      .min(2, "Retailer name must be at least 2 characters"),

    email: z
      .string()
      .email("Please enter a valid email address"),

    mobile: z
      .string()
      .regex(/^[0-9]{10}$/, "Mobile number must be 10 digits"),

    currentPassword: z.string().optional(),

    newPassword: z
      .string()
      .optional()
      .refine(
        (value) => !value || value.length >= 8,
        "New password must be at least 8 characters"
      ),

    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.newPassword ||
      data.newPassword === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }
  );

type ProfileFormData = z.infer<typeof profileSchema>;

/* =========================================================
   PASSWORD INPUT
========================================================= */

interface PasswordInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  setShow: (value: boolean) => void;
  error?: string;
}

function PasswordInput({
  label,
  value,
  onChange,
  show,
  setShow,
  error,
}: PasswordInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-black">
        {label}
      </label>

      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          className={`
            w-full rounded-xl border
            bg-gray-50 py-3 pl-11 pr-12
            text-sm text-black
            outline-none transition-all
            placeholder:text-gray-400

            ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                : "border-gray-200 focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-100"
            }
          `}
        />

        <button
          type="button"
          onClick={() => setShow(!show)}
          className="
            absolute right-3 top-1/2
            -translate-y-1/2
            text-gray-400
            transition
            hover:text-orange-600
          "
        >
          {show ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>

      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function RetailerProfile() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [success, setSuccess] = useState("");
  const [apiError, setApiError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      retailerName: "",
      email: "",
      mobile: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const retailerName = watch("retailerName");
  const email = watch("email");
  const mobile = watch("mobile");

  /* =========================================================
     GET PROFILE
  ========================================================= */

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/auth/profile", {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile");
        }

        reset({
          retailerName: data.retailerName || data.name || "",
          email: data.email || "",
          mobile: data.mobile || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error(error);

        setApiError(
          error instanceof Error
            ? error.message
            : "Unable to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [reset]);

  /* =========================================================
     SUBMIT
  ========================================================= */

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setSaving(true);
      setSuccess("");
      setApiError("");

      const payload: Record<string, string> = {
        retailerName: data.retailerName,
        email: data.email,
        mobile: data.mobile,
      };

      // Password only send when user wants to change it
      if (data.newPassword) {
        payload.currentPassword = data.currentPassword || "";
        payload.newPassword = data.newPassword;
        payload.confirmPassword = data.confirmPassword || "";
      }

      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to update profile"
        );
      }

      setSuccess(
        result.message || "Profile updated successfully!"
      );

      // Clear password fields after successful update
      setValue("currentPassword", "");
      setValue("newPassword", "");
      setValue("confirmPassword", "");

      setTimeout(() => {
        setSuccess("");
      }, 4000);
    } catch (error) {
      console.error("Profile update error:", error);

      setApiError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />

          <p className="text-sm font-medium text-gray-500">
            Loading profile...
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 sm:px-6 lg:px-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mb-7 max-w-6xl"
      >
        <div
          className="
            flex flex-col gap-5
            rounded-2xl bg-black
            px-5 py-5 text-white
            shadow-xl

            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-7
          "
        >
          <div className="flex items-center gap-4">

            <div
              className="
                flex h-12 w-12 shrink-0
                items-center justify-center
                rounded-xl bg-orange-600
                shadow-lg shadow-orange-900/30
              "
            >
              <Store className="h-6 w-6 text-white" />
            </div>

            <div>
              <p className="text-sm font-medium text-orange-500">
                Retailer Portal
              </p>

              <h1 className="text-xl font-bold sm:text-2xl">
                My Profile
              </h1>

              <p className="mt-0.5 text-xs text-gray-400 sm:text-sm">
                Manage your retailer account
              </p>
            </div>
          </div>

          <div
            className="
              hidden items-center gap-2
              rounded-full border border-white/10
              bg-white/5 px-4 py-2
              text-sm text-gray-300
              sm:flex
            "
          >
            <ShieldCheck className="h-4 w-4 text-orange-500" />
            Secure Account
          </div>
        </div>
      </motion.div>


      {/* =====================================================
          GRID
      ===================================================== */}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3"
      >

        {/* ===================================================
            PROFILE SUMMARY
        =================================================== */}

        <motion.div
          initial={{ opacity: 0, x: -25 }}
          animate={{ opacity: 1, x: 0 }}
          className="
            h-fit overflow-hidden
            rounded-2xl bg-white
            shadow-sm ring-1 ring-gray-200
          "
        >

          <div className="h-24 bg-orange-600" />

          <div className="px-6 pb-6">

            {/* Avatar */}
            <div className="-mt-12 flex justify-center">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="
                  flex h-24 w-24
                  items-center justify-center
                  rounded-full
                  border-4 border-white
                  bg-black text-white
                  shadow-xl
                "
              >
                <User className="h-10 w-10" />
              </motion.div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="break-words text-xl font-bold text-black">
                {retailerName || "Retailer Name"}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Retailer Account
              </p>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-3">

              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-gray-400">
                    Email
                  </p>

                  <p className="truncate text-sm font-semibold text-black">
                    {email || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                  <Phone className="h-5 w-5 text-orange-600" />
                </div>

                <div>
                  <p className="text-xs text-gray-400">
                    Mobile Number
                  </p>

                  <p className="text-sm font-semibold text-black">
                    {mobile || "-"}
                  </p>
                </div>
              </div>

            </div>

            {/* Security */}
            <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />

                <div>
                  <p className="text-sm font-bold text-black">
                    Account Protected
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    Your account information is securely protected.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>


        {/* ===================================================
            RIGHT FORM
        =================================================== */}

        <motion.div
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">

            {/* PERSONAL INFORMATION */}
            <div className="p-5 sm:p-7">

              <div className="mb-6">
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black text-white">
                    <User className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-black">
                      Personal Information
                    </h2>

                    <p className="text-sm text-gray-500">
                      Update your retailer details.
                    </p>
                  </div>

                </div>
              </div>


              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                {/* NAME */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-black">
                    Retailer Name
                  </label>

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      {...register("retailerName")}
                      type="text"
                      placeholder="Enter retailer name"
                      className={`
                        w-full rounded-xl border
                        bg-gray-50 py-3 pl-11 pr-4
                        text-sm text-black
                        outline-none transition-all

                        ${
                          errors.retailerName
                            ? "border-red-400"
                            : "border-gray-200 focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        }
                      `}
                    />
                  </div>

                  {errors.retailerName && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.retailerName.message}
                    </p>
                  )}
                </div>


                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-black">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      {...register("email")}
                      type="email"
                      placeholder="Enter email address"
                      className={`
                        w-full rounded-xl border
                        bg-gray-50 py-3 pl-11 pr-4
                        text-sm text-black
                        outline-none transition-all

                        ${
                          errors.email
                            ? "border-red-400"
                            : "border-gray-200 focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        }
                      `}
                    />
                  </div>

                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>


                {/* MOBILE */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-black">
                    Mobile Number
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />

                    <input
                      {...register("mobile")}
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10 digit mobile number"
                      onInput={(e) => {
                        e.currentTarget.value =
                          e.currentTarget.value.replace(/\D/g, "");
                      }}
                      className={`
                        w-full rounded-xl border
                        bg-gray-50 py-3 pl-11 pr-4
                        text-sm text-black
                        outline-none transition-all

                        ${
                          errors.mobile
                            ? "border-red-400"
                            : "border-gray-200 focus:border-orange-600 focus:bg-white focus:ring-4 focus:ring-orange-100"
                        }
                      `}
                    />
                  </div>

                  {errors.mobile && (
                    <p className="mt-1.5 text-xs text-red-600">
                      {errors.mobile.message}
                    </p>
                  )}
                </div>

              </div>
            </div>


            {/* PASSWORD */}
            <div className="border-t border-gray-200 p-5 sm:p-7">

              <div className="mb-6">
                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white">
                    <Lock className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-black">
                      Change Password
                    </h2>

                    <p className="text-sm text-gray-500">
                      Leave password fields empty if you do not want to
                      change your password.
                    </p>
                  </div>

                </div>
              </div>


              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                <PasswordInput
                  label="Current Password"
                  value={watch("currentPassword") || ""}
                  onChange={(value) =>
                    setValue("currentPassword", value)
                  }
                  show={showCurrent}
                  setShow={setShowCurrent}
                  error={errors.currentPassword?.message}
                />

                <PasswordInput
                  label="New Password"
                  value={watch("newPassword") || ""}
                  onChange={(value) =>
                    setValue("newPassword", value)
                  }
                  show={showNew}
                  setShow={setShowNew}
                  error={errors.newPassword?.message}
                />

                <div className="sm:col-span-2">
                  <PasswordInput
                    label="Confirm New Password"
                    value={watch("confirmPassword") || ""}
                    onChange={(value) =>
                      setValue("confirmPassword", value)
                    }
                    show={showConfirm}
                    setShow={setShowConfirm}
                    error={errors.confirmPassword?.message}
                  />
                </div>

              </div>


              {/* Requirements */}
              <div className="mt-5 rounded-xl bg-gray-50 p-4">
                <p className="mb-2 text-sm font-bold text-black">
                  Password Requirements
                </p>

                <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2">
                  <span>✓ Minimum 8 characters</span>
                  <span>✓ Uppercase & lowercase letters</span>
                  <span>✓ At least one number</span>
                  <span>✓ Special character recommended</span>
                </div>
              </div>

            </div>


            {/* FOOTER */}
            <div className="flex flex-col gap-4 border-t border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">

              {/* ERROR */}
              <AnimatePresence>
                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="
                      flex items-center gap-2
                      rounded-xl
                      bg-red-50
                      px-4 py-2.5
                      text-sm font-semibold
                      text-red-600
                    "
                  >
                    <AlertCircle className="h-4 w-4" />
                    {apiError}
                  </motion.div>
                )}
              </AnimatePresence>


              {/* SUCCESS */}
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="
                      flex items-center gap-2
                      rounded-xl
                      bg-green-100
                      px-4 py-2.5
                      text-sm font-semibold
                      text-green-700
                    "
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>


              {/* SAVE */}
              <motion.button
                type="submit"
                disabled={saving}
                whileHover={!saving ? { scale: 1.02 } : {}}
                whileTap={!saving ? { scale: 0.97 } : {}}
                className="
                  flex w-full
                  items-center justify-center
                  gap-2 rounded-xl
                  bg-orange-600
                  px-7 py-3
                  text-sm font-bold
                  text-white
                  shadow-md
                  shadow-orange-200
                  transition-all

                  hover:bg-orange-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60

                  sm:w-auto
                "
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </motion.button>

            </div>

          </div>
        </motion.div>

      </form>
    </div>
  );
}
