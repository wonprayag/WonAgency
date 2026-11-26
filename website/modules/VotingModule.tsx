"use client";

import React, { useState, useEffect } from "react";
import {
  Vote,
  MessageSquareHeart,
  Check,
  PlusCircle,
  Star,
  Users,
  Layers,
  Globe,
  Lock,
  ShieldCheck,
  Share2,
  Trash2,
  X,
  Loader2,
  ExternalLink,
  ChevronRight,
  Eye,
  BarChart3,
  Copy,
  Plus,
  Send,
  HelpCircle,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Link2
} from "lucide-react";
import {
  VotingPoll,
  PollQuestion,
  FeedbackForm,
  FeedbackQuestion,
  User,
  MemberRecord,
  Team,
  votingApi,
  teamsApi
} from "../services/api";

interface VotingModuleProps {
  user: User;
  members?: MemberRecord[];
  polls: VotingPoll[];
  setPolls: React.Dispatch<React.SetStateAction<VotingPoll[]>>;
  feedbackList: FeedbackForm[];
  setFeedbackList: React.Dispatch<React.SetStateAction<FeedbackForm[]>>;
}

export const VotingModule: React.FC<VotingModuleProps> = ({
  user,
  members = [],
  polls,
  setPolls,
  feedbackList,
  setFeedbackList
}) => {
  const [activeTab, setActiveTab] = useState<"voting" | "feedback">("voting");
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Audience Filter State
  const [audienceFilter, setAudienceFilter] = useState<"ALL" | "MINE" | "TEAMS" | "PUBLIC">("ALL");

  // Selected answers for voting / forms in view
  const [userVotedPolls, setUserVotedPolls] = useState<{ [pollId: string]: string }>({});
  const [voteAnonymous, setVoteAnonymous] = useState<{ [pollId: string]: boolean }>({});
  const [feedbackAnswers, setFeedbackAnswers] = useState<{ [formId: string]: { [qId: string]: any } }>({});
  const [feedbackAnonymous, setFeedbackAnonymous] = useState<{ [formId: string]: boolean }>({});
  const [viewResponsesFormId, setViewResponsesFormId] = useState<string | null>(null);

  // Poll Builder Modal State
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [isSubmittingPoll, setIsSubmittingPoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    category: "Governance",
    targetType: "ALL" as "ALL" | "TEAMS" | "USERS" | "ANONYMOUS",
    targetTeams: [] as string[],
    targetUserIds: [] as string[],
    isSecretBallot: true,
    questions: [
      {
        id: `pq-1`,
        questionText: "",
        options: ["Yes, approve proposal", "No, reject proposal"]
      }
    ],
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  });

  // Form Builder Modal State (Google Forms Style)
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [newForm, setNewForm] = useState({
    title: "",
    targetCategory: "Operational Feedback",
    description: "",
    targetType: "ALL" as "ALL" | "TEAMS" | "USERS" | "ANONYMOUS",
    targetTeams: [] as string[],
    targetUserIds: [] as string[],
    isSecretBallot: true,
    questions: [
      {
        id: `q-${Date.now()}-1`,
        questionText: "How satisfied are you with our current agency workflow?",
        type: "RATING" as FeedbackQuestion["type"],
        required: true,
        options: [] as string[]
      },
      {
        id: `q-${Date.now()}-2`,
        questionText: "What specific improvements or ideas do you recommend?",
        type: "PARAGRAPH" as FeedbackQuestion["type"],
        required: false,
        options: [] as string[]
      }
    ] as FeedbackQuestion[]
  });

  useEffect(() => {
    teamsApi.getAll().then(setTeams).catch(console.error);

    // Synchronize initial poll user votes
    const votedMap: { [id: string]: string } = {};
    polls.forEach((p) => {
      (p.userVotes || []).forEach((uv) => {
        if (uv.userId === user.id || uv.userId === (user as any)._id) {
          const key = uv.questionId ? `${p.id}_${uv.questionId}` : p.id;
          votedMap[key] = uv.optionId;
          votedMap[p.id] = uv.optionId;
        }
      });
    });
    setUserVotedPolls(votedMap);
  }, [polls, user.id]);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setStatusNotice({ text, type });
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // ==========================================
  // POLL ACTIONS
  // ==========================================
  const handleVote = async (pollId: string, optionId: string, questionId?: string) => {
    const isAnon = voteAnonymous[pollId] || false;
    try {
      const updated = await votingApi.vote(pollId, {
        userId: isAnon ? undefined : user.id,
        optionId,
        questionId,
        isAnonymous: isAnon
      });

      setPolls((prev) => prev.map((p) => (p.id === pollId || p._id === pollId ? updated : p)));
      setUserVotedPolls((prev) => ({
        ...prev,
        [pollId]: optionId,
        ...(questionId ? { [`${pollId}_${questionId}`]: optionId } : {})
      }));
      notify(isAnon ? "Anonymous vote recorded." : "Your verified vote has been counted.");
    } catch (err: any) {
      notify(err.message || "Failed to submit vote", "error");
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoll.title.trim()) {
      notify("Please provide a poll title", "error");
      return;
    }

    const validQuestions = newPoll.questions.map((q, idx) => ({
      id: q.id || `pq-${Date.now()}-${idx}`,
      questionText: q.questionText.trim() || `Question ${idx + 1}`,
      options: q.options.filter((o) => o.trim().length > 0).map((text, oIdx) => ({
        id: `opt-${Date.now()}-${idx}-${oIdx}`,
        text: text.trim(),
        votesCount: 0
      }))
    })).filter((q) => q.options.length >= 2);

    if (validQuestions.length === 0) {
      notify("At least one question with two or more options is required", "error");
      return;
    }

    setIsSubmittingPoll(true);
    try {
      const isAnonAllowed = newPoll.targetType === "ANONYMOUS" ? true : newPoll.isSecretBallot;
      const created = await votingApi.createPoll({
        title: newPoll.title.trim(),
        description: newPoll.description.trim(),
        category: newPoll.category,
        targetType: newPoll.targetType,
        targetTeams: newPoll.targetTeams,
        targetUserIds: newPoll.targetUserIds,
        isAnonymousAllowed: isAnonAllowed,
        questions: validQuestions,
        expiresAt: newPoll.expiresAt,
        createdBy: user.name
      });

      setPolls((prev) => [created, ...prev]);
      setShowCreatePollModal(false);
      setNewPoll({
        title: "",
        description: "",
        category: "Governance",
        targetType: "ALL",
        targetTeams: [],
        targetUserIds: [],
        isSecretBallot: true,
        questions: [
          {
            id: `pq-${Date.now()}-1`,
            questionText: "",
            options: ["Yes, approve proposal", "No, reject proposal"]
          }
        ],
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
      });
      notify(`Poll "${created.title}" published and pushed to target members!`);
    } catch (err: any) {
      notify(err.message || "Failed to create poll", "error");
    } finally {
      setIsSubmittingPoll(false);
    }
  };

  const handleDeletePoll = async (pollId: string, title: string) => {
    if (!window.confirm(`Delete poll "${title}"?`)) return;
    try {
      await votingApi.deletePoll(pollId);
      setPolls((prev) => prev.filter((p) => p.id !== pollId && p._id !== pollId));
      notify(`Poll "${title}" deleted.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete poll", "error");
    }
  };

  // ==========================================
  // FEEDBACK FORM ACTIONS
  // ==========================================
  const handleFeedbackSubmit = async (formId: string) => {
    const form = feedbackList.find((f) => f.id === formId);
    if (!form) return;

    const answers = feedbackAnswers[formId] || {};
    const isAnon = feedbackAnonymous[formId] ?? false;

    // Validate required questions
    for (const q of form.questions) {
      if (q.required && (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0))) {
        notify(`Please answer required question: "${q.questionText}"`, "error");
        return;
      }
    }

    try {
      await votingApi.submitFeedback(formId, {
        userId: isAnon ? undefined : user.id,
        userName: isAnon ? "Anonymous Contributor" : user.name,
        isAnonymous: isAnon,
        answers
      });

      setFeedbackList((prev) =>
        prev.map((f) =>
          f.id === formId
            ? {
                ...f,
                submitted: true,
                responses: [
                  ...(f.responses || []),
                  {
                    userId: isAnon ? undefined : user.id,
                    userName: isAnon ? "Anonymous Contributor" : user.name,
                    isAnonymous: isAnon,
                    answers,
                    submittedAt: new Date().toISOString()
                  }
                ]
              }
            : f
        )
      );
      notify("Your feedback response has been submitted to agency leadership.");
    } catch (err: any) {
      notify(err.message || "Failed to submit feedback", "error");
    }
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.title.trim()) {
      notify("Please provide a form title", "error");
      return;
    }
    if (newForm.questions.length === 0) {
      notify("At least one question is required", "error");
      return;
    }

    setIsSubmittingForm(true);
    try {
      const created = await votingApi.createFeedbackForm({
        title: newForm.title.trim(),
        targetCategory: newForm.targetCategory.trim(),
        description: newForm.description.trim(),
        targetType: newForm.targetType,
        targetTeams: newForm.targetTeams,
        targetUserIds: newForm.targetUserIds,
        isAnonymousAllowed: newForm.targetType === "ANONYMOUS" ? true : newForm.isSecretBallot,
        questions: newForm.questions,
        createdBy: user.name
      });

      setFeedbackList((prev) => [created, ...prev]);
      setShowCreateFormModal(false);
      setNewForm({
        title: "",
        targetCategory: "Operational Feedback",
        description: "",
        targetType: "ALL",
        targetTeams: [],
        targetUserIds: [],
        isSecretBallot: true,
        questions: [
          {
            id: `q-${Date.now()}-1`,
            questionText: "How satisfied are you with our current agency workflow?",
            type: "RATING",
            required: true,
            options: []
          }
        ]
      });
      notify(`Feedback questionnaire "${created.title}" successfully published!`);
    } catch (err: any) {
      notify(err.message || "Failed to create feedback form", "error");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteForm = async (formId: string, title: string) => {
    if (!window.confirm(`Delete feedback questionnaire "${title}"?`)) return;
    try {
      await votingApi.deleteFeedbackForm(formId);
      setFeedbackList((prev) => prev.filter((f) => f.id !== formId && f._id !== formId));
      notify(`Questionnaire "${title}" deleted.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete form", "error");
    }
  };

  const copyShareLink = (id: string, title: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = `${origin}/form/${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      notify(`Anonymous link for "${title}" copied to clipboard! Anyone can open and respond without login.`);
    } else {
      prompt("Copy anonymous shareable questionnaire link:", url);
    }
  };

  // Filtered lists based on audience filter
  const isMatchAudience = (item: { targetType?: string; targetTeams?: string[]; targetUserIds?: string[] }) => {
    if (audienceFilter === "ALL") return true;
    if (audienceFilter === "PUBLIC") return item.targetType === "ANONYMOUS";
    if (audienceFilter === "TEAMS") return item.targetType === "TEAMS";
    if (audienceFilter === "MINE") {
      if (item.targetType === "ALL") return true;
      if (item.targetType === "USERS") return item.targetUserIds?.includes(user.id);
      return true;
    }
    return true;
  };

  const filteredPolls = polls.filter(isMatchAudience);
  const filteredForms = feedbackList.filter(isMatchAudience);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Header */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 sm:p-6 border border-[#E2EEFC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center shrink-0 shadow-2xs border border-[#CDE5FC]">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-serif-fraunces font-normal text-[#101C34] tracking-tight">
                Voting & Feedback Forms
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F2FF] text-[#087FC4] text-[10px] font-bold uppercase tracking-wider">
                WON Forms Engine
              </span>
            </div>
            <p className="text-xs text-[#647895] mt-0.5 font-sans">
              Google Forms-inspired agency governance, RFC ballots, and operational questionnaires with WON branding.
            </p>
          </div>
        </div>

        {/* Action Buttons to Create Forms / Polls */}
        <div className="flex items-center space-x-2">
          {activeTab === "voting" ? (
            <button
              onClick={() => setShowCreatePollModal(true)}
              className="px-4 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Poll</span>
            </button>
          ) : (
            <button
              onClick={() => setShowCreateFormModal(true)}
              className="px-4 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Feedback Form</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn border ${
            statusNotice.type === "success"
              ? "bg-[#E5F2FF] text-[#0868AE] border-[#bae6fd]"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#087FC4] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusNotice.text}</span>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm ml-3 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Strip with Target Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2EEFC] pb-3">
        {/* Main 2 Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("voting")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "voting"
                ? "bg-[#087FC4] text-white shadow-xs"
                : "bg-white/80 hover:bg-[#E5F2FF]/60 text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
            }`}
          >
            <Vote className="w-3.5 h-3.5 shrink-0" />
            <span>Active Voting Polls</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "voting" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {polls.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("feedback")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeTab === "feedback"
                ? "bg-[#087FC4] text-white shadow-xs"
                : "bg-white/80 hover:bg-[#E5F2FF]/60 text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
            }`}
          >
            <MessageSquareHeart className="w-3.5 h-3.5 shrink-0" />
            <span>Agency Feedback Forms</span>
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === "feedback" ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {feedbackList.length}
            </span>
          </button>
        </div>

        {/* Distribution Target Scope Selector */}
        <div className="flex items-center space-x-1.5 text-xs text-[#647895]">
          <span className="text-[11px] font-medium mr-1">Audience Filter:</span>
          {[
            { key: "ALL", label: "All" },
            { key: "MINE", label: "Pushed to Me" },
            { key: "TEAMS", label: "Teams" },
            { key: "PUBLIC", label: "Anonymous / Public" }
          ].map((scope) => (
            <button
              key={scope.key}
              onClick={() => setAudienceFilter(scope.key as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                audienceFilter === scope.key
                  ? "bg-[#E5F2FF] text-[#087FC4] border border-[#CDE5FC]"
                  : "bg-transparent hover:bg-slate-100 text-slate-500"
              }`}
            >
              {scope.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: VOTING POLLS (GOOGLE FORMS / POLLS STYLE)          */}
      {/* ========================================================= */}
      {activeTab === "voting" && (
        <div className="space-y-6">
          {filteredPolls.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-[#E2EEFC] shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center mx-auto border border-[#CDE5FC] shadow-2xs">
                <Vote className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">No Active Governance Polls</h3>
                <p className="text-xs text-[#647895] leading-relaxed">
                  There are no voting polls matching this audience filter. Create a new poll with direct team pushing
                  or public anonymous voting links.
                </p>
              </div>
              <button
                onClick={() => setShowCreatePollModal(true)}
                className="px-5 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Poll</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPolls.map((poll) => {
                const isAnonVote = voteAnonymous[poll.id] ?? false;
                const questions = (poll.questions && poll.questions.length > 0)
                  ? poll.questions
                  : [{ id: "q-default", questionText: poll.title, options: poll.options || [] }];
                const totalPollVotes = questions.reduce(
                  (sum, q) => sum + q.options.reduce((acc, o) => acc + (o.votesCount || 0), 0),
                  0
                );

                return (
                  <div
                    key={poll.id}
                    className="bg-white/95 backdrop-blur-xs rounded-3xl overflow-hidden border border-[#E2EEFC] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    {/* Google Forms Inspired Header Strip */}
                    <div className="h-2 bg-gradient-to-r from-[#0868AE] via-[#087FC4] to-[#38BDF8]" />

                    <div className="p-6 space-y-4">
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-bold text-[#087FC4] bg-[#E5F2FF] px-2.5 py-0.5 rounded-full border border-[#CDE5FC] uppercase">
                            {poll.category || "Governance"}
                          </span>

                          {/* Audience Target Badge */}
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
                            {poll.targetType === "ALL" ? (
                              <>
                                <Globe className="w-3 h-3 text-[#087FC4]" />
                                <span>All Studio Members</span>
                              </>
                            ) : poll.targetType === "TEAMS" ? (
                              <>
                                <Layers className="w-3 h-3 text-[#087FC4]" />
                                <span>Teams ({poll.targetTeams?.length || 0})</span>
                              </>
                            ) : poll.targetType === "ANONYMOUS" ? (
                              <>
                                <Link2 className="w-3 h-3 text-emerald-600" />
                                <span>Public Link (No Login)</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 text-[#087FC4]" />
                                <span>Direct Accounts</span>
                              </>
                            )}
                          </span>

                          {questions.length > 1 && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              {questions.length} Questions
                            </span>
                          )}
                        </div>

                        {/* Top Action Icons */}
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => copyShareLink(poll.id, poll.title)}
                            title="Copy shareable link for public/anonymous voting without login"
                            className="p-1.5 text-slate-400 hover:text-[#087FC4] hover:bg-[#E5F2FF] rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePoll(poll.id, poll.title)}
                            title="Delete Poll from MongoDB"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-serif-fraunces text-lg text-[#101C34] leading-snug">{poll.title}</h3>
                        {poll.description && (
                          <p className="text-xs text-[#647895] mt-1 leading-relaxed">{poll.description}</p>
                        )}
                      </div>

                      {/* Questions List (Supports 1, 2, or more Poll Questions) */}
                      <div className="space-y-4 pt-1">
                        {questions.map((q, qIdx) => {
                          const qTotalVotes = q.options.reduce((acc, o) => acc + (o.votesCount || 0), 0);
                          const isMultiQ = questions.length > 1;
                          const userSelectedOptId =
                            userVotedPolls[`${poll.id}_${q.id}`] ||
                            (qIdx === 0 ? userVotedPolls[poll.id] : undefined);

                          return (
                            <div
                              key={q.id}
                              className={
                                isMultiQ
                                  ? "p-4 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-3"
                                  : "space-y-2.5"
                              }
                            >
                              {isMultiQ && (
                                <div className="flex items-center justify-between pb-1 border-b border-[#E2EEFC]">
                                  <span className="font-semibold text-xs text-[#101C34]">
                                    <span className="text-[#087FC4] font-bold mr-1">Q{qIdx + 1}:</span>
                                    {q.questionText}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {qTotalVotes} {qTotalVotes === 1 ? "vote" : "votes"}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-2">
                                {q.options.map((opt) => {
                                  const percentage =
                                    qTotalVotes > 0 ? Math.round((opt.votesCount / qTotalVotes) * 100) : 0;
                                  const isVoted = userSelectedOptId === opt.id;

                                  return (
                                    <button
                                      key={opt.id}
                                      onClick={() => handleVote(poll.id, opt.id, q.id)}
                                      className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden group cursor-pointer ${
                                        isVoted
                                          ? "border-[#087FC4] bg-[#E5F2FF]/70 shadow-2xs"
                                          : "border-[#E2EEFC] hover:border-[#bae6fd] bg-white"
                                      }`}
                                    >
                                      {/* Background Animated Progress Fill */}
                                      <div
                                        className="absolute left-0 top-0 bottom-0 bg-[#E5F2FF] transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />

                                      <div className="relative z-10 flex items-center justify-between text-xs">
                                        <div className="flex items-center space-x-2.5">
                                          {/* Google Forms Styled Circular Radio */}
                                          <div
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 ${
                                              isVoted
                                                ? "border-[#087FC4] bg-[#087FC4] text-white"
                                                : "border-slate-300 bg-white group-hover:border-[#087FC4]"
                                            }`}
                                          >
                                            {isVoted && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                          </div>
                                          <span
                                            className={`font-medium ${
                                              isVoted ? "text-[#0868AE] font-bold" : "text-[#101C34]"
                                            }`}
                                          >
                                            {opt.text}
                                          </span>
                                        </div>
                                        <span className="font-bold text-[#087FC4] ml-2 shrink-0">
                                          {percentage}%{" "}
                                          <span className="text-[10px] text-slate-400 font-normal">
                                            ({opt.votesCount})
                                          </span>
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Anonymous Secret Ballot Strip */}
                      <div className="pt-2 flex items-center justify-between text-xs border-t border-[#F0F6FD]">
                        {poll.targetType === "ANONYMOUS" ? (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center space-x-1">
                            <Link2 className="w-3 h-3 text-emerald-600" />
                            <span>Public Direct Link (No sign-in required)</span>
                          </span>
                        ) : (
                          <label className="flex items-center space-x-2 text-[11px] text-[#647895] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isAnonVote}
                              onChange={(e) =>
                                setVoteAnonymous({ ...voteAnonymous, [poll.id]: e.target.checked })
                              }
                              className="rounded text-[#087FC4] focus:ring-0"
                            />
                            <span className="flex items-center space-x-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Vote Anonymously (Secret Ballot)</span>
                            </span>
                          </label>
                        )}

                        <span className="text-slate-400 text-[10px]">
                          Total votes: <strong className="text-[#101C34]">{totalPollVotes}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 bg-[#F8FBFF] border-t border-[#E2EEFC] flex items-center justify-between text-[11px] text-[#647895]">
                      <span>Total ballots: <strong className="text-[#101C34]">{totalPollVotes}</strong></span>
                      <button
                        onClick={() => copyShareLink(poll.id, poll.title)}
                        className="text-[#087FC4] hover:text-[#0868AE] font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Public Link</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: FEEDBACK QUESTIONNAIRES (GOOGLE FORMS STYLE)        */}
      {/* ========================================================= */}
      {activeTab === "feedback" && (
        <div className="space-y-6">
          {filteredForms.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-[#E2EEFC] shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center mx-auto border border-[#CDE5FC] shadow-2xs">
                <MessageSquareHeart className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">No Feedback Questionnaires</h3>
                <p className="text-xs text-[#647895] leading-relaxed">
                  There are no active feedback forms matching this filter. Create a Google Forms-styled survey with
                  ratings, multiple choice, and anonymous submission options.
                </p>
              </div>
              <button
                onClick={() => setShowCreateFormModal(true)}
                className="px-5 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Form</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredForms.map((form) => {
                const answers = feedbackAnswers[form.id] || {};
                const isAnon = feedbackAnonymous[form.id] ?? true;
                const responseCount = form.responses?.length || 0;
                const isViewingResponses = viewResponsesFormId === form.id;

                return (
                  <div
                    key={form.id}
                    className="bg-white/95 backdrop-blur-xs rounded-3xl overflow-hidden border border-[#E2EEFC] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                  >
                    {/* Top Google Forms Inspired Header Strip */}
                    <div className="h-2 bg-gradient-to-r from-[#087FC4] via-[#38BDF8] to-[#bae6fd]" />

                    <div className="p-6 space-y-5">
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-bold text-[#087FC4] bg-[#E5F2FF] px-2.5 py-0.5 rounded-full border border-[#CDE5FC] uppercase">
                            {form.targetCategory || "Feedback"}
                          </span>

                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
                            {form.targetType === "ALL" ? (
                              <>
                                <Globe className="w-3 h-3 text-[#087FC4]" />
                                <span>All Members</span>
                              </>
                            ) : form.targetType === "TEAMS" ? (
                              <>
                                <Layers className="w-3 h-3 text-[#087FC4]" />
                                <span>Teams</span>
                              </>
                            ) : form.targetType === "ANONYMOUS" ? (
                              <>
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Anonymous Public</span>
                              </>
                            ) : (
                              <>
                                <Users className="w-3 h-3 text-[#087FC4]" />
                                <span>Pushed Directly</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => copyShareLink(form.id, form.title)}
                            title="Copy shareable link for anonymous responses without login"
                            className="p-1.5 text-slate-400 hover:text-[#087FC4] hover:bg-[#E5F2FF] rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setViewResponsesFormId(isViewingResponses ? null : form.id)
                            }
                            title="View summary of responses"
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isViewingResponses
                                ? "bg-[#087FC4] text-white"
                                : "text-slate-400 hover:text-[#087FC4] hover:bg-[#E5F2FF]"
                            }`}
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteForm(form.id, form.title)}
                            title="Delete form from MongoDB"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-serif-fraunces text-lg text-[#101C34] leading-snug">{form.title}</h3>
                        {form.description && (
                          <p className="text-xs text-[#647895] mt-1 leading-relaxed">{form.description}</p>
                        )}
                      </div>

                      {/* ============================================== */}
                      {/* VIEW RESPONSES SUMMARY (GOOGLE FORMS STYLE)    */}
                      {/* ============================================== */}
                      {isViewingResponses ? (
                        <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#CDE5FC] space-y-4 animate-fadeIn text-xs">
                          <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-2">
                            <span className="font-bold text-[#101C34]">
                              Responses Summary ({responseCount})
                            </span>
                            <button
                              onClick={() => setViewResponsesFormId(null)}
                              className="text-[11px] font-semibold text-[#087FC4] hover:underline"
                            >
                              Back to Questions
                            </button>
                          </div>

                          {responseCount === 0 ? (
                            <p className="text-slate-400 italic py-4 text-center">
                              No responses submitted yet for this questionnaire.
                            </p>
                          ) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                              {form.responses?.map((resp, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="p-3 bg-white rounded-xl border border-[#E2EEFC] space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-semibold text-[#101C34] flex items-center space-x-1">
                                      {resp.isAnonymous ? (
                                        <span className="text-slate-500 italic">Anonymous Respondent</span>
                                      ) : (
                                        <span className="text-[#087FC4] font-bold">{resp.userName}</span>
                                      )}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      {resp.submittedAt ? new Date(resp.submittedAt).toLocaleDateString() : ""}
                                    </span>
                                  </div>
                                  <div className="space-y-1 text-slate-700 pt-1 text-[11px]">
                                    {Object.entries(resp.answers || {}).map(([qKey, aVal]) => {
                                      const matchedQ = form.questions.find((q) => q.id === qKey);
                                      return (
                                        <div key={qKey} className="bg-[#F8FBFF] p-2 rounded-lg">
                                          <p className="text-slate-500 text-[10px]">
                                            {matchedQ?.questionText || qKey}:
                                          </p>
                                          <p className="font-medium text-[#101C34]">
                                            {Array.isArray(aVal) ? aVal.join(", ") : String(aVal)}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : form.submitted ? (
                        <div className="p-4 bg-emerald-50 rounded-2xl text-center text-xs text-emerald-800 font-semibold border border-emerald-200 space-y-1">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                          <p>Response Recorded for this Cycle</p>
                        </div>
                      ) : (
                        /* ============================================== */
                        /* QUESTIONS FORM INTERACTION (GOOGLE FORMS STYLE)*/
                        /* ============================================== */
                        <div className="space-y-4">
                          {form.questions.map((q, idx) => (
                            <div
                              key={q.id}
                              className="p-4 rounded-2xl bg-[#F8FBFF] border border-[#E2EEFC] space-y-2.5 text-xs"
                            >
                              <label className="font-semibold text-[#101C34] block leading-snug">
                                <span className="text-[#087FC4] font-bold mr-1">{idx + 1}.</span>
                                <span>{q.questionText}</span>
                                {q.required && <span className="text-rose-500 ml-1">*</span>}
                              </label>

                              {/* Question Types */}
                              {q.type === "RATING" && (
                                <div className="flex items-center space-x-1.5 pt-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                      key={star}
                                      type="button"
                                      onClick={() =>
                                        setFeedbackAnswers({
                                          ...feedbackAnswers,
                                          [form.id]: { ...answers, [q.id]: star }
                                        })
                                      }
                                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                                    >
                                      <Star
                                        className={`w-5 h-5 ${
                                          (answers[q.id] || 0) >= star
                                            ? "fill-amber-400 text-amber-500"
                                            : "text-slate-300"
                                        }`}
                                      />
                                    </button>
                                  ))}
                                  <span className="text-[11px] text-slate-500 ml-2">
                                    {answers[q.id] ? `${answers[q.id]} Stars` : "Select rating"}
                                  </span>
                                </div>
                              )}

                              {q.type === "MULTIPLE_CHOICE" && q.options && (
                                <div className="space-y-1.5 pt-1">
                                  {q.options.map((opt) => {
                                    const isSelected = answers[q.id] === opt;
                                    return (
                                      <label
                                        key={opt}
                                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                          isSelected
                                            ? "bg-[#E5F2FF]/70 border-[#087FC4]"
                                            : "bg-white hover:bg-slate-50 border-[#E2EEFC]"
                                        }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`${form.id}-${q.id}`}
                                          value={opt}
                                          checked={isSelected}
                                          onChange={() =>
                                            setFeedbackAnswers({
                                              ...feedbackAnswers,
                                              [form.id]: { ...answers, [q.id]: opt }
                                            })
                                          }
                                          className="sr-only"
                                        />
                                        <div
                                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                            isSelected ? "border-[#087FC4] bg-[#087FC4]" : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                        </div>
                                        <span className="text-xs text-[#101C34]">{opt}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {q.type === "CHECKBOXES" && q.options && (
                                <div className="space-y-1.5 pt-1">
                                  {q.options.map((opt) => {
                                    const currentList: string[] = answers[q.id] || [];
                                    const isChecked = currentList.includes(opt);
                                    return (
                                      <label
                                        key={opt}
                                        className={`flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                                          isChecked
                                            ? "bg-[#E5F2FF]/70 border-[#087FC4]"
                                            : "bg-white hover:bg-slate-50 border-[#E2EEFC]"
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            const updated = isChecked
                                              ? currentList.filter((item) => item !== opt)
                                              : [...currentList, opt];
                                            setFeedbackAnswers({
                                              ...feedbackAnswers,
                                              [form.id]: { ...answers, [q.id]: updated }
                                            })
                                          }}
                                          className="sr-only"
                                        />
                                        <div
                                          className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center ${
                                            isChecked ? "border-[#087FC4] bg-[#087FC4] text-white" : "border-slate-300 bg-white"
                                          }`}
                                        >
                                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </div>
                                        <span className="text-xs text-[#101C34]">{opt}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {(q.type === "TEXT" || q.type === "PARAGRAPH") && (
                                <textarea
                                  rows={q.type === "PARAGRAPH" ? 3 : 2}
                                  placeholder="Type your response..."
                                  value={answers[q.id] || ""}
                                  onChange={(e) =>
                                    setFeedbackAnswers({
                                      ...feedbackAnswers,
                                      [form.id]: { ...answers, [q.id]: e.target.value }
                                    })
                                  }
                                  className="w-full text-xs p-2.5 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
                                />
                              )}
                            </div>
                          ))}

                          {/* Anonymous Submit Toggle */}
                          <div className="pt-2 flex items-center justify-between">
                            <label className="flex items-center space-x-2 text-[11px] text-[#647895] cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isAnon}
                                onChange={(e) =>
                                  setFeedbackAnonymous({
                                    ...feedbackAnonymous,
                                    [form.id]: e.target.checked
                                  })
                                }
                                className="rounded text-[#087FC4] focus:ring-0"
                              />
                              <span className="flex items-center space-x-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Anonymous Submission (Protect my name)</span>
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleFeedbackSubmit(form.id)}
                              className="px-5 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit Response</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 bg-[#F8FBFF] border-t border-[#E2EEFC] flex items-center justify-between text-[11px] text-[#647895]">
                      <span>Responses: <strong className="text-[#101C34]">{responseCount}</strong></span>
                      <button
                        onClick={() => copyShareLink(form.id, form.title)}
                        className="text-[#087FC4] hover:text-[#0868AE] font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Public Link</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: CREATE NEW POLL                                  */}
      {/* ========================================================= */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#E2EEFC] shadow-xl space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <Vote className="w-5 h-5" />
                </div>
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">Create Voting Poll</h3>
              </div>
              <button
                onClick={() => setShowCreatePollModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Poll Title / Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Studio Architecture & Technology RFC"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Description / Context</label>
                <textarea
                  rows={2}
                  placeholder="Background context or details for voters..."
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
                />
              </div>

              {/* Distribution Target Selector */}
              <div className="p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-2.5">
                <label className="font-bold text-[#101C34] block">Distribution Target *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ALL", label: "All Members (Broadcast)", icon: Globe },
                    { id: "TEAMS", label: "Specific Teams", icon: Layers },
                    { id: "USERS", label: "Specific Accounts", icon: Users },
                    { id: "ANONYMOUS", label: "Public Link (No Login)", icon: Link2 }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = newPoll.targetType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewPoll({ ...newPoll, targetType: t.id as any })}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#087FC4] text-white border-[#087FC4] shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-[11px] truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Team Selection when TEAMS is chosen */}
                {newPoll.targetType === "TEAMS" && (
                  <div className="pt-2 border-t border-[#E2EEFC] space-y-1.5 animate-fadeIn">
                    <span className="text-[11px] font-semibold text-[#101C34] block">Select Teams to Push To:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {teams.map((team) => {
                        const isSelected = newPoll.targetTeams.includes(team.name);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? newPoll.targetTeams.filter((t) => t !== team.name)
                                : [...newPoll.targetTeams, team.name];
                              setNewPoll({ ...newPoll, targetTeams: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#087FC4] text-white border-[#087FC4]"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {team.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* User Selection when USERS is chosen */}
                {newPoll.targetType === "USERS" && (
                  <div className="pt-2 border-t border-[#E2EEFC] space-y-1.5 animate-fadeIn">
                    <span className="text-[11px] font-semibold text-[#101C34] block">Select Member Accounts:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {members.map((m) => {
                        const isSelected = newPoll.targetUserIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? newPoll.targetUserIds.filter((uid) => uid !== m.id)
                                : [...newPoll.targetUserIds, m.id];
                              setNewPoll({ ...newPoll, targetUserIds: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#087FC4] text-white border-[#087FC4]"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clear distinction between Public Link vs Internal Secret Ballot */}
                {newPoll.targetType === "ANONYMOUS" ? (
                  <div className="p-3 bg-[#E5F2FF]/60 rounded-xl border border-[#CDE5FC] flex items-center space-x-2 text-[11px] text-[#0868AE] animate-fadeIn">
                    <Link2 className="w-4 h-4 text-[#087FC4] shrink-0" />
                    <span>
                      <strong>Public Link Active:</strong> Anyone with the shareable link can cast votes without needing an agency account or login.
                    </span>
                  </div>
                ) : (
                  <label className="flex items-start space-x-2.5 text-[11px] text-[#101C34] font-medium cursor-pointer pt-1 animate-fadeIn">
                    <input
                      type="checkbox"
                      checked={newPoll.isSecretBallot}
                      onChange={(e) => setNewPoll({ ...newPoll, isSecretBallot: e.target.checked })}
                      className="rounded text-[#087FC4] mt-0.5"
                    />
                    <div>
                      <span className="font-bold flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Secret Ballot (Anonymous)</span>
                      </span>
                      <p className="text-[10px] text-[#647895] font-normal">
                        Internal members log in to authenticate eligibility, but their personal identity is kept strictly hidden on vote tallies.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Multi-Question Polls Builder (Add 1, 2, or more Poll Questions) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-bold text-[#101C34] block">
                      Poll Questions ({newPoll.questions.length})
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Add 2 or more questions to ask multiple things in the same poll
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNewPoll({
                        ...newPoll,
                        questions: [
                          ...newPoll.questions,
                          {
                            id: `pq-${Date.now()}-${newPoll.questions.length + 1}`,
                            questionText: "",
                            options: ["Yes", "No"]
                          }
                        ]
                      })
                    }
                    className="text-[#087FC4] hover:text-[#0868AE] font-semibold text-[11px] flex items-center space-x-1 cursor-pointer bg-[#E5F2FF] px-2.5 py-1 rounded-lg border border-[#CDE5FC]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {newPoll.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-3 animate-fadeIn"
                    >
                      <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#E2EEFC]">
                        <span className="font-bold text-[#087FC4] text-xs">
                          Question {qIdx + 1}
                        </span>
                        {newPoll.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newPoll.questions.filter((_, i) => i !== qIdx);
                              setNewPoll({ ...newPoll, questions: updated });
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer text-[10px] flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove Question</span>
                          </button>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          required
                          placeholder={`e.g. Question ${qIdx + 1}: Do you approve this change?`}
                          value={q.questionText}
                          onChange={(e) => {
                            const updated = [...newPoll.questions];
                            updated[qIdx].questionText = e.target.value;
                            setNewPoll({ ...newPoll, questions: updated });
                          }}
                          className="w-full p-2 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] text-xs"
                        />
                      </div>

                      {/* Choice Options for this Question */}
                      <div className="space-y-1.5 pl-2 pt-1 border-l-2 border-[#CDE5FC]">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Choice Options:</span>
                        {q.options.map((optText, optIdx) => (
                          <div key={optIdx} className="flex items-center space-x-1.5">
                            <span className="text-[10px] text-slate-400">•</span>
                            <input
                              type="text"
                              required
                              value={optText}
                              placeholder={`Choice ${optIdx + 1}`}
                              onChange={(e) => {
                                const updated = [...newPoll.questions];
                                const opts = [...updated[qIdx].options];
                                opts[optIdx] = e.target.value;
                                updated[qIdx].options = opts;
                                setNewPoll({ ...newPoll, questions: updated });
                              }}
                              className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...newPoll.questions];
                                  updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== optIdx);
                                  setNewPoll({ ...newPoll, questions: updated });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...newPoll.questions];
                            updated[qIdx].options = [
                              ...updated[qIdx].options,
                              `Option ${updated[qIdx].options.length + 1}`
                            ];
                            setNewPoll({ ...newPoll, questions: updated });
                          }}
                          className="text-[#087FC4] font-semibold text-[10px] hover:underline pt-0.5 inline-block cursor-pointer"
                        >
                          + Add choice option
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2EEFC] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePollModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPoll}
                  className="px-5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingPoll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Poll</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CREATE FEEDBACK FORM (GOOGLE FORMS BUILDER)       */}
      {/* ========================================================= */}
      {showCreateFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-xl w-full border border-[#E2EEFC] shadow-xl space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <MessageSquareHeart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-fraunces text-xl text-[#101C34]">Google Forms Survey Builder</h3>
                  <p className="text-[11px] text-[#647895]">Interactive questionnaire with custom audience targeting & public access</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateFormModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateForm} className="space-y-5">
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Form Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Studio Operations & Engineering Review"
                  value={newForm.title}
                  onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Form Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain the purpose of this feedback questionnaire..."
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
                />
              </div>

              {/* Target Audience Selector */}
              <div className="p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-2.5">
                <label className="font-bold text-[#101C34] block">Form Audience Scope *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "ALL", label: "All Members (Broadcast)", icon: Globe },
                    { id: "TEAMS", label: "Specific Teams", icon: Layers },
                    { id: "USERS", label: "Specific Accounts", icon: Users },
                    { id: "ANONYMOUS", label: "Public Link (No Login)", icon: Link2 }
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = newForm.targetType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setNewForm({ ...newForm, targetType: t.id as any })}
                        className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#087FC4] text-white border-[#087FC4] shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-semibold text-[11px] truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {newForm.targetType === "TEAMS" && (
                  <div className="pt-2 border-t border-[#E2EEFC] space-y-1.5 animate-fadeIn">
                    <span className="text-[11px] font-semibold text-[#101C34] block">Select Teams:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {teams.map((team) => {
                        const isSelected = newForm.targetTeams.includes(team.name);
                        return (
                          <button
                            key={team.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? newForm.targetTeams.filter((t) => t !== team.name)
                                : [...newForm.targetTeams, team.name];
                              setNewForm({ ...newForm, targetTeams: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#087FC4] text-white border-[#087FC4]"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {team.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {newForm.targetType === "USERS" && (
                  <div className="pt-2 border-t border-[#E2EEFC] space-y-1.5 animate-fadeIn">
                    <span className="text-[11px] font-semibold text-[#101C34] block">Select Member Accounts:</span>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {members.map((m) => {
                        const isSelected = newForm.targetUserIds.includes(m.id);
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              const updated = isSelected
                                ? newForm.targetUserIds.filter((uid) => uid !== m.id)
                                : [...newForm.targetUserIds, m.id];
                              setNewForm({ ...newForm, targetUserIds: updated });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#087FC4] text-white border-[#087FC4]"
                                : "bg-white text-slate-700 border-slate-200"
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Clear distinction between Public Link vs Internal Secret Ballot */}
                {newForm.targetType === "ANONYMOUS" ? (
                  <div className="p-3 bg-[#E5F2FF]/60 rounded-xl border border-[#CDE5FC] flex items-center space-x-2 text-[11px] text-[#0868AE] animate-fadeIn">
                    <Link2 className="w-4 h-4 text-[#087FC4] shrink-0" />
                    <span>
                      <strong>Public Link Active:</strong> Anyone with the shareable link can fill this form anonymously without an agency account or login.
                    </span>
                  </div>
                ) : (
                  <label className="flex items-start space-x-2.5 text-[11px] text-[#101C34] font-medium cursor-pointer pt-1 animate-fadeIn">
                    <input
                      type="checkbox"
                      checked={newForm.isSecretBallot}
                      onChange={(e) => setNewForm({ ...newForm, isSecretBallot: e.target.checked })}
                      className="rounded text-[#087FC4] mt-0.5"
                    />
                    <div>
                      <span className="font-bold flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Anonymous Feedback</span>
                      </span>
                      <p className="text-[10px] text-[#647895] font-normal">
                        Keep contributor names and E-IDs confidential on submitted response records.
                      </p>
                    </div>
                  </label>
                )}
              </div>

              {/* Questions List (Google Forms Dynamic Builder) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#101C34]">Questions ({newForm.questions.length})</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewForm({
                        ...newForm,
                        questions: [
                          ...newForm.questions,
                          {
                            id: `q-${Date.now()}-${newForm.questions.length + 1}`,
                            questionText: "New question...",
                            type: "TEXT",
                            required: true
                          }
                        ]
                      })
                    }
                    className="text-[#087FC4] hover:text-[#0868AE] font-semibold text-[11px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {newForm.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-[#087FC4]">Question {idx + 1}</span>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center space-x-1 text-[10px] text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => {
                                const updated = [...newForm.questions];
                                updated[idx].required = e.target.checked;
                                setNewForm({ ...newForm, questions: updated });
                              }}
                              className="rounded text-[#087FC4]"
                            />
                            <span>Required</span>
                          </label>

                          {newForm.questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = newForm.questions.filter((_, i) => i !== idx);
                                setNewForm({ ...newForm, questions: updated });
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            required
                            placeholder="Enter question text..."
                            value={q.questionText}
                            onChange={(e) => {
                              const updated = [...newForm.questions];
                              updated[idx].questionText = e.target.value;
                              setNewForm({ ...newForm, questions: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                          />
                        </div>

                        <div>
                          <select
                            value={q.type}
                            onChange={(e) => {
                              const updated = [...newForm.questions];
                              const newType = e.target.value as any;
                              updated[idx].type = newType;
                              if (newType === "MULTIPLE_CHOICE" || newType === "CHECKBOXES") {
                                updated[idx].options = updated[idx].options || ["Option 1", "Option 2"];
                              }
                              setNewForm({ ...newForm, questions: updated });
                            }}
                            className="w-full p-2 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                          >
                            <option value="RATING">⭐ 1-5 Star Rating</option>
                            <option value="TEXT">Short Answer Text</option>
                            <option value="PARAGRAPH">Paragraph Text</option>
                            <option value="MULTIPLE_CHOICE">Multiple Choice (Radio)</option>
                            <option value="CHECKBOXES">Checkboxes (Multi-select)</option>
                          </select>
                        </div>
                      </div>

                      {/* If multiple choice or checkboxes, render option editor */}
                      {(q.type === "MULTIPLE_CHOICE" || q.type === "CHECKBOXES") && (
                        <div className="space-y-1.5 pl-2 pt-1 border-l-2 border-[#CDE5FC]">
                          <span className="text-[10px] font-bold text-slate-500 uppercase">Choice Options:</span>
                          {(q.options || ["Option 1", "Option 2"]).map((optText, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-400">•</span>
                              <input
                                type="text"
                                value={optText}
                                onChange={(e) => {
                                  const updated = [...newForm.questions];
                                  const opts = [...(updated[idx].options || [])];
                                  opts[optIdx] = e.target.value;
                                  updated[idx].options = opts;
                                  setNewForm({ ...newForm, questions: updated });
                                }}
                                className="flex-1 p-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                              />
                              {(q.options?.length || 0) > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...newForm.questions];
                                    updated[idx].options = updated[idx].options?.filter((_, i) => i !== optIdx);
                                    setNewForm({ ...newForm, questions: updated });
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newForm.questions];
                              const opts = [...(updated[idx].options || []), `Option ${(updated[idx].options?.length || 0) + 1}`];
                              updated[idx].options = opts;
                              setNewForm({ ...newForm, questions: updated });
                            }}
                            className="text-[#087FC4] font-semibold text-[10px] hover:underline pt-0.5 inline-block"
                          >
                            + Add choice option
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2EEFC] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFormModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingForm}
                  className="px-5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingForm ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Questionnaire</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
