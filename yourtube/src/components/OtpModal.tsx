import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import { ShieldCheck, RefreshCw } from "lucide-react";

export default function OtpModal() {
  const { showOtp, otpEmail, devOtp, verifyOtpCode, resendOtpCode, logout } = useUser();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-fill code whenever devOtp changes or modal opens
  useEffect(() => {
    if (showOtp && devOtp) {
      setCode(devOtp);
    }
  }, [showOtp, devOtp]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorMsg("Please enter a 6-digit code.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    const res = await verifyOtpCode(code);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.message || "Invalid or expired OTP code.");
    } else {
      setCode("");
    }
  };

  const handleResend = async () => {
    setResending(true);
    setErrorMsg("");
    await resendOtpCode();
    setResending(false);
  };

  const handleClose = () => {
    logout();
  };

  return (
    <Dialog open={showOtp} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="bg-red-100 dark:bg-red-950/50 p-3 rounded-full mb-2">
            <ShieldCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl font-bold">Security Verification</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            New device or location detected for{" "}
            <strong className="text-foreground">{otpEmail}</strong>.{" "}
            {devOtp
              ? "Your code is shown below — it has been auto-filled."
              : "Check your email for the verification code."}
          </DialogDescription>
        </DialogHeader>

        {/* Code display box — always shown when code is available */}
        {devOtp && (
          <div className="p-4 bg-muted border border-border rounded-xl text-center space-y-1">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              Your Verification Code
            </p>
            <p className="font-mono text-3xl font-bold tracking-[0.5em] text-foreground select-all">
              {devOtp}
            </p>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4 mt-1">
          <div className="space-y-2 flex flex-col items-center">
            <Label htmlFor="otpCode" className="text-center font-semibold text-sm">
              Enter 6-Digit Code
            </Label>
            <Input
              id="otpCode"
              type="text"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setCode(val);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono font-bold h-12 max-w-[220px]"
            />
            {errorMsg && (
              <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1">{errorMsg}</p>
            )}
          </div>

          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={resending}
              onClick={handleResend}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Generating new code..." : "Didn't receive code? Resend"}
            </Button>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
