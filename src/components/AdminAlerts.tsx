"use client";

import {
    AlertCircle,
    CheckCircle2,
    Clock,
    X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAlerts } from "@/hooks/use-alert";

export function AdminAlerts() {
    const {
        alerts,
        loading,
        removeAlert,
    } = useAlerts();

    const [displayAlerts, setDisplayAlerts] = useState(alerts);

    console.log('ffffffffff', displayAlerts)
    useEffect(() => {
        setDisplayAlerts([...alerts]);
    }, [alerts]);

    const handleRemoveAlert = (id: string | number) => {
        setDisplayAlerts((current) =>
            current.filter((alert) => alert.id !== id)
        );

        removeAlert(id);
    };

    if (loading || displayAlerts.length === 0) {
        return null;
    }

    return (
        <div
            className="
                fixed
                right-4
                top-4
                z-[9999]
                flex
                w-[calc(100%-2rem)]
                max-w-[330px]
                flex-col
                gap-2
            "
        >
            {displayAlerts.map((alert) => {
                const status = String(
                    alert.status || ""
                ).toLowerCase();

                const isSuccess =
                    status === "success" ||
                    status === "completed";

                const isPending =
                    status === "pending" ||
                    status === "panding";

                const isFailed =
                    status === "failed" ||
                    status === "failure" ||
                    status === "error" ||
                    status === "rejected";

                return (
                    <Alert
                        key={alert.id}
                        className="
                            relative
                            flex
                            min-h-[52px]
                            w-full
                            items-center
                            gap-3
                            overflow-hidden
                            rounded-xl
                            border
                            border-gray-200
                            bg-white
                            px-3
                            py-2.5
                            shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                        "
                    >
                        {/* Icon */}
                        <div
                            className={`
                                flex
                                h-8
                                w-8
                                shrink-0
                                items-center
                                justify-center
                                rounded-lg
                                ${isPending
                                    ? "bg-orange-50 text-[#ff3f21]"
                                    : isSuccess
                                        ? "bg-emerald-50 text-emerald-600"
                                        : isFailed
                                            ? "bg-red-50 text-red-600"
                                            : "bg-gray-100 text-gray-600"
                                }
                            `}
                        >
                            {isPending ? (
                                <Clock className="h-4 w-4 animate-pulse" />
                            ) : isSuccess ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertCircle className="h-4 w-4" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 pr-5">
                            <div className="flex min-w-0 items-center gap-2">
                                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-gray-900">
                                    {alert.service_name || "Service"}
                                </p>

                                <span
                                    className={`
                                        shrink-0
                                        rounded-full
                                        px-2
                                        py-0.5
                                        text-[9px]
                                        font-bold
                                        uppercase
                                        ${isPending
                                            ? "bg-orange-100 text-orange-700"
                                            : isSuccess
                                                ? "bg-emerald-100 text-emerald-700"
                                                : isFailed
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-gray-100 text-gray-600"
                                        }
                                    `}
                                >
                                    {isPending
                                        ? "Pending"
                                        : isSuccess
                                            ? "Success"
                                            : alert.status || "Alert"}
                                </span>
                            </div>

                            {alert.order_id && (
                                <p className="mt-0.5 truncate text-[10px] text-gray-500">
                                    Order:{" "}
                                    <span className="font-medium text-gray-700">
                                        {alert.order_id}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Close */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                handleRemoveAlert(alert.id)
                            }
                            className="
                                absolute
                                right-1
                                top-1/2
                                h-6
                                w-6
                                -translate-y-1/2
                                rounded-md
                                text-gray-400
                                hover:bg-gray-100
                                hover:text-gray-900
                            "
                        >
                            <X className="h-3.5 w-3.5" />

                            <span className="sr-only">
                                Close
                            </span>
                        </Button>

                        {/* Pending line */}
                        {isPending && (
                            <span
                                className="
                                    absolute
                                    bottom-0
                                    left-0
                                    h-[2px]
                                    w-full
                                    bg-[#ff3f21]
                                "
                            />
                        )}
                    </Alert>
                );
            })}
        </div>
    );
}
