"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Receipt,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  User as UserIcon,
  Briefcase,
  FileText,
  Download,
  Printer,
  Filter,
  Search,
  RefreshCw,
  X,
  ChevronRight,
  Layers,
  Sparkles,
  DollarSign,
  Send,
  Mail,
  Building,
  Tag,
} from "lucide-react";
import {
  FundSummary,
  FundInflow,
  FundRequest,
  ExpenseReceipt,
  User,
  ProjectRecord,
  fundsApi,
  projectsApi,
  usersApi,
} from "../services/api";

interface FundsModuleProps {
  user: User;
  funds: FundSummary;
  setFunds: React.Dispatch<React.SetStateAction<FundSummary>>;
}

export const FundsModule: React.FC<FundsModuleProps> = ({ user, funds, setFunds }) => {
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"overview" | "requests" | "receipts" | "inflows">("overview");

  // State data
  const [summaryData, setSummaryData] = useState<{
    fund: FundSummary;
    recentInflows: FundInflow[];
    recentExpenses: ExpenseReceipt[];
    pendingRequestsCount: number;
    totalRequestsCount: number;
  } | null>(null);

  const [inflowsList, setInflowsList] = useState<FundInflow[]>([]);
  const [requestsList, setRequestsList] = useState<FundRequest[]>([]);
  const [expensesList, setExpensesList] = useState<ExpenseReceipt[]>([]);
  const [projectsList, setProjectsList] = useState<ProjectRecord[]>([]);
  const [allUsersList, setAllUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Filters
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>("ALL");
  const [expenseSearchQuery, setExpenseSearchQuery] = useState("");
  const [expenseProjectFilter, setExpenseProjectFilter] = useState("ALL");

  // Modal states
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  interface ActiveReceiptData {
    type: "DEPOSIT" | "RELEASE" | "REQUEST";
    receiptRef: string;
    title: string;
    amount: number;
    status: string;
    usedBy: string;
    usedById?: string;
    workProject: string;
    category: string;
    date: string;
    notes?: string;
    proofUrl?: string;
    approvedBy?: string;
  }

  const [selectedReceiptForVoucher, setSelectedReceiptForVoucher] = useState<ActiveReceiptData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [invoiceRecipientEmail, setInvoiceRecipientEmail] = useState("");
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);

  const openExpenseReceipt = (exp: ExpenseReceipt) => {
    setSelectedReceiptForVoucher({
      type: "RELEASE",
      receiptRef: exp.receiptRef,
      title: exp.title,
      amount: exp.amount,
      status: "RELEASED",
      usedBy: exp.usedBy,
      usedById: exp.usedById,
      workProject: exp.workProject,
      category: exp.category || "Fund Release",
      date: exp.date,
      notes: exp.notes,
      proofUrl: exp.proofUrl,
      approvedBy: exp.approvedBy || "Admin",
    });
  };

  const openDepositReceipt = (inflow: FundInflow) => {
    setSelectedReceiptForVoucher({
      type: "DEPOSIT",
      receiptRef: inflow.receiptRef,
      title: inflow.source,
      amount: inflow.amount,
      status: "COMPLETED",
      usedBy: inflow.depositedBy,
      usedById: inflow.depositedById,
      workProject: "Treasury Deposit",
      category: "Capital Inflow",
      date: inflow.date,
      notes: inflow.notes,
      approvedBy: inflow.depositedBy,
    });
  };

  const openRequestReceipt = (req: FundRequest) => {
    setSelectedReceiptForVoucher({
      type: "REQUEST",
      receiptRef: req.receiptRef || req.id,
      title: req.title,
      amount: req.amount,
      status: req.status,
      usedBy: req.requestedBy,
      usedById: req.requestedById,
      workProject: req.workProject,
      category: req.urgency === "URGENT" ? "Urgent Request" : "Fund Request",
      date: req.disbursedDate || (req.createdAt ? req.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
      notes: req.reason,
      approvedBy: req.reviewedBy || (req.status === "PENDING" ? "Awaiting Review" : "Admin"),
    });
  };

  // Auto-fill recipient email & generate QR verification code when opening a receipt
  useEffect(() => {
    if (!selectedReceiptForVoucher) {
      setInvoiceRecipientEmail("");
      setQrDataUrl("");
      return;
    }
    const matched = allUsersList.find(
      (u) =>
        u.id === selectedReceiptForVoucher.usedById ||
        u._id === selectedReceiptForVoucher.usedById ||
        u.name === selectedReceiptForVoucher.usedBy
    );
    setInvoiceRecipientEmail(matched?.email || "");

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const verifyUrl = `${origin}/verify/${encodeURIComponent(selectedReceiptForVoucher.receiptRef)}`;
    QRCode.toDataURL(verifyUrl, { width: 140, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [selectedReceiptForVoucher, allUsersList]);

  const handleSendInvoiceEmail = async () => {
    if (!selectedReceiptForVoucher) return;
    const email = invoiceRecipientEmail.trim();
    if (!email || !email.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    setIsSendingInvoice(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      const verifyUrl = `${origin}/verify/${encodeURIComponent(selectedReceiptForVoucher.receiptRef)}`;
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          receiptRef: selectedReceiptForVoucher.receiptRef,
          type: selectedReceiptForVoucher.type,
          status: selectedReceiptForVoucher.status,
          date: selectedReceiptForVoucher.date,
          title: selectedReceiptForVoucher.title,
          amount: selectedReceiptForVoucher.amount,
          category: selectedReceiptForVoucher.category,
          usedBy: selectedReceiptForVoucher.usedBy,
          workProject: selectedReceiptForVoucher.workProject,
          notes: selectedReceiptForVoucher.notes,
          proofUrl: selectedReceiptForVoucher.proofUrl,
          approvedBy: selectedReceiptForVoucher.approvedBy,
          verifyUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send receipt email");
      }
      showToast(`Receipt sent to ${email}!`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to send receipt", "error");
    } finally {
      setIsSendingInvoice(false);
    }
  };

  // Form states: 1. Request Funds
  const [reqTitle, setReqTitle] = useState("");
  const [reqAmount, setReqAmount] = useState<number | "">("");
  const [reqReason, setReqReason] = useState("");
  const [reqWorkProject, setReqWorkProject] = useState("General Operations");
  const [reqUrgency, setReqUrgency] = useState<"NORMAL" | "URGENT">("NORMAL");
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  // Form states: 2. Deposit Capital
  const [depAmount, setDepAmount] = useState<number | "">("");
  const [depSource, setDepSource] = useState("Client Milestone Retainer");
  const [depNotes, setDepNotes] = useState("");
  const [depDate, setDepDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingDep, setIsSubmittingDep] = useState(false);

  // Form states: 3. Create Expense Receipt
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expUsedBy, setExpUsedBy] = useState(user.name);
  const [expUsedById, setExpUsedById] = useState(user.id);
  const [expWorkProject, setExpWorkProject] = useState("General Operations");
  const [expCategory, setExpCategory] = useState("Software & Cloud");
  const [expNotes, setExpNotes] = useState("");
  const [expProofUrl, setExpProofUrl] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setActionNotice({ type, text });
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Load all treasury data
  const loadTreasuryData = async () => {
    setIsLoading(true);
    try {
      const [sum, inList, reqList, expList, projList, uList] = await Promise.all([
        fundsApi.getSummary().catch(() => null),
        fundsApi.getInflows().catch(() => []),
        fundsApi.getRequests().catch(() => []),
        fundsApi.getExpenses().catch(() => []),
        projectsApi.getAll().catch(() => []),
        usersApi.getAll().catch(() => []),
      ]);

      if (sum) {
        setSummaryData(sum);
        setFunds(sum.fund);
      }
      setInflowsList(inList || []);
      setRequestsList(reqList || []);
      setExpensesList(expList || []);
      setProjectsList(projList || []);
      setAllUsersList(uList || []);
    } catch (err: any) {
      console.error("Failed loading treasury records:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTreasuryData();
  }, []);

  // Handlers: Submit Fund Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqAmount || Number(reqAmount) <= 0 || !reqTitle.trim() || !reqReason.trim()) {
      showToast("Please provide valid title, amount, and reason", "error");
      return;
    }

    setIsSubmittingReq(true);
    try {
      const created = await fundsApi.createRequest({
        title: reqTitle.trim(),
        amount: Number(reqAmount),
        reason: reqReason.trim(),
        workProject: reqWorkProject.trim() || "General Operations",
        requestedBy: user.name,
        requestedById: user.id,
        userEid: user.eidNumber || "WON-MB-0000",
        urgency: reqUrgency,
      });

      setRequestsList((prev) => [created, ...prev]);
      showToast(`Fund request for ₹${Number(reqAmount).toLocaleString("en-IN")} submitted for review!`, "success");
      setReqTitle("");
      setReqAmount("");
      setReqReason("");
      setIsRequestModalOpen(false);
      await loadTreasuryData();
    } catch (err: any) {
      showToast(err.message || "Failed to submit fund request", "error");
    } finally {
      setIsSubmittingReq(false);
    }
  };

  // Handlers: Deposit Capital into Treasury
  const handleDepositCapital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depAmount || Number(depAmount) <= 0 || !depSource.trim()) {
      showToast("Please enter a valid deposit amount and source", "error");
      return;
    }

    setIsSubmittingDep(true);
    try {
      const res = await fundsApi.deposit({
        amount: Number(depAmount),
        source: depSource.trim(),
        depositedBy: user.name,
        depositedById: user.id,
        notes: depNotes.trim(),
        date: depDate,
      });

      setFunds(res.fund);
      setInflowsList((prev) => [res.inflow, ...prev]);
      showToast(`Deposited ₹${Number(depAmount).toLocaleString("en-IN")} into Agency Treasury!`, "success");
      setDepAmount("");
      setDepNotes("");
      setIsDepositModalOpen(false);
      await loadTreasuryData();
    } catch (err: any) {
      showToast(err.message || "Failed to add funds", "error");
    } finally {
      setIsSubmittingDep(false);
    }
  };

  // Handlers: Record Expense Receipt Directly
  const handleCreateExpenseReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0 || !expTitle.trim()) {
      showToast("Please enter a valid expense title and amount", "error");
      return;
    }

    setIsSubmittingExp(true);
    try {
      const res = await fundsApi.createExpense({
        title: expTitle.trim(),
        amount: Number(expAmount),
        usedBy: expUsedBy.trim(),
        usedById: expUsedById,
        workProject: expWorkProject.trim() || "General Operations",
        category: expCategory,
        date: expDate,
        notes: expNotes.trim(),
        proofUrl: expProofUrl.trim(),
        approvedBy: user.name,
      });

      setFunds(res.fund);
      setExpensesList((prev) => [res.receipt, ...prev]);
      showToast(`Funds released! Receipt ${res.receipt.receiptRef} created.`, "success");
      setExpTitle("");
      setExpAmount("");
      setExpNotes("");
      setExpProofUrl("");
      setIsExpenseModalOpen(false);
      openExpenseReceipt(res.receipt);
      await loadTreasuryData();
    } catch (err: any) {
      showToast(err.message || "Failed to record expense", "error");
    } finally {
      setIsSubmittingExp(false);
    }
  };

  // Handlers: Review Fund Request (Approve / Reject)
  const handleReviewRequest = async (id: string, status: "APPROVED" | "REJECTED") => {
    try {
      const updated = await fundsApi.reviewRequest(id, {
        status,
        reviewedBy: user.name,
        reviewNotes: status === "APPROVED" ? "Approved by Administration" : "Declined by Administration",
      });

      setRequestsList((prev) => prev.map((r) => (r.id === id ? updated : r)));
      showToast(`Fund request marked as ${status}.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to review request", "error");
    }
  };

  // Handlers: Disburse Funds (Deducts from Treasury & Generates Expense Voucher)
  const handleDisburseRequest = async (id: string, title: string, amount: number) => {
    if (!confirm(`Are you sure you want to disburse ₹${amount.toLocaleString("en-IN")} for "${title}"? This will deduct the amount from Treasury and create an official expense receipt.`)) {
      return;
    }

    try {
      const res = await fundsApi.disburseRequest(id, {
        disbursedBy: user.name,
        notes: `Disbursed for: ${title}`,
      });

      setFunds(res.fund);
      setRequestsList((prev) => prev.map((r) => (r.id === id ? res.request : r)));
      setExpensesList((prev) => [res.receipt, ...prev]);
      showToast(`₹${amount.toLocaleString("en-IN")} disbursed! Voucher ${res.receipt.receiptRef} generated.`, "success");
      await loadTreasuryData();
    } catch (err: any) {
      showToast(err.message || "Failed to disburse funds", "error");
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requestsList.filter((r) => {
      if (requestFilterStatus === "ALL") return true;
      return r.status === requestFilterStatus;
    });
  }, [requestsList, requestFilterStatus]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expensesList.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        e.receiptRef.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        e.usedBy.toLowerCase().includes(expenseSearchQuery.toLowerCase()) ||
        e.workProject.toLowerCase().includes(expenseSearchQuery.toLowerCase());

      const matchesProject =
        expenseProjectFilter === "ALL" || e.workProject === expenseProjectFilter;

      return matchesSearch && matchesProject;
    });
  }, [expensesList, expenseSearchQuery, expenseProjectFilter]);

  return (
    <div className="space-y-7 pb-12">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in-0 duration-200 ${
            actionNotice.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : actionNotice.type === "error"
              ? "bg-rose-50 text-rose-800 border border-rose-200"
              : "bg-[#EBF4FC] text-[#087FC4] border border-[#CCE3F8]"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            {actionNotice.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600" />}
            {actionNotice.type === "info" && <ShieldCheck className="w-4 h-4 text-[#087FC4]" />}
            <span>{actionNotice.text}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-slate-700 font-bold ml-3 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF4FC] text-[#087FC4] border border-[#CCE3F8] mb-2">
            <Coins className="w-3.5 h-3.5" />
            <span>Agency Treasury & Capital Allocation</span>
          </div>
          <h2 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] tracking-tight">
            Treasury Fund Management
          </h2>
          <p className="text-xs sm:text-sm text-[#647895] mt-1 max-w-2xl">
            Real-time treasury balance, capital deposits, member fund requests with project attribution, and verified expense receipt vouchers.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#0071E3] to-[#087FC4] hover:from-[#0062C4] hover:to-[#076fae] text-white text-xs font-semibold flex items-center gap-2 shadow-[0_2px_8px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_12px_rgba(0,113,227,0.35)] transition-all active:scale-[0.98] cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Request Funds</span>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#101C34] border border-[#DCE8F5] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Add Capital</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#101C34] border border-[#DCE8F5] text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-[#087FC4]" />
                <span>Release Funds</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={loadTreasuryData}
            disabled={isLoading}
            className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Refresh Treasury Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Apple Frosted KPI Island */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/70 rounded-3xl p-1.5 shadow-[0_2px_12px_rgba(16,28,52,0.03)] grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Treasury Balance */}
        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#087FC4] shadow-[0_0_8px_rgba(8,127,196,0.6)]"></span>
            <span className="text-[11px] font-semibold text-slate-500 tracking-tight">Available Treasury Balance</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101C34] tabular-nums">
            ₹{(funds.totalBalance || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5">INR Liquid Funds</span>
        </div>

        {/* Total Inflows Added */}
        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            <span className="text-[11px] font-semibold text-emerald-700 tracking-tight">Total Inflow / Added</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-800 tabular-nums">
            ₹{(funds.totalInflow || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-emerald-600 mt-0.5">{inflowsList.length} Capital Deposits</span>
        </div>

        {/* Total Disbursed / Used */}
        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
            <span className="text-[11px] font-semibold text-rose-700 tracking-tight">Total Disbursed / Used</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-800 tabular-nums">
            ₹{(funds.totalDisbursed || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-rose-600 mt-0.5">{expensesList.length} Verified Vouchers</span>
        </div>

        {/* Pending Requisitions */}
        <div className="p-4 text-center flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
            <span className="text-[11px] font-semibold text-amber-700 tracking-tight">Pending Requests</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-800 tabular-nums">
            {requestsList.filter((r) => r.status === "PENDING").length}
          </p>
          <span className="text-[10px] text-amber-600 mt-0.5">Awaiting Review</span>
        </div>
      </div>

      {/* Segmented Navigation Dock */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-[#087FC4] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Treasury Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "requests"
              ? "bg-[#087FC4] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Fund Requests ({requestsList.length})</span>
          {requestsList.filter((r) => r.status === "PENDING").length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {requestsList.filter((r) => r.status === "PENDING").length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receipts")}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "receipts"
              ? "bg-[#087FC4] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Expense Receipts & Vouchers ({expensesList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("inflows")}
          className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "inflows"
              ? "bg-[#087FC4] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-[#101C34] border border-[#DCE8F5]"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Capital Inflow History ({inflowsList.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: TREASURY OVERVIEW
         ===================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Fund Inflows */}
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EDF4FB]">
                <div>
                  <h3 className="font-semibold text-sm text-[#101C34] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>Recent Capital Deposits</span>
                  </h3>
                  <p className="text-xs text-[#647895] mt-0.5">When funds were added to the treasury</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("inflows")}
                  className="text-xs font-semibold text-[#087FC4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {inflowsList.length > 0 ? (
                <div className="space-y-2.5">
                  {inflowsList.slice(0, 5).map((inflow, idx) => (
                    <div
                      key={inflow.id || (inflow as any)._id || inflow.receiptRef || idx}
                      onClick={() => openDepositReceipt(inflow)}
                      className="p-3.5 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex items-center justify-between gap-3 hover:border-[#087FC4]/40 cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#101C34]">{inflow.source}</span>
                          <span className="font-mono text-[10px] text-[#087FC4] bg-white px-2 py-0.5 rounded border border-[#E2EEFC]">
                            {inflow.receiptRef}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647895]">
                          Added by {inflow.depositedBy} • {inflow.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-emerald-700 block">
                          +₹{inflow.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-[#087FC4] font-semibold">View Receipt →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#647895]">
                  <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-[#101C34]">No capital deposits recorded yet.</p>
                  <p className="text-[11px] text-[#647895] mt-1">
                    Click "Add Capital" above to deposit initial funds into the treasury.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Expenses & Utilizations */}
            <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EDF4FB]">
                <div>
                  <h3 className="font-semibold text-sm text-[#101C34] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#087FC4]" />
                    <span>Recent Fund Utilizations</span>
                  </h3>
                  <p className="text-xs text-[#647895] mt-0.5">Where money was spent and used by whom</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("receipts")}
                  className="text-xs font-semibold text-[#087FC4] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expensesList.length > 0 ? (
                <div className="space-y-2.5">
                  {expensesList.slice(0, 5).map((exp) => (
                    <div
                      key={exp.id}
                      onClick={() => openExpenseReceipt(exp)}
                      className="p-3.5 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex items-center justify-between gap-3 hover:border-[#087FC4]/40 cursor-pointer transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-[#101C34]">{exp.title}</span>
                          <span className="text-[10px] bg-[#E8F3FD] text-[#087FC4] font-semibold px-2 py-0.5 rounded">
                            {exp.workProject}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#647895]">
                          Used by <strong className="text-[#101C34]">{exp.usedBy}</strong> • {exp.date}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-rose-700 block">
                          -₹{exp.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-[#087FC4] font-mono hover:underline">
                          {exp.receiptRef}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#647895]">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-[#101C34]">No expense receipts logged yet.</p>
                  <p className="text-[11px] text-[#647895] mt-1">
                    When fund requests are disbursed or expenses recorded, receipts appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: FUND REQUESTS & REQUISITIONS (MEMBER NEEDING MONEY)
         ===================================================================== */}
      {activeTab === "requests" && (
        <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDF4FB]">
            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Member Fund Requests</h3>
              <p className="text-xs text-[#647895] mt-0.5">
                Raise requests when team members need money for projects, equipment, hosting, or operational expenses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Raise New Request</span>
              </button>
            </div>
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {["ALL", "PENDING", "APPROVED", "DISBURSED", "REJECTED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setRequestFilterStatus(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  requestFilterStatus === st
                    ? "bg-[#087FC4] text-white shadow-xs"
                    : "bg-[#F4F8FC] border border-[#DCE8F5] text-slate-600 hover:text-[#101C34]"
                }`}
              >
                {st === "ALL" ? `All Requests (${requestsList.length})` : `${st} (${requestsList.filter((r) => r.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Requests List */}
          {filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-2xl bg-[#F8FBFE] border border-[#E5F2FF] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-sm text-[#101C34]">{req.title}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F3FD] text-[#087FC4]">
                        Project: {req.workProject}
                      </span>
                      {req.urgency === "URGENT" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          URGENT
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          req.status === "PENDING"
                            ? "bg-amber-100 text-amber-800"
                            : req.status === "APPROVED"
                            ? "bg-blue-100 text-blue-800"
                            : req.status === "DISBURSED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#51637B] leading-relaxed bg-white/70 p-3 rounded-xl border border-[#EDF4FB]">
                      <strong className="text-[#101C34]">Why Needed:</strong> {req.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#647895]">
                      <span>
                        Requested by: <strong className="text-[#101C34]">{req.requestedBy}</strong> ({req.userEid || "Member"})
                      </span>
                      {req.disbursedDate && (
                        <span>
                          Disbursed on: <strong className="text-[#101C34]">{req.disbursedDate}</strong> (Ref: {req.receiptRef})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Amount & Admin Controls */}
                  <div className="flex flex-col md:items-end gap-3 shrink-0">
                    <div className="md:text-right">
                      <span className="text-[10px] uppercase font-bold text-[#647895] block">Requested Amount</span>
                      <span className="text-xl font-bold text-[#101C34]">
                        ₹{req.amount.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openRequestReceipt(req)}
                        className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 text-[#087FC4] border border-[#DCE8F5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>View Receipt</span>
                      </button>

                      {isAdmin && (
                        <>
                          {req.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleReviewRequest(req.id, "APPROVED")}
                                className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewRequest(req.id, "REJECTED")}
                                className="px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {req.status === "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleDisburseRequest(req.id, req.title, req.amount)}
                              className="px-4 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Release Funds</span>
                            </button>
                          )}

                          {req.status === "DISBURSED" && (
                            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Released</span>
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#647895]">
              <Send className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-[#101C34] text-sm">No fund requests found here.</p>
              <p className="text-[11px] text-[#647895] mt-1">
                Any member can click "Raise New Request" to ask for fund allocations for their project.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: EXPENSE RECEIPTS & UTILIZATION VOUCHERS
         ===================================================================== */}
      {activeTab === "receipts" && (
        <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDF4FB]">
            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Expenditure & Receipt Vouchers</h3>
              <p className="text-xs text-[#647895] mt-0.5">
                Detailed audit ledger of where money was used, who used it, and for which work or project.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-4 py-2 rounded-full bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Record Expense Receipt</span>
              </button>
            )}
          </div>

          {/* Search & Project Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md flex items-center gap-2 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={expenseSearchQuery}
                onChange={(e) => setExpenseSearchQuery(e.target.value)}
                placeholder="Search by voucher ID, item, person, or project..."
                className="bg-transparent text-xs text-[#101C34] placeholder:text-slate-400 focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Filter Work:</span>
              <select
                value={expenseProjectFilter}
                onChange={(e) => setExpenseProjectFilter(e.target.value)}
                className="text-xs py-1.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] rounded-xl text-[#101C34] focus:outline-none"
              >
                <option value="ALL">All Projects / Work</option>
                {projectsList.map((p) => (
                  <option key={p.id} value={p.title}>
                    {p.title}
                  </option>
                ))}
                <option value="General Operations">General Operations</option>
              </select>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F8FBFE] border-b border-[#E2EEFC] text-[#51637B]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-xs">Voucher Ref</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Expense Item</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Used By Whom</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Which Work / Project</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Date</th>
                  <th className="py-3.5 px-3 font-semibold text-right text-xs">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-right text-xs">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6FC]">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#F9FCFF] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#087FC4]">
                        {exp.receiptRef}
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="font-semibold text-[#101C34]">{exp.title}</p>
                        <p className="text-[10px] text-[#647895]">{exp.category}</p>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#EBF4FC] text-[#087FC4] font-bold text-[10px] flex items-center justify-center">
                            {exp.usedBy.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-medium text-[#101C34]">{exp.usedBy}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#E8F3FD] text-[#087FC4]">
                          {exp.workProject}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#647895]">{exp.date}</td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#101C34]">
                        ₹{exp.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => openExpenseReceipt(exp)}
                          className="px-3 py-1 rounded-full bg-slate-100 hover:bg-[#087FC4] hover:text-white text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                        >
                          View Voucher
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#647895]">
                      <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#101C34]">No expense receipts found.</p>
                      <p className="text-[11px] text-[#647895] mt-1">
                        Disbursed fund requests and manual expense entries generate certified vouchers here.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: CAPITAL INFLOW HISTORY (WHEN FUNDS WERE ADDED)
         ===================================================================== */}
      {activeTab === "inflows" && (
        <div className="bg-white/95 rounded-3xl border border-[#E2EEFC] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EDF4FB]">
            <div>
              <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Treasury Inflow History</h3>
              <p className="text-xs text-[#647895] mt-0.5">
                History of all deposits, payments, and funds added to the account.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Add Capital / Deposit</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-[#F8FBFE] border-b border-[#E2EEFC] text-[#51637B]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold text-xs">Deposit Ref</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Capital Source</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Deposited By</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Date Added</th>
                  <th className="py-3.5 px-3 font-semibold text-xs">Notes / Details</th>
                  <th className="py-3.5 px-4 font-semibold text-right text-xs">Amount Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6FC]">
                {inflowsList.length > 0 ? (
                  inflowsList.map((inf) => (
                    <tr key={inf.id} className="hover:bg-[#F9FCFF] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-[#087FC4]">
                        {inf.receiptRef}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[#101C34]">{inf.source}</td>
                      <td className="py-3.5 px-3 text-[#51637B]">{inf.depositedBy}</td>
                      <td className="py-3.5 px-3 text-[#647895]">{inf.date}</td>
                      <td className="py-3.5 px-3 text-[#647895] max-w-xs truncate">{inf.notes || "—"}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                        +₹{inf.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-[#647895]">
                      <TrendingUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold text-[#101C34]">No capital inflows recorded yet.</p>
                      <p className="text-[11px] text-[#647895] mt-1">
                        Use the "Add Capital" button to deposit funds into the agency treasury.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: REQUEST FUNDS (LIVE REAL-TIME PREVIEW)
         ===================================================================== */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 my-auto max-h-[92vh]">
            <div className="px-6 py-4 border-b border-[#EDF4FB] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Request Funds</h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Fill in the details on the left and see your request receipt update live on the right.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
              <form onSubmit={handleCreateRequest} className="md:col-span-6 p-6 space-y-4 border-b md:border-b-0 md:border-r border-[#EDF4FB]">
              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Request Title *
                </label>
                <input
                  type="text"
                  required
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  placeholder="e.g. Server Renewal / Video Equipment Rental"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Amount Needed (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 15000"
                    className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Urgency
                  </label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as any)}
                    className="w-full text-xs py-2.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="URGENT">Urgent / Time-Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Which Work / Project *
                </label>
                <select
                  value={reqWorkProject}
                  onChange={(e) => setReqWorkProject(e.target.value)}
                  className="w-full text-xs py-2.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                >
                  <option value="General Operations">General Operations & Agency Infra</option>
                  {projectsList.map((p) => (
                    <option key={p.id} value={p.title}>
                      Project: {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Why is this money needed? (Detailed Justification) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="Explain exactly why you need these funds, quote details, deliverables, or vendor requirements..."
                  className="w-full text-xs py-2 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div className="pt-4 border-t border-[#EDF4FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="px-5 py-2 rounded-xl bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReq ? "Submitting..." : "Submit Fund Request"}</span>
                </button>
              </div>
            </form>

              {/* Right: Live Real-Time Request Receipt Preview */}
              <div className="md:col-span-6 p-6 bg-[#F4F8FD] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087FC4]">
                      Live Receipt Preview
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-[#DCE8F5]">
                      Auto-updates as you type
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-[#101C34]">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <img src="/won-logo.png" alt="WON" className="h-7 w-auto object-contain mb-1.5" />
                        <p className="text-[11px] text-slate-500">WON Agency • Operations &amp; Finance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold tracking-tight text-slate-900">FUND REQUEST RECEIPT</p>
                        <p className="font-mono text-[11px] font-bold text-[#087FC4] mt-0.5">ITR: Auto-generated (15 digits)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Date: {new Date().toISOString().split("T")[0]}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Requested By</span>
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Project &amp; Priority</span>
                        <p className="font-bold text-[#087FC4] truncate">{reqWorkProject || "General Operations"}</p>
                        <p className="text-[10px] text-slate-500">{reqUrgency === "URGENT" ? "Urgent Request" : "Normal Priority"}</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px]">
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-900">
                                {reqTitle.trim() || "Request Title"}
                              </p>
                              {reqReason.trim() && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{reqReason.trim()}</p>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-700 align-top">1</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums align-top">
                              ₹{Number(reqAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>PENDING • QR generated on submit</span>
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Total</span>
                        <span className="text-base font-extrabold text-[#087FC4] tabular-nums">
                          ₹{Number(reqAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      © 2026 WON • Official Receipt
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: DEPOSIT CAPITAL (LIVE REAL-TIME PREVIEW)
         ===================================================================== */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 my-auto max-h-[92vh]">
            <div className="px-6 py-4 border-b border-[#EDF4FB] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Add Funds to Treasury</h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Fill in the deposit details on the left and preview the official receipt live on the right.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
              <form onSubmit={handleDepositCapital} className="md:col-span-6 p-6 space-y-4 border-b md:border-b-0 md:border-r border-[#EDF4FB]">
              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Deposit Amount (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 100000"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Capital Source / Payment Type *
                </label>
                <input
                  type="text"
                  required
                  value={depSource}
                  onChange={(e) => setDepSource(e.target.value)}
                  placeholder="e.g. Client Milestone Payment / Founder Seed / Project Grant"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Date of Deposit
                </label>
                <input
                  type="date"
                  value={depDate}
                  onChange={(e) => setDepDate(e.target.value)}
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Notes / Reference
                </label>
                <textarea
                  rows={2}
                  value={depNotes}
                  onChange={(e) => setDepNotes(e.target.value)}
                  placeholder="Bank transfer reference, client invoice number, or deposit context..."
                  className="w-full text-xs py-2 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div className="pt-4 border-t border-[#EDF4FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDep}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{isSubmittingDep ? "Adding..." : "Confirm & Deposit Capital"}</span>
                </button>
              </div>
            </form>

              {/* Right: Live Real-Time Deposit Receipt Preview */}
              <div className="md:col-span-6 p-6 bg-[#F4F8FD] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087FC4]">
                      Live Receipt Preview
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-[#DCE8F5]">
                      Auto-updates as you type
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-[#101C34]">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <img src="/won-logo.png" alt="WON" className="h-7 w-auto object-contain mb-1.5" />
                        <p className="text-[11px] text-slate-500">WON Agency • Operations &amp; Finance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold tracking-tight text-slate-900">DEPOSIT RECEIPT</p>
                        <p className="font-mono text-[11px] font-bold text-[#087FC4] mt-0.5">ITR: Auto-generated (15 digits)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Date: {depDate || "-"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Deposited By</span>
                        <p className="font-bold text-slate-900 truncate">{user.name}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Category</span>
                        <p className="font-bold text-[#087FC4] truncate">Treasury Deposit</p>
                        <p className="text-[10px] text-slate-500">Capital Inflow</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px]">
                            <th className="py-2 px-3">Source / Description</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-900">
                                {depSource.trim() || "Capital Source / Payment Type"}
                              </p>
                              {depNotes.trim() && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{depNotes.trim()}</p>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-700 align-top">1</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-700 tabular-nums align-top">
                              +₹{Number(depAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>QR Code generated on save</span>
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Total Deposit</span>
                        <span className="text-base font-extrabold text-emerald-700 tabular-nums">
                          +₹{Number(depAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      © 2026 WON • Official Receipt
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: RECORD EXPENSE RECEIPT (WHERE MONEY WAS USED)
         ===================================================================== */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 my-auto max-h-[92vh]">
            <div className="px-6 py-4 border-b border-[#EDF4FB] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Release Funds</h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Fill in the details on the left and preview your official receipt in real time on the right.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
              {/* Left: Form */}
              <form onSubmit={handleCreateExpenseReceipt} className="md:col-span-6 p-6 space-y-4 border-b md:border-b-0 md:border-r border-[#EDF4FB]">
              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Expense Title / Item *
                </label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. AWS Cloud Hosting Q4 / Camera Lens Kit Rental"
                  className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Amount Spent (₹ INR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 8500"
                    className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  >
                    <option value="Software & Cloud">Software & Cloud Hosting</option>
                    <option value="Hardware & Equipment">Hardware & Equipment</option>
                    <option value="Client Production">Client Production & Media</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Travel & Logistics">Travel & Logistics</option>
                    <option value="General Operations">General Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Used By Whom *
                  </label>
                  <select
                    value={expUsedById}
                    onChange={(e) => {
                      setExpUsedById(e.target.value);
                      const found = allUsersList.find((u) => u.id === e.target.value);
                      if (found) setExpUsedBy(found.name);
                    }}
                    className="w-full text-xs py-2.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  >
                    {allUsersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Which Work / Project *
                  </label>
                  <select
                    value={expWorkProject}
                    onChange={(e) => setExpWorkProject(e.target.value)}
                    className="w-full text-xs py-2.5 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  >
                    <option value="General Operations">General Operations</option>
                    {projectsList.map((p) => (
                      <option key={p.id} value={p.title}>
                        Project: {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Date of Expenditure
                  </label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#101C34] block mb-1">
                    Receipt Bill Link / Invoice # (Optional)
                  </label>
                  <input
                    type="text"
                    value={expProofUrl}
                    onChange={(e) => setExpProofUrl(e.target.value)}
                    placeholder="e.g. INV-9042 or Google Drive Bill URL"
                    className="w-full text-xs py-2.5 px-3.5 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] block mb-1">
                  Notes / Breakdown
                </label>
                <textarea
                  rows={2}
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="Details of expense, vendor name, or task details..."
                  className="w-full text-xs py-2 px-3 bg-[#F4F8FC] border border-[#DCE8F5] focus:bg-white focus:border-[#087FC4] rounded-xl text-[#101C34]"
                />
              </div>

              <div className="pt-4 border-t border-[#EDF4FB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExp}
                  className="px-5 py-2 rounded-xl bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{isSubmittingExp ? "Releasing..." : "Release Funds & Create Receipt"}</span>
                </button>
              </div>
            </form>

              {/* Right: Live Real-Time Receipt Preview */}
              <div className="md:col-span-6 p-6 bg-[#F4F8FD] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#087FC4]">
                      Live Receipt Preview
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-[#DCE8F5]">
                      Auto-updates as you type
                    </span>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 text-[#101C34]">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <img src="/won-logo.png" alt="WON" className="h-7 w-auto object-contain mb-1.5" />
                        <p className="text-[11px] text-slate-500">WON Agency • Operations &amp; Finance</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-extrabold tracking-tight text-slate-900">INVOICE / RELEASE RECEIPT</p>
                        <p className="font-mono text-[11px] font-bold text-[#087FC4] mt-0.5">ITR: Auto-generated (15 digits)</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Date: {expDate || "-"}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Issued To</span>
                        <p className="font-bold text-slate-900 truncate">{expUsedBy || "Select member"}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Project &amp; Category</span>
                        <p className="font-bold text-[#087FC4] truncate">{expWorkProject || "General Operations"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{expCategory}</p>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[9px]">
                            <th className="py-2 px-3">Description</th>
                            <th className="py-2 px-2 text-center">Qty</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-3 px-3">
                              <p className="font-semibold text-slate-900">
                                {expTitle.trim() || "Expense Title / Item"}
                              </p>
                              {expNotes.trim() && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{expNotes.trim()}</p>
                              )}
                              {expProofUrl.trim() && (
                                <p className="text-[10px] font-mono text-[#087FC4] mt-0.5">Ref: {expProofUrl.trim()}</p>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-700 align-top">1</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums align-top">
                              ₹{Number(expAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>QR Code generated on save</span>
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Total</span>
                        <span className="text-base font-extrabold text-[#087FC4] tabular-nums">
                          ₹{Number(expAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-center text-[10px] text-slate-400">
                      © 2026 WON • Official Receipt
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: REAL INVOICE VIEW (PRINTABLE PDF & RESEND EMAIL)
         ===================================================================== */}
      {selectedReceiptForVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 0mm;
              }
              body * {
                visibility: hidden;
              }
              #won-invoice-doc,
              #won-invoice-doc * {
                visibility: visible;
              }
              #won-invoice-doc {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                padding: 18mm 20mm !important;
                box-shadow: none !important;
                border: none !important;
                background: white !important;
              }
              .no-print-invoice {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl border border-[#E2EEFC] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 my-auto">
            {/* Top Modal Bar (Hidden on Print) */}
            <div className="no-print-invoice px-6 py-4 bg-[#F8FBFE] border-b border-[#E2EEFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#087FC4]" />
                <span className="text-xs font-bold text-[#101C34]">
                  Invoice {selectedReceiptForVoucher.receiptRef}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceiptForVoucher(null)}
                className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-[#DCE8F5] text-slate-500 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Real Printable Invoice Document */}
            <div id="won-invoice-doc" className="p-6 sm:p-8 bg-white space-y-6 text-[#101C34]">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
                <div>
                  <img
                    src="/won-logo.png"
                    alt="WON"
                    className="h-9 w-auto object-contain mb-2"
                  />
                  <p className="text-xs text-slate-500">WON Agency • Operations &amp; Finance</p>
                </div>
                <div className="text-right">
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {selectedReceiptForVoucher.type === "DEPOSIT"
                      ? "DEPOSIT RECEIPT"
                      : selectedReceiptForVoucher.type === "REQUEST"
                      ? "FUND REQUEST RECEIPT"
                      : "INVOICE / RELEASE RECEIPT"}
                  </h3>
                  <p className="font-mono text-xs font-bold text-[#087FC4] mt-0.5">
                    {selectedReceiptForVoucher.receiptRef}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Issue Date: <strong className="text-slate-800">{selectedReceiptForVoucher.date}</strong>
                  </p>
                </div>
              </div>

              {/* Issued To & Project Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    {selectedReceiptForVoucher.type === "DEPOSIT"
                      ? "Deposited By"
                      : selectedReceiptForVoucher.type === "REQUEST"
                      ? "Requested By"
                      : "Issued To"}
                  </span>
                  <p className="font-bold text-sm text-slate-900">
                    {selectedReceiptForVoucher.usedBy}
                  </p>
                  {invoiceRecipientEmail && (
                    <p className="text-xs text-slate-500 mt-0.5">{invoiceRecipientEmail}</p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
                    Project &amp; Category
                  </span>
                  <p className="font-bold text-sm text-[#087FC4]">
                    {selectedReceiptForVoucher.workProject}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedReceiptForVoucher.category}
                  </p>
                </div>
              </div>

              {/* Itemized Invoice Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-3 text-center">Qty</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-sm text-slate-900">
                          {selectedReceiptForVoucher.title}
                        </p>
                        {selectedReceiptForVoucher.notes && (
                          <p className="text-xs text-slate-500 mt-1">
                            {selectedReceiptForVoucher.notes}
                          </p>
                        )}
                        {selectedReceiptForVoucher.proofUrl && (
                          <p className="text-[11px] text-[#087FC4] font-mono mt-1">
                            Bill / Ref: {selectedReceiptForVoucher.proofUrl}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-3 text-center text-slate-700 font-medium align-top">1</td>
                      <td className="py-4 px-4 text-right font-bold text-sm text-slate-900 tabular-nums align-top">
                        ₹{selectedReceiptForVoucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals, QR Code & Approval */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
                <div className="flex items-center gap-3.5">
                  {qrDataUrl && (
                    <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 text-center">
                      <img src={qrDataUrl} alt="Scan to verify" className="w-20 h-20 object-contain" />
                      <span className="text-[9px] font-semibold text-slate-500 block mt-0.5">Scan to Verify</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {selectedReceiptForVoucher.status} • {selectedReceiptForVoucher.approvedBy || "Admin"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Scan QR code to verify official status &amp; details online.
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-56 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      ₹{selectedReceiptForVoucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-900">Total</span>
                    <span className="text-lg font-extrabold text-[#087FC4] tabular-nums">
                      ₹{selectedReceiptForVoucher.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Footer */}
              <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
                © 2026 WON • Official Receipt
              </div>
            </div>

            {/* Bottom Actions Bar: Send to Email + Print / PDF (Hidden on Print) */}
            <div className="no-print-invoice px-6 py-4 bg-[#F8FBFE] border-t border-[#E2EEFC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={invoiceRecipientEmail}
                    onChange={(e) => setInvoiceRecipientEmail(e.target.value)}
                    placeholder="Recipient email address..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-[#DCE8F5] focus:border-[#087FC4] rounded-xl text-[#101C34] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendInvoiceEmail}
                  disabled={isSendingInvoice || !invoiceRecipientEmail.includes("@")}
                  className="px-4 py-2 rounded-xl bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingInvoice ? "Sending..." : "Send Email"}</span>
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#DCE8F5] text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptForVoucher(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
