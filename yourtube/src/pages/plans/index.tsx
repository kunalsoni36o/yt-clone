import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";
import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface PlanInfo {
  id: string;
  name: string;
  priceDisplay: string;
  downloadLimit: number | "unlimited";
  premiumWatchSeconds: number | "unlimited";
  adFree: boolean;
  premiumAccess: boolean;
  badges: boolean;
}

const featureList = (plan: PlanInfo) => {
  const items = [
    plan.premiumAccess
      ? "Full access to premium videos"
      : "Limited premium video preview (5 min)",
    plan.adFree ? "Ad-free playback" : "Ad-supported experience",
    plan.downloadLimit === "unlimited"
      ? "Unlimited downloads per day"
      : `${plan.downloadLimit} download${plan.downloadLimit === 1 ? "" : "s"} per day`,
  ];
  if (plan.badges) items.push("Exclusive member badge");
  if (plan.id === "gold") items.push("Ultra HD streaming & priority support");
  else if (plan.id === "silver") items.push("Extended watch time & member badge");
  else if (plan.id === "bronze") items.push("Priority customer support");
  return items;
};

const planColors: Record<string, string> = {
  free: "border-gray-200",
  bronze: "border-amber-600",
  silver: "border-slate-400",
  gold: "border-yellow-500",
};

export default function PlansPage() {
  const { user, updatePlanInState } = useUser();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    axiosInstance
      .get("/subscription/plans")
      .then((res) => setPlans(res.data))
      .catch(() => toast.error("Could not load plans"));
  }, []);

  const handleSelectPlan = async (plan: PlanInfo) => {
    if (!user) {
      toast.error("Please sign in to select a plan.");
      return;
    }

    if (plan.id === "free") {
      try {
        toast.loading("Switching to Free plan...", { id: "upgrade-plan" });
        const res = await axiosInstance.patch(`/user/plan/${user._id}`, { plan: "free" });
        updatePlanInState(res.data.plan);
        toast.success("You are now on the Free plan.", { id: "upgrade-plan" });
      } catch (error: any) {
        toast.error(error.response?.data?.message || "Failed to switch plan.", {
          id: "upgrade-plan",
        });
      }
      return;
    }

    setLoadingPlan(plan.id);
    try {
      toast.loading("Opening secure checkout...", { id: "upgrade-plan" });
      const orderRes = await axiosInstance.post("/subscription/create-order", {
        userId: user._id,
        plan: plan.id,
      });

      await openRazorpayCheckout(
        orderRes.data,
        async (paymentResponse) => {
          try {
            const verifyRes = await axiosInstance.post("/subscription/verify", {
              userId: user._id,
              ...paymentResponse,
            });
            updatePlanInState(verifyRes.data.user.plan);
            const confirmationMessage = verifyRes.data.payment?.emailSent
              ? `Welcome to ${plan.name}! Confirmation email sent.`
              : `Welcome to ${plan.name}! Confirmation saved.`;
            toast.success(confirmationMessage, {
              id: "upgrade-plan",
            });
          } catch (error: any) {
            toast.error(error.response?.data?.message || "Payment verification failed.", {
              id: "upgrade-plan",
            });
          } finally {
            setLoadingPlan(null);
          }
        },
        () => {
          toast.dismiss("upgrade-plan");
          setLoadingPlan(null);
        }
      );
      toast.dismiss("upgrade-plan");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Could not start checkout.", {
        id: "upgrade-plan",
      });
      setLoadingPlan(null);
    }
  };

  const currentPlan = user?.plan?.toLowerCase() || "free";

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Choose Your Premium Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Unlock premium videos, ad-free viewing, downloads, and more with Razorpay secure checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const features = featureList(plan);
            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between border-2 rounded-2xl p-6 shadow-sm bg-white transition duration-200 hover:shadow-lg ${
                  planColors[plan.id] || "border-gray-200"
                } ${isCurrent ? "ring-2 ring-red-600" : ""}`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      {plan.id !== "free" && <Crown className="w-5 h-5 text-amber-500" />}
                      {plan.name}
                    </h3>
                    {isCurrent && (
                      <span className="bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.priceDisplay}</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <Check className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  disabled={isCurrent || loadingPlan === plan.id}
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full mt-auto py-2.5 rounded-xl text-sm font-bold ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isCurrent
                    ? "Active Plan"
                    : loadingPlan === plan.id
                      ? "Processing..."
                      : plan.id === "free"
                        ? "Switch to Free"
                        : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
