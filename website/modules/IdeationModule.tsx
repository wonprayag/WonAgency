"use client";

import React, { useState, useEffect } from "react";
import {
  Lightbulb,
  AlertCircle,
  ThumbsUp,
  Send,
  CheckCircle2,
  Plus,
  Trash2,
  Tag,
  Settings2,
  X,
  Loader2,
  Filter,
  Check,
  ChevronRight
} from "lucide-react";
import {
  IdeationRecord,
  ProposalCategory,
  User,
  ideationsApi
} from "../services/api";

interface IdeationModuleProps {
  user: User;
  ideations: IdeationRecord[];
  setIdeations: React.Dispatch<React.SetStateAction<IdeationRecord[]>>;
}

export const IdeationModule: React.FC<IdeationModuleProps> = ({
  user,
  ideations,
  setIdeations
}) => {
  // Form input state
  const [problemStatement, setProblemStatement] = useState("");
  const [proposedSolution, setProposedSolution] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dynamic Category Management State
  const [categories, setCategories] = useState<ProposalCategory[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Load categories and sync proposals on mount
  useEffect(() => {
    ideationsApi
      .getCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0 && !selectedCategory) {
          setSelectedCategory(cats[0].name);
        }
      })
      .catch((err) => console.error("Failed to load categories:", err));

    ideationsApi
      .getAll()
      .then((data) => {
        if (data && data.length > 0) setIdeations(data);
      })
      .catch((err) => console.error("Failed to load ideations:", err));
  }, []);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // ==========================================
  // CATEGORY ACTIONS
  // ==========================================
  const handleCreateCategory = async (nameToCreate?: string) => {
    const targetName = (nameToCreate || newCategoryInput).trim();
    if (!targetName) {
      notify("Please enter a category name", "error");
      return;
    }

    setIsAddingCategory(true);
    try {
      const created = await ideationsApi.createCategory(targetName);
      setCategories((prev) => {
        if (prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())) return prev;
        return [...prev, created];
      });
      setSelectedCategory(created.name);
      setNewCategoryInput("");
      setShowInlineAddCategory(false);
      notify(`Category "${created.name}" created successfully!`);
    } catch (err: any) {
      notify(err.message || "Failed to create category", "error");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${name}"? Existing suggestions with this category will retain their label.`
      )
    ) {
      return;
    }

    try {
      await ideationsApi.deleteCategory(catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId && c._id !== catId));
      if (selectedCategory === name) {
        const remaining = categories.filter((c) => c.id !== catId && c._id !== catId);
        if (remaining.length > 0) setSelectedCategory(remaining[0].name);
      }
      notify(`Category "${name}" deleted.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete category", "error");
    }
  };

  // ==========================================
  // PROPOSAL / IDEATION ACTIONS
  // ==========================================
  const handleRaiseProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemStatement.trim() || !proposedSolution.trim()) {
      notify("Please provide both a problem statement and proposed solution", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await ideationsApi.create({
        problemStatement: problemStatement.trim(),
        proposedSolution: proposedSolution.trim(),
        raisedBy: user.name,
        category: selectedCategory || (categories[0]?.name ?? "General")
      });

      setIdeations([created, ...ideations]);
      setProblemStatement("");
      setProposedSolution("");
      notify("Your idea & suggestion have been published to the agency board!");
    } catch (err: any) {
      notify(err.message || "Failed to submit proposal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpvote = async (id: string) => {
    try {
      const updated = await ideationsApi.upvote(id);
      setIdeations((prev) => prev.map((item) => (item.id === id || item._id === id ? updated : item)));
    } catch (err: any) {
      notify(err.message || "Failed to register upvote", "error");
    }
  };

  const handleDeleteIdea = async (id: string) => {
    if (!window.confirm("Remove this idea from the suggestions board?")) return;
    try {
      await ideationsApi.delete(id);
      setIdeations((prev) => prev.filter((i) => i.id !== id && i._id !== id));
      notify("Suggestion removed.");
    } catch (err: any) {
      notify(err.message || "Failed to remove suggestion", "error");
    }
  };

  // Filter ideations by selected category
  const filteredIdeations = ideations.filter((idea) => {
    if (selectedCategoryFilter === "ALL") return true;
    return idea.category?.toLowerCase() === selectedCategoryFilter.toLowerCase();
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Header (WON Winter Aesthetic) */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 sm:p-6 border border-[#E2EEFC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center shrink-0 shadow-2xs border border-[#CDE5FC]">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-serif-fraunces font-normal text-[#101C34] tracking-tight">
                Ideation / Suggestions
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F2FF] text-[#087FC4] text-[10px] font-bold uppercase tracking-wider border border-[#CDE5FC]">
                WON Incubator
              </span>
            </div>
            <p className="text-xs text-[#647895] mt-0.5 font-sans">
              Raise operational friction points, propose engineering initiatives, and upvote community proposals.
            </p>
          </div>
        </div>

        {/* Category Manager Modal Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="px-3.5 py-2 rounded-xl border border-[#CDE5FC] bg-[#F8FBFF] hover:bg-[#E5F2FF] text-[#087FC4] font-semibold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Manage Categories ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* Notice Toast */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn border ${
            notice.type === "success"
              ? "bg-[#E5F2FF] text-[#0868AE] border-[#bae6fd]"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#087FC4] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm ml-3 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Form on Left, Active Suggestions Feed on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ========================================================= */}
        {/* COLUMN 1: RAISE A PROBLEM / IDEA FORM                     */}
        {/* ========================================================= */}
        <div className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-4 h-fit">
          <div className="flex items-center space-x-2 text-[#101C34] pb-2 border-b border-[#E2EEFC]">
            <AlertCircle className="w-4 h-4 text-[#087FC4]" />
            <h3 className="text-sm font-bold font-serif-fraunces">Raise a Problem / Idea</h3>
          </div>
          <p className="text-xs text-[#647895] leading-relaxed">
            Identify agency friction points or propose high-impact technical initiatives.
          </p>

          <form onSubmit={handleRaiseProblem} className="space-y-4">
            
            {/* Category Field with Inline Creation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#101C34]">Category *</label>
                <button
                  type="button"
                  onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                  className="text-[11px] font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showInlineAddCategory ? "Close" : "Create Category"}</span>
                </button>
              </div>

              {/* Inline Category Creation Input */}
              {showInlineAddCategory && (
                <div className="mb-2 p-2.5 bg-[#F0F6FD] rounded-xl border border-[#CDE5FC] flex items-center gap-2 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="New category name..."
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    className="flex-1 text-xs p-1.5 bg-white border border-[#CDE5FC] rounded-lg text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  />
                  <button
                    type="button"
                    disabled={isAddingCategory || !newCategoryInput.trim()}
                    onClick={() => handleCreateCategory()}
                    className="px-2.5 py-1.5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    {isAddingCategory ? "..." : "Add"}
                  </button>
                </div>
              )}

              {/* Category Dropdown */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] font-medium focus:outline-none focus:border-[#087FC4]"
              >
                {categories.map((c) => (
                  <option key={c.id || c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Problem Statement */}
            <div>
              <label className="text-xs font-semibold text-[#101C34] block mb-1">
                Problem Statement *
              </label>
              <textarea
                rows={3}
                placeholder="What is the bottleneck or agency friction point?"
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
              />
            </div>

            {/* Proposed Solution */}
            <div>
              <label className="text-xs font-semibold text-[#101C34] block mb-1">
                Proposed Solution *
              </label>
              <textarea
                rows={3}
                placeholder="How do you recommend solving it? Outline the proposed initiative..."
                value={proposedSolution}
                onChange={(e) => setProposedSolution(e.target.value)}
                required
                className="w-full text-xs p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit to Ideation Board</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: ACTIVE SUGGESTIONS FEED & FILTERS               */}
        {/* ========================================================= */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Header & Dynamic Category Filter Chips */}
          <div className="bg-white/95 backdrop-blur-xs p-4 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-[#101C34] font-serif-fraunces">
                  Active Suggestions ({filteredIdeations.length})
                </h3>
                <span className="text-[11px] text-[#647895]">Ordered by Community Engagement</span>
              </div>

              {/* Quick count badge */}
              <span className="text-[10px] font-bold text-[#087FC4] bg-[#E5F2FF] px-2.5 py-0.5 rounded-full border border-[#CDE5FC]">
                {ideations.length} Total
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[#F0F6FD]">
              <span className="text-[10px] font-semibold text-slate-400 mr-1 flex items-center space-x-1">
                <Filter className="w-3 h-3" />
                <span>Filter:</span>
              </span>
              <button
                onClick={() => setSelectedCategoryFilter("ALL")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === "ALL"
                    ? "bg-[#087FC4] text-white shadow-2xs"
                    : "bg-[#F8FBFF] hover:bg-[#E5F2FF] text-slate-600 border border-[#E2EEFC]"
                }`}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id || c._id}
                  onClick={() => setSelectedCategoryFilter(c.name)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    selectedCategoryFilter.toLowerCase() === c.name.toLowerCase()
                      ? "bg-[#087FC4] text-white shadow-2xs"
                      : "bg-[#F8FBFF] hover:bg-[#E5F2FF] text-slate-600 border border-[#E2EEFC]"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions List */}
          {filteredIdeations.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-10 text-center border border-[#E2EEFC] shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center mx-auto border border-[#CDE5FC]">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h4 className="font-serif-fraunces text-base text-[#101C34]">No suggestions in this category</h4>
              <p className="text-xs text-[#647895] max-w-sm mx-auto">
                Be the first to raise a bottleneck or technical proposal using the form on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIdeations.map((idea) => (
                <div
                  key={idea.id || idea._id}
                  className="bg-white/95 backdrop-blur-xs p-5 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-3 hover:shadow-xs transition-all"
                >
                  {/* Category & Status Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#E5F2FF] text-[#087FC4] rounded-full border border-[#CDE5FC]">
                        {idea.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          idea.status === "IMPLEMENTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : idea.status === "APPROVED"
                            ? "bg-sky-50 text-[#087FC4] border-sky-200"
                            : idea.status === "UNDER_REVIEW"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {idea.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#647895]">
                      <span>{idea.createdAt || idea.createdAtDate}</span>
                      {(user.role === "SUPER_ADMIN" || user.role === "ADMIN" || user.name === idea.raisedBy) && (
                        <button
                          onClick={() => handleDeleteIdea(idea.id || idea._id || "")}
                          title="Remove suggestion"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Problem & Solution Cards */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#101C34] leading-snug">
                      <span className="text-rose-600 font-semibold mr-1">[Problem]</span>
                      {idea.problemStatement}
                    </h4>
                    <div className="text-xs text-[#4A5D78] p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] leading-relaxed">
                      <span className="text-[#087FC4] font-bold block text-[11px] mb-1">
                        Proposed Solution:
                      </span>
                      {idea.proposedSolution}
                    </div>
                  </div>

                  {/* Footer & Upvote */}
                  <div className="pt-2 border-t border-[#F0F6FD] flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      Raised by <strong className="text-[#101C34]">{idea.raisedBy}</strong>
                    </span>
                    <button
                      onClick={() => handleUpvote(idea.id || idea._id || "")}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F8FBFF] hover:bg-[#E5F2FF] text-[#087FC4] font-semibold rounded-xl border border-[#CDE5FC] transition-colors cursor-pointer shadow-2xs"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{idea.upvotes || 0} Upvotes</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: PROPOSAL CATEGORY MANAGER                          */}
      {/* ========================================================= */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E2EEFC] shadow-xl space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-fraunces text-lg text-[#101C34]">Proposal Categories</h3>
                  <p className="text-[11px] text-[#647895]">Manage custom categories for agency suggestions</p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Create Category Form */}
            <div className="space-y-2">
              <label className="font-bold text-[#101C34] block">Add New Category</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. AI Operations, Infrastructure..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="flex-1 p-2 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] text-xs focus:outline-none focus:border-[#087FC4]"
                />
                <button
                  type="button"
                  disabled={isAddingCategory || !newCategoryInput.trim()}
                  onClick={() => handleCreateCategory()}
                  className="px-3.5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold cursor-pointer shadow-xs shrink-0"
                >
                  {isAddingCategory ? "..." : "Create"}
                </button>
              </div>
            </div>

            {/* Categories List with Delete */}
            <div className="space-y-2 pt-2 border-t border-[#E2EEFC]">
              <span className="font-bold text-[#101C34] block">Existing Categories ({categories.length})</span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {categories.map((c) => {
                  const count = ideations.filter(
                    (i) => i.category?.toLowerCase() === c.name.toLowerCase()
                  ).length;
                  return (
                    <div
                      key={c.id || c._id}
                      className="p-2.5 bg-[#F8FBFF] rounded-xl border border-[#E2EEFC] flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <Tag className="w-3.5 h-3.5 text-[#087FC4]" />
                        <span className="font-medium text-[#101C34]">{c.name}</span>
                        <span className="text-[10px] text-slate-400">({count} ideas)</span>
                      </div>
                      {categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id || c._id || "", c.name)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded-lg hover:bg-rose-50"
                          title={`Delete category "${c.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#E2EEFC] flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
