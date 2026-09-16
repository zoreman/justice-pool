import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function getRequiredEnvironmentVariable(
  name: string,
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

const stripeSecretKey =
  getRequiredEnvironmentVariable(
    "STRIPE_SECRET_KEY",
  );

const stripe = new Stripe(
  stripeSecretKey,
);

type CheckoutRequest = {
  caseId?: string;
  amount?: number;
  anonymous?: boolean;
};

export async function POST(
  request: Request,
) {
  try {
    /*
     * Normal Supabase client is used
     * for authentication.
     */
    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "You must be signed in to contribute.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as CheckoutRequest;

    const caseId =
      body.caseId?.trim();

    const amount =
      Number(body.amount);

    const anonymous =
      body.anonymous === true;

    if (!caseId) {
      return NextResponse.json(
        {
          error:
            "Missing case ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(
        amount,
      ) ||
      amount < 100 ||
      amount > 1_000_000
    ) {
      return NextResponse.json(
        {
          error:
            "Contribution must be between $1 and $10,000.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Load the case.
     *
     * Admin client is appropriate here
     * because this is trusted server-side
     * checkout logic.
     */
    const {
      data: caseData,
      error: caseError,
    } = await supabaseAdmin
      .from("cases")
      .select(
        `
          id,
          title,
          status,
          case_status
        `,
      )
      .eq(
        "id",
        caseId,
      )
      .single();

    if (
      caseError ||
      !caseData
    ) {
      return NextResponse.json(
        {
          error:
            "Case not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Closed legal cases cannot
     * receive contributions.
     */
    if (
      caseData.case_status ===
      "closed"
    ) {
      return NextResponse.json(
        {
          error:
            "This case is closed and can no longer accept contributions.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * The fundraising campaign itself
     * must also be active.
     */
    if (
      caseData.status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "This case is not accepting contributions.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Load the contributor's name.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Unable to load contributor profile:",
        profileError.message,
      );
    }

    const publicDisplayName =
      anonymous
        ? null
        : profile?.full_name?.trim() ||
          "Supporter";

    /*
     * Create the pending contribution.
     *
     * This uses the admin client because
     * payment records should be controlled
     * exclusively by trusted server code.
     */
    const {
      data: contribution,
      error: contributionError,
    } = await supabaseAdmin
      .from("contributions")
      .insert({
        case_id:
          caseData.id,

        user_id:
          user.id,

        amount,

        status:
          "pending",

        anonymous,

        display_name:
          publicDisplayName,
      })
      .select("id")
      .single();

    if (
      contributionError ||
      !contribution
    ) {
      console.error(
        "Contribution creation error:",
        contributionError,
      );

      return NextResponse.json(
        {
          error:
            contributionError?.message ??
            "Could not create contribution.",
        },
        {
          status: 500,
        },
      );
    }

    const siteUrl =
      process.env
        .NEXT_PUBLIC_SITE_URL ??
      new URL(
        request.url,
      ).origin;

    let session:
      Stripe.Checkout.Session;

    try {
      /*
       * Create Stripe Checkout.
       */
      session =
        await stripe.checkout.sessions.create(
          {
            mode: "payment",

            customer_email:
              user.email,

            line_items: [
              {
                quantity: 1,

                price_data: {
                  currency:
                    "usd",

                  unit_amount:
                    amount,

                  product_data: {
                    name:
                      `Contribution to ${caseData.title}`,

                    description:
                      "Support approved legal fees and case expenses.",
                  },
                },
              },
            ],

            metadata: {
              contribution_id:
                String(
                  contribution.id,
                ),

              case_id:
                caseData.id,

              user_id:
                user.id,
            },

            success_url:
              `${siteUrl}/contribution/success` +
              `?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url:
              `${siteUrl}/cases/${caseData.id}`,
          },
        );
    } catch (error) {
      /*
       * Stripe failed after the pending
       * contribution was created.
       *
       * Delete that pending record.
       */
      const {
        error: cleanupError,
      } = await supabaseAdmin
        .from(
          "contributions",
        )
        .delete()
        .eq(
          "id",
          contribution.id,
        )
        .eq(
          "status",
          "pending",
        );

      if (cleanupError) {
        console.error(
          "Unable to clean up failed contribution:",
          cleanupError.message,
        );
      }

      throw error;
    }

    /*
     * Save the Stripe Checkout Session
     * ID to the pending contribution.
     *
     * Admin client avoids RLS blocking
     * this trusted server-side update.
     */
    const {
      data: updatedContribution,
      error: updateError,
    } = await supabaseAdmin
      .from(
        "contributions",
      )
      .update({
        stripe_session_id:
          session.id,
      })
      .eq(
        "id",
        contribution.id,
      )
      .eq(
        "user_id",
        user.id,
      )
      .eq(
        "status",
        "pending",
      )
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error(
        "Contribution session update error:",
        updateError,
      );

      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        },
      );
    }

    if (!updatedContribution) {
      console.error(
        "Pending contribution disappeared before Stripe session could be attached.",
        {
          contributionId:
            contribution.id,
          userId:
            user.id,
          sessionId:
            session.id,
        },
      );

      return NextResponse.json(
        {
          error:
            "The contribution changed before checkout could be started. Please try again.",
        },
        {
          status: 409,
        },
      );
    }

    if (!session.url) {
      return NextResponse.json(
        {
          error:
            "Stripe did not return a checkout URL.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      "Checkout error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to start checkout.",
      },
      {
        status: 500,
      },
    );
  }
}