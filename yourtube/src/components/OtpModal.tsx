import React, { useState } from "react";
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
import { ShieldCheck } from "lucide-react";

export default function OtpModal() {
  const { showOtp, otpEmail, verifyOtpCode, logout } = useUser();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  const handleClose = () => {
    // Closing the OTP modal cancels the login process
    logout();
  };

  return (
    <Dialog open={showOtp} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="bg-red-100 dark:bg-red-950/50 p-3 rounded-full mb-2">
            <ShieldCheck className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl">Security Verification</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            We detected a login attempt from a new device or location. 
            A verification code has been sent to <strong>{otpEmail}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2 flex flex-col items-center">
            <Label htmlFor="otpCode" className="text-center font-semibold">
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
              className="text-center text-2xl tracking-[0.5em] font-bold h-12 max-w-[200px]"
            />
            {errorMsg && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errorMsg}</p>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0 mt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || code.length !== 6} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              {loading ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
