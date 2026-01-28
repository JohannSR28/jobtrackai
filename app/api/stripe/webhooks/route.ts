import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/utils/supabase/admin";

// 1. Init Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

export async function POST(req: Request) {
  const body = await req.text();

  // Correct pour Next.js 15
  const signature = (await headers()).get("Stripe-Signature") as string;

  let event: Stripe.Event;

  // 3. VÉRIFICATION DE SÉCURITÉ
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Webhook signature verification failed.", error.message);
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // 4. TRAITEMENT DE L'ÉVÉNEMENT
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Récupération des métadonnées
    const userId = session.metadata?.userId;
    const creditsString = session.metadata?.credits;

    console.log(
      `💰 Webhook reçu : User ${userId} a acheté ${creditsString} crédits.`
    );

    if (userId && creditsString) {
      const amount = parseInt(creditsString, 10);

      // On utilise ton client Admin ici
      const supabaseAdmin = createAdminClient();

      // 5. LIVRAISON
      const { error } = await supabaseAdmin.from("token_transactions").insert({
        user_id: userId,
        amount: amount,
        type: "PURCHASE",
        description: `Achat Stripe - Session ${session.id.slice(-8)}`,
        reference_id: session.id,
      });

      if (error) {
        console.error("❌ Erreur insertion DB:", error);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
      }

      console.log("✅ Crédits livrés avec succès !");
    }
  }

  return NextResponse.json({ received: true });
}
