import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { format } from "date-fns";
import { Crown, Receipt } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface PaymentRecord {
  _id: string;
  plan: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  razorpayPaymentId: string;
  createdAt: string;
  emailSent: boolean;
  emailLogged?: boolean;
}

export default function SubscriptionsPage() {
  const { user } = useUser();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) {
      setLoading(false);
      return;
    }

    axiosInstance
      .get(`/subscription/history/${user._id}`)
      .then((res) => {
        setCurrentPlan(res.data.currentPlan || "free");
        setPlanExpiresAt(res.data.planExpiresAt);
        setPayments(res.data.payments || []);
      })
      .catch(() => toast.error("Could not load subscription history"))
      .finally(() => setLoading(false));
  }, [user?._id]);

  if (!user) {
    return (
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <Crown className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view subscriptions</h1>
          <p className="text-gray-600">Manage your premium plan and billing history.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-600 mt-1">Your plan and payment history</p>
        </div>

        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current plan</p>
              <p className="text-2xl font-bold capitalize flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-500" />
                {currentPlan}
              </p>
              {planExpiresAt && currentPlan !== "free" && (
                <p className="text-sm text-gray-500 mt-1">
                  Renews / expires on {format(new Date(planExpiresAt), "PPP")}
                </p>
              )}
            </div>
            <Link href="/plans">
              <Button>{currentPlan === "free" ? "Upgrade" : "Change plan"}</Button>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Payment history
          </h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-500">
              No payments yet. Upgrade to a premium plan to see invoices here.
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment._id} className="bg-white rounded-xl border p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold capitalize">{payment.plan} plan</p>
                      <p className="text-sm text-gray-500">{payment.invoiceNumber}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(payment.createdAt), "PPP p")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {payment.currency} {(payment.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">{payment.razorpayPaymentId}</p>
                      {payment.emailSent && (
                        <p className="text-xs text-green-600 mt-1">Email sent</p>
                      )}
                      {!payment.emailSent && payment.emailLogged && (
                        <p className="text-xs text-amber-600 mt-1">Email logged</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
