"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, XCircle, ShieldCheck, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../../../services/api";

interface VerifiedReceiptData {
  verified: boolean;
  type?: "DEPOSIT" | "RELEASE" | "REQUEST";
  receiptRef?: string;
  title?: string;
  amount?: number;
  status?: string;
  person?: string;
  project?: string;
  category?: string;
  date?: string;
  approvedBy?: string;
  notes?: string;
  proofUrl?: string;
}

export default function VerifyReceiptPage() {
  const params = useParams();
  const ref = typeof params?.ref === "string" ? decodeURIComponent(params.ref) : "";
  const [data, setData] = useState<VerifiedReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/funds/verify/${encodeURIComponent(ref)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData({ verified: false, receiptRef: ref }))
      .finally(() => setLoading(false));
  }, [ref]);

  const typeLabel =
    data?.type === "DEPOSIT"
      ? "Capital Deposit Receipt"
      : data?.type === "REQUEST"
      ? "Fund Request Receipt"
      : "Fund Release / Expense Receipt";

  const statusBadgeClass =
    data?.status === "COMPLETED" || data?.status === "RELEASED" || data?.status === "DISBURSED" || data?.status === "APPROVED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : data?.status === "REJECTED"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="min-h-screen bg-[#F4F8FD] bg-gradient-to-br from-[#F5FAFF] via-[#EAF4FF]/50 to-[#F8FBFF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-[#E2EEFC] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <img src="/won-logo.png" alt="WON" className="h-8 w-auto object-contain" />
          <span className="text-[11px] font-semibold text-slate-500">Official Verification</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[#087FC4] mx-auto" />
            <p className="text-xs text-slate-500">Checking official records...</p>
          </div>
        ) : data?.verified ? (
          <div className="p-6 space-y-5">
            {/* Verified Banner */}
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-900">Official Verified Receipt</p>
                <p className="text-[11px] text-emerald-700">This record is authentic and registered with WON Agency.</p>
              </div>
            </div>

            {/* Transaction ID & Status */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transaction ID</p>
                <p className="font-mono text-sm font-bold text-[#087FC4] mt-0.5">{data.receiptRef}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass}`}>
                {data.status}
              </span>
            </div>

            {/* Amount */}
            <div className="p-4 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{typeLabel}</p>
                <p className="text-sm font-bold text-[#101C34] mt-0.5">{data.title}</p>
              </div>
              <p className="text-xl font-extrabold text-[#101C34] tabular-nums">
                ₹{Number(data.amount || 0).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">
                  {data.type === "DEPOSIT" ? "Deposited By" : data.type === "REQUEST" ? "Requested By" : "Issued To"}
                </span>
                <span className="font-semibold text-slate-900">{data.person}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Project / Category</span>
                <span className="font-semibold text-slate-900">{data.project || data.category}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-900">{data.date}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Approved / Recorded By</span>
                <span className="font-semibold text-slate-900">{data.approvedBy}</span>
              </div>
            </div>

            {data.notes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
                <span className="font-semibold text-slate-800 block mb-0.5">Notes:</span>
                {data.notes}
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>© 2026 WON • Official Verification</span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Receipt Not Found</h3>
            <p className="text-xs text-slate-500">
              No official record matched Transaction ID <span className="font-mono font-semibold">{ref || "—"}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
