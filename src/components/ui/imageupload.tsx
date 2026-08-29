import { AlertCircle, ImagePlus, Upload, X } from "lucide-react";
import { Input } from "./input";
import { FormLabel } from "./form";
import React from "react";
import { toast } from "./toast";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: File;
  onChange: (file: File | undefined) => void;
  error?: string;
  label: string;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];


export function ImageUpload({
  value,
  onChange,
  error,
  label,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = React.useState(false);


  const preview = React.useMemo<string | null>(() => {
    if (!value) return null;

    return URL.createObjectURL(value);
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);


  const handleFile = (file?: File) => {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid image format", {
        description:
          "Only JPG, JPEG, PNG or WEBP images are allowed.",
      });

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image too large", {
        description: "Please select an image smaller than 2 MB.",
      });

      return;
    }

    onChange(file);
  };


  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    handleFile(file);
  };

  /* -------------------------------------------------------
     Drag & Drop
  ------------------------------------------------------- */

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    handleFile(file);
  };

  /* -------------------------------------------------------
     Remove
  ------------------------------------------------------- */

  const removeFile = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();

    onChange(undefined);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <div className="w-full space-y-2">
      {/* Label */}

      <div className="flex items-center justify-between gap-2">
        <FormLabel className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-gray-300">
          <ImagePlus className="h-4 w-4 shrink-0 text-[#ff3800]" />

          <span>{label}</span>

          <span className="hidden text-xs font-normal text-slate-400 sm:inline dark:text-gray-500">
            Maximum 2 MB
          </span>
        </FormLabel>
      </div>

      {/* Upload Box */}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => {
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[210px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 sm:min-h-[230px]",

          "bg-slate-50/70 dark:bg-white/[0.03]",

          isDragging
            ? "border-[#ff3800] bg-[#ff3800]/5"
            : "border-slate-200 dark:border-[#ff3800]/20",

          "hover:border-[#ff3800]/60 hover:bg-[#ff3800]/5",

          error &&
            "border-red-400 bg-red-50/30 dark:border-red-500/50 dark:bg-red-500/5"
        )}
      >
        <Input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
        />

        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{
                opacity: 0,
                scale: 0.95,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
              }}
              className="relative h-[210px] w-full p-3 sm:h-[230px]"
            >
              <img
                src={preview}
                alt={label}
                className="h-full w-full rounded-xl bg-white object-contain dark:bg-black/30"
              />

              {/* Remove Button */}

              <button
                type="button"
                onClick={removeFile}
                className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-[#ff3800]"
              >
                <X className="h-4 w-4" />
              </button>

              {/* File Name */}

              <div className="absolute bottom-5 left-5 right-5">
                <div className="flex items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-xs text-white backdrop-blur-md">
                  <ImagePlus className="h-3.5 w-3.5 shrink-0" />

                  <span className="truncate">
                    {value?.name}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              className="flex flex-col items-center justify-center px-4 py-8 text-center"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff3800]/10 ring-1 ring-[#ff3800]/10">
                <Upload className="h-6 w-6 text-[#ff3800]" />
              </div>

              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                Upload {label}
              </p>

              <p className="mt-2 text-xs text-slate-400 dark:text-gray-500">
                JPG, JPEG, PNG or WEBP
              </p>

              <p className="mt-1 text-xs text-slate-400 dark:text-gray-500">
                Maximum 2 MB
              </p>

              <span className="mt-4 rounded-lg border border-[#ff3800]/20 bg-[#ff3800]/5 px-3 py-1.5 text-xs font-medium text-[#ff3800]">
                Click or Drag & Drop
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Validation Error */}

      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-500">
          <AlertCircle className="h-3.5 w-3.5" />

          {error}
        </p>
      )}
    </div>
  );
}