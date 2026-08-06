"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase-browser";

type CaseViewTrackerProps = {
  caseId: string;
};

function createVisitorId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CaseViewTracker({
  caseId,
}: CaseViewTrackerProps) {
  useEffect(() => {
    async function recordView() {
      const storageKey = "justice-pool-visitor-id";

      let visitorId = window.localStorage.getItem(storageKey);

      if (!visitorId) {
        visitorId = createVisitorId();
        window.localStorage.setItem(storageKey, visitorId);
      }

      const { error } = await supabase.rpc("record_case_view", {
        case_id_input: caseId,
        visitor_id_input: visitorId,
      });

      if (error) {
        console.error("Unable to record case view:", error.message);
      }
    }

    void recordView();
  }, [caseId]);

  return null;
}