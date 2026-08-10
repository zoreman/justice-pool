"use client";

import { ChangeEvent, useState } from "react";

import { supabase } from "@/lib/supabase-browser";

type MessageAttachmentUploadProps = {
  conversationId: number;
  userId: string;
};

export default function MessageAttachmentUpload({
  conversationId,
  userId,
}: MessageAttachmentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setMessage("");

    if (file.size > 10 * 1024 * 1024) {
      setMessage("File must be 10 MB or smaller.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const safeName = file.name.replace(
        /[^a-zA-Z0-9._-]/g,
        "_",
      );

      const storagePath = `${conversationId}/${userId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("message-attachments")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: messageRow,
        error: messageError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: `Shared a file: ${file.name}`,
        })
        .select("id")
        .single();

      if (messageError || !messageRow) {
        await supabase.storage
          .from("message-attachments")
          .remove([storagePath]);

        throw new Error(
          messageError?.message ??
            "Could not create attachment message.",
        );
      }

      const { error: attachmentError } = await supabase
        .from("message_attachments")
        .insert({
          conversation_id: conversationId,
          message_id: messageRow.id,
          uploader_id: userId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || null,
          file_size: file.size,
        });

      if (attachmentError) {
        await supabase
          .from("messages")
          .delete()
          .eq("id", messageRow.id);

        await supabase.storage
          .from("message-attachments")
          .remove([storagePath]);

        throw attachmentError;
      }

      const { error: conversationError } = await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      if (conversationError) {
        throw conversationError;
      }

      setMessage("File uploaded.");
      event.target.value = "";
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600">
        <span>📎</span>

        <span>
          {isUploading ? "Uploading..." : "Attach file"}
        </span>

        <input
          type="file"
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
        />
      </label>

      {message && (
        <p className="mt-2 text-xs text-slate-500">
          {message}
        </p>
      )}
    </div>
  );
}