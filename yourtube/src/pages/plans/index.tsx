import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    name: "Free",
    price: "$0 / month",
    limit: "1 download per day",
    features: ["Access to all videos", "Standard video player", "1 video download per day", "Ad-supported experience"],
    color: "border-gray-200 bg-gray-50 text-gray-900",
  },
  {
    name: "Bronze",
    price: "$2.99 / month",
    limit: "5 downloads per day",
    features: ["Access to all videos", "Ad-free playback", "5 video downloads per day", "Priority customer support"],
    color: "border-amber-600 bg-amber-50 text-amber-900",
  },
  {
    name: "Gold",
    price: "$9.99 / month",
    limit: "10 downloads per day",
    features: ["Access to all videos", "Ad-free playback", "10 video downloads per day", "Exclusive member badges", "Priority support"],
    color: "border-yellow-500 bg-yellow-50 text-yellow-900",
  },
  {
    name: "Unlimited",
    price: "$19.99 / month",
    limit: "Unlimited downloads",
    features: ["Access to all videos", "Ad-free playback", "Unlimited video downloads", "Exclusive member badges", "Ultra HD stream streaming", "24/7 dedicated support"],
    color: "border-purple-600 bg-purple-50 text-purple-900",
  },
];

export default function PlansPage() {
  const { user, updatePlanInState } = useUser();

  const handleUpgrade = async (planName: string) => {
    if (!user) {
      toast.error("Please sign in to select a plan.");
      return;
    }

    try {
      toast.loading("Upgrading plan...", { id: "upgrade-plan" });
      const res = await axiosInstance.patch(`/user/plan/${user._id}`, {
        plan: planName.toLowerCase(),
      });

      updatePlanInState(res.data.plan);
      toast.success(`Successfully upgraded to the ${planName} plan!`, { id: "upgrade-plan" });
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to upgrade plan.";
      toast.error(msg, { id: "upgrade-plan" });
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
            Get more video downloads, offline access, and exclusive premium features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.name.toLowerCase();
            return (
              <div
                key={plan.name}
                className={`flex flex-col justify-between border rounded-2xl p-6 shadow-sm bg-white transition duration-200 hover:shadow-lg ${
                  isCurrent ? `ring-2 ring-red-600` : ""
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                    {isCurrent && (
                      <span className="bg-red-100 text-red-800 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-extrabold text-gray-900">{plan.price}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 mb-6">{plan.limit}</p>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <Check className="w-5 h-5 text-green-500 mr-2 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.name)}
                  className={`w-full mt-auto py-2.5 rounded-xl text-sm font-bold ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  }`}
                >
                  {isCurrent ? "Active Plan" : `Upgrade to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
