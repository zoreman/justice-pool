import { NextResponse } from "next/server";
import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase-admin";

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

const stripeSecretKey = getRequiredEnvironmentVariable(
  "STRIPE_SECRET_KEY",
);

const webhookSecret = getRequiredEnvironmentVariable(
  "STRIPE_WEBHOOK_SECRET",
);

const stripe = new Stripe(stripeSecretKey);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Webhook signature error:", error);

    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.payment_status !== "paid") {
        return NextResponse.json({ received: true });
      }

      const contributionId = Number(
        session.metadata?.contribution_id,
      );

      const caseId = session.metadata?.case_id;

      if (!Number.isInteger(contributionId) || !caseId) {
        throw new Error("Missing contribution metadata.");
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : "";

      const { error: completionError } =
        await supabaseAdmin.rpc("complete_contribution", {
          contribution_id_input: contributionId,
          case_id_input: caseId,
          payment_intent_input: paymentIntentId,
        });

      if (completionError) {
        throw new Error(completionError.message);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 },
    );
  }
}