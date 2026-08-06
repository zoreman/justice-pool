import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase-server";

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

const stripe = new Stripe(stripeSecretKey);

type CheckoutRequest = {
  caseId?: string;
  amount?: number;
  anonymous?: boolean;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be signed in to contribute." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as CheckoutRequest;

    const caseId = body.caseId?.trim();
    const amount = Number(body.amount);
    const anonymous = body.anonymous === true;

    if (!caseId) {
      return NextResponse.json(
        { error: "Missing case ID." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(amount) ||
      amount < 100 ||
      amount > 1_000_000
    ) {
      return NextResponse.json(
        {
          error: "Contribution must be between $1 and $10,000.",
        },
        { status: 400 },
      );
    }

    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("id, title, status")
      .eq("id", caseId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: "Case not found." },
        { status: 404 },
      );
    }

    if (caseData.status !== "active") {
      return NextResponse.json(
        { error: "This case is not accepting contributions." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const publicDisplayName = anonymous
      ? null
      : profile?.full_name?.trim() || "Supporter";

    const { data: contribution, error: contributionError } =
      await supabase
        .from("contributions")
        .insert({
          case_id: caseData.id,
          user_id: user.id,
          amount,
          status: "pending",
          anonymous,
          display_name: publicDisplayName,
        })
        .select("id")
        .single();

    if (contributionError || !contribution) {
      return NextResponse.json(
        {
          error:
            contributionError?.message ??
            "Could not create contribution.",
        },
        { status: 500 },
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      customer_email: user.email,

      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,

            product_data: {
              name: `Contribution to ${caseData.title}`,
              description:
                "Support approved legal fees and case expenses.",
            },
          },
        },
      ],

      metadata: {
        contribution_id: String(contribution.id),
        case_id: caseData.id,
        user_id: user.id,
      },

      success_url:
        `${siteUrl}/contribution/success` +
        `?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${siteUrl}/cases/${caseData.id}`,
    });

    const { error: updateError } = await supabase
      .from("contributions")
      .update({
        stripe_session_id: session.id,
      })
      .eq("id", contribution.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start checkout.",
      },
      { status: 500 },
    );
  }
}