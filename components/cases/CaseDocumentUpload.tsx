"use client";

import {
  ChangeEvent,
  useRef,
  useState,
} from "react";

import {
  assertCanUploadCaseDocument,
  fulfillMatchingDocumentRequest,
  notifyCaseDocumentUploaded,
} from "@/app/cases/[id]/document-actions";

import { supabase } from "@/lib/supabase-browser";

type CaseDocumentUploadProps = {
  caseId: string;
  userId: string;
};

type MessageType =
  | "success"
  | "error"
  | null;

export default function CaseDocumentUpload({
  caseId,
  userId,
}: CaseDocumentUploadProps) {
  const inputRef =
    useRef<HTMLInputElement>(null);

  const [category, setCategory] =
    useState("evidence");

  const [isUploading, setIsUploading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messageType, setMessageType] =
    useState<MessageType>(null);

  const [selectedFile, setSelectedFile] =
    useState<{
      name: string;
      size: string;
    } | null>(null);

  function formatFileSize(bytes: number) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  function resetFileInput() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    setSelectedFile(null);
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");
    setMessageType(null);

    setSelectedFile({
      name: file.name,
      size: formatFileSize(file.size),
    });

    if (
      file.size >
      20 * 1024 * 1024
    ) {
      setMessage(
        "File must be 20 MB or smaller.",
      );
      setMessageType("error");
      resetFileInput();
      return;
    }

    setIsUploading(true);

    let storagePath:
      | string
      | null = null;

    let documentCreated = false;

    try {
      /*
       * Verify authorization before
       * uploading anything.
       */
      await assertCanUploadCaseDocument(
        caseId,
      );

      const safeName =
        file.name.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );

      storagePath =
        `${caseId}/${userId}/${Date.now()}-${safeName}`;

      /*
       * Upload to private Storage.
       */
      const {
        error: uploadError,
      } = await supabase.storage
        .from("case-documents")
        .upload(
          storagePath,
          file,
          {
            cacheControl: "3600",
            upsert: false,
          },
        );

      if (uploadError) {
        throw new Error(
          `Storage upload failed: ${uploadError.message}`,
        );
      }

      /*
       * Create document record.
       */
      const {
        error: documentError,
      } = await supabase
        .from("case_documents")
        .insert({
          case_id: caseId,
          uploader_id: userId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type:
            file.type || null,
          file_size: file.size,
          category,
        });

      if (documentError) {
        /*
         * Remove orphaned Storage file
         * if database creation fails.
         */
        await supabase.storage
          .from("case-documents")
          .remove([storagePath]);

        storagePath = null;

        throw new Error(
          `Database insert failed: ${documentError.message}`,
        );
      }

      documentCreated = true;

      const fulfilledRequest =
        await fulfillMatchingDocumentRequest(
          caseId,
          category,
          file.name,
        );

      if (!fulfilledRequest) {
        await notifyCaseDocumentUploaded(
          caseId,
          file.name,
        );
      }

      setMessage(
        fulfilledRequest
          ? "Document uploaded and request fulfilled."
          : "Document uploaded successfully.",
      );

      setMessageType("success");
      resetFileInput();
    } catch (error) {
      /*
       * Clean up a Storage object if
       * creation failed before the
       * database record was completed.
       */
      if (
        storagePath &&
        !documentCreated
      ) {
        await supabase.storage
          .from("case-documents")
          .remove([storagePath]);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload document.",
      );

      setMessageType("error");
      resetFileInput();
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">
        Case documents
      </p>

      <h3 className="mt-3 text-xl font-semibold text-ink-950">
        Upload document
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        Upload evidence and private files for this
        case. Maximum file size is 20 MB.
      </p>

      <label
        htmlFor="document-category"
        className="mt-5 block text-sm font-medium text-slate-700"
      >
        Document type
      </label>

      <select
        id="document-category"
        value={category}
        onChange={(event) =>
          setCategory(event.target.value)
        }
        disabled={isUploading}
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-ink-950 outline-none transition focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="evidence">
          Evidence
        </option>

        <option value="lease_contract">
          Lease / Contract
        </option>

        <option value="court_filing">
          Court filing
        </option>

        <option value="correspondence">
          Correspondence
        </option>

        <option value="identification">
          Identification
        </option>

        <option value="other">
          Other
        </option>
      </select>

      <label
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold transition ${
          isUploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer text-slate-700 hover:border-brand-500 hover:bg-brand-50 hover:text-brand-600"
        }`}
      >
        {isUploading ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500"
          />
        ) : (
          <span aria-hidden="true">
            📎
          </span>
        )}

        <span>
          {isUploading
            ? "Uploading document..."
            : "Choose a file"}
        </span>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
        />
      </label>

      {selectedFile && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="truncate text-sm font-medium text-slate-700">
            {selectedFile.name}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {selectedFile.size}
          </p>
        </div>
      )}

      {message && (
        <div
          role={
            messageType === "error"
              ? "alert"
              : "status"
          }
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            messageType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <p className="mt-4 text-xs leading-5 text-slate-400">
        Accepted: PDF, Word, PNG, JPG, WEBP and TXT.
        Documents are private to case participants.
      </p>
    </div>
  );
}