import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import Stripe from "stripe";

// On initialise Stripe avec ta clé secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    // 1. Vérifier qui est l'utilisateur connecté
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupérer les infos envoyées par le frontend
    const { priceId, credits } = await req.json();

    // 3. Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId, // L'ID du tarif (price_...)
          quantity: 1,
        },
      ],
      mode: "payment", // Paiement unique

      // 4. MÉTADONNÉES CRUCIALES (Pour retrouver l'user après le paiement)
      metadata: {
        userId: user.id,
        credits: credits.toString(),
      },

      // 5. Email pré-rempli pour l'utilisateur
      customer_email: user.email,

      // 6. Redirections
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Stripe Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
