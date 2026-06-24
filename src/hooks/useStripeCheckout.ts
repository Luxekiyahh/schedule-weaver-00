import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCheckoutSession, createPortalSession } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

/**
 * Stripe checkout (hosted redirect) and customer-portal helpers.
 * Stripe under Lovable uses a hosted Checkout Session, so we redirect the
 * browser to the returned URL.
 */
export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);
  const startCheckout = useServerFn(createCheckoutSession);
  const startPortal = useServerFn(createPortalSession);

  const openCheckout = async (options: {
    workspaceId: string;
    priceLookupKeys: string[];
    includeSetupFee?: boolean;
    customerEmail?: string;
    successPath?: string;
    cancelPath?: string;
  }) => {
    setLoading(true);
    try {
      const { url } = await startCheckout({
        data: {
          workspaceId: options.workspaceId,
          environment: getStripeEnvironment(),
          priceLookupKeys: options.priceLookupKeys,
          includeSetupFee: options.includeSetupFee ?? false,
          customerEmail: options.customerEmail,
          successPath: options.successPath ?? "/dashboard/home",
          cancelPath: options.cancelPath ?? "/pricing",
          origin: window.location.origin,
        },
      });
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async (options: { workspaceId: string; returnPath?: string }) => {
    setLoading(true);
    try {
      const { url } = await startPortal({
        data: {
          workspaceId: options.workspaceId,
          environment: getStripeEnvironment(),
          returnPath: options.returnPath ?? "/dashboard/billing",
          origin: window.location.origin,
        },
      });
      if (!url) throw new Error("No portal URL returned");
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, openPortal, loading };
}
