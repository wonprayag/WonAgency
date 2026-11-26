"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Vote,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Star,
  Check,
  Loader2,
  AlertCircle,
  Share2,
  Send
} from "lucide-react";
import { votingApi, VotingPoll, FeedbackForm } from "../../../services/api";

export default function PublicFormPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState<VotingPoll | null>(null);
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll state (supports multiple questions)
  const [selectedOptions, setSelectedOptions] = useState<{ [qId: string]: string }>({});
  const [pollSubmitted, setPollSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Form state
  const [answers, setAnswers] = useState<{ [qId: string]: any }>({});
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // Try fetching as poll first, then as feedback form
    votingApi
      .getPollById(id)
      .then((p) => {
        setPoll(p);
        setLoading(false);
      })
      .catch(() => {
        votingApi
          .getFeedbackFormById(id)
          .then((f) => {
            setForm(f);
            setLoading(false);
          })
          .catch(() => {
            setError("The requested voting poll or feedback form was not found or has been removed.");
            setLoading(false);
          });
      });
  }, [id]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poll) return;

    const questions = poll.questions && poll.questions.length > 0
      ? poll.questions
      : [{ id: "q-default", questionText: poll.title, options: poll.options || [] }];

    const selectedKeys = Object.keys(selectedOptions);
    if (selectedKeys.length === 0) return;

    setIsSubmitting(true);
    try {
      let lastUpdated = poll;
      for (const q of questions) {
        const optId = selectedOptions[q.id];
        if (optId) {
          lastUpdated = await votingApi.vote(poll.id, {
            optionId: optId,
            questionId: q.id,
            isAnonymous: true
          });
        }
      }
      setPoll(lastUpdated);
      setPollSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Failed to submit vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setIsSubmitting(true);
    try {
      await votingApi.submitFeedback(form.id, {
        isAnonymous: true,
        userName: isAnonymous ? "Anonymous Public Respondent" : "Public Contributor",
        answers
      });
      setFormSubmitted(true);
    } catch (err: any) {
      alert(err.message || "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <img src="/won-logo.png" alt="WON" className="h-8 w-auto mx-auto animate-pulse" />
          <p className="text-xs text-[#647895]">Loading secure voting questionnaire...</p>
        </div>
      </div>
    );
  }

  if (error || (!poll && !form)) {
    return (
      <div className="min-h-screen bg-[#F4F8FD] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-[#E2EEFC] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-serif-fraunces text-xl text-[#101C34]">Questionnaire Not Found</h2>
          <p className="text-xs text-[#647895] leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5FAFF] via-[#EAF4FF]/50 to-[#F8FBFF] py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
        
        {/* Google Forms Header Banner with WON Branding */}
        <div className="bg-white rounded-3xl overflow-hidden border border-[#D5E6F8] shadow-sm">
          {/* Top Winter Accent Strip */}
          <div className="h-4 bg-gradient-to-r from-[#0868AE] via-[#087FC4] to-[#38BDF8]" />
          
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2EEFC]">
              <div className="flex items-center space-x-2.5">
                <img src="/won-logo.png" alt="WON" className="h-6 w-auto object-contain" />
                <span className="h-4 w-[1px] bg-[#D0E4FA]" />
                <span className="text-[10px] tracking-widest uppercase font-semibold text-[#087FC4]">
                  {poll ? "Executive RFC Poll" : "Agency Feedback System"}
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[10px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Anonymous Submission Allowed</span>
              </div>
            </div>

            <div>
              <h1 className="font-serif-fraunces text-2xl sm:text-3xl text-[#101C34] tracking-tight">
                {poll ? poll.title : form?.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#647895] mt-2 leading-relaxed">
                {poll ? poll.description : form?.description}
              </p>
            </div>

            <div className="pt-2 border-t border-[#F0F6FD] flex items-center justify-between text-[11px] text-[#647895]">
              <span>Public Access: <strong className="text-[#101C34]">No sign-in required</strong></span>
              <span>Agency Governance</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* POLL VOTING CARD                                          */}
        {/* ========================================================= */}
        {poll && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EEFC] shadow-sm space-y-6">
            {pollSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Thank you for voting!</h3>
                <p className="text-xs text-[#647895] max-w-sm mx-auto leading-relaxed">
                  Your vote has been anonymously cast and recorded in the WON Originals governance ledger.
                </p>

                {/* Live Poll Results Summary */}
                <div className="pt-4 max-w-md mx-auto space-y-4 text-left">
                  <span className="text-[11px] font-bold text-[#647895] uppercase tracking-wider block">
                    Live Governance Results
                  </span>
                  {((poll.questions && poll.questions.length > 0)
                    ? poll.questions
                    : [{ id: "q-default", questionText: poll.title, options: poll.options || [] }]
                  ).map((q, qIdx) => {
                    const qTotal = q.options.reduce((a, b) => a + (b.votesCount || 0), 0);
                    return (
                      <div key={q.id} className="space-y-2 p-3.5 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC]">
                        {poll.questions && poll.questions.length > 1 && (
                          <div className="font-bold text-xs text-[#101C34] pb-1 border-b border-[#E2EEFC]">
                            Q{qIdx + 1}: {q.questionText}
                          </div>
                        )}
                        {q.options.map((opt) => {
                          const pct = qTotal > 0 ? Math.round((opt.votesCount / qTotal) * 100) : 0;
                          return (
                            <div key={opt.id} className="space-y-1 text-xs">
                              <div className="flex justify-between font-medium text-[#101C34]">
                                <span>{opt.text}</span>
                                <span className="font-bold text-[#087FC4]">
                                  {pct}% ({opt.votesCount})
                                </span>
                              </div>
                              <div className="w-full bg-[#E5F2FF] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#087FC4] h-full rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <form onSubmit={handleVote} className="space-y-6">
                <div className="space-y-5">
                  {((poll.questions && poll.questions.length > 0)
                    ? poll.questions
                    : [{ id: "q-default", questionText: poll.title, options: poll.options || [] }]
                  ).map((q, qIdx) => (
                    <div key={q.id} className="space-y-2.5">
                      <label className="text-xs font-semibold text-[#101C34] block">
                        {poll.questions && poll.questions.length > 1 ? (
                          <>
                            <span className="text-[#087FC4] font-bold mr-1">Question {qIdx + 1}:</span>
                            {q.questionText}
                          </>
                        ) : (
                          "Choose your option:"
                        )}
                      </label>
                      <div className="space-y-2">
                        {q.options.map((opt) => {
                          const isSelected = selectedOptions[q.id] === opt.id;
                          return (
                            <label
                              key={opt.id}
                              className={`flex items-center space-x-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#E5F2FF]/60 border-[#087FC4] shadow-xs"
                                  : "bg-[#F8FBFF] hover:bg-[#F0F6FD] border-[#E2EEFC]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`pollOption_${q.id}`}
                                value={opt.id}
                                checked={isSelected}
                                onChange={() => setSelectedOptions({ ...selectedOptions, [q.id]: opt.id })}
                                className="sr-only"
                              />
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "border-[#087FC4] bg-[#087FC4] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <span className="text-xs font-medium text-[#101C34]">{opt.text}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-[#E2EEFC] flex items-center justify-between">
                  <span className="text-[11px] text-[#647895] flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Anonymous ballot • Identity protected</span>
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmitting || Object.keys(selectedOptions).length === 0}
                    className="py-2.5 px-6 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting Vote...</span>
                      </>
                    ) : (
                      <>
                        <Vote className="w-3.5 h-3.5" />
                        <span>Cast Ballot</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* FEEDBACK FORM CARD (GOOGLE FORMS STYLE)                    */}
        {/* ========================================================= */}
        {form && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2EEFC] shadow-sm space-y-6">
            {formSubmitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-serif-fraunces text-2xl text-[#101C34]">Response Recorded!</h3>
                <p className="text-xs text-[#647895] max-w-sm mx-auto leading-relaxed">
                  Your feedback has been anonymously submitted to the WON Originals leadership review board.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                {form.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl bg-[#F8FBFF] border border-[#E2EEFC] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <label className="text-xs font-semibold text-[#101C34] leading-relaxed">
                        <span className="text-[#087FC4] font-bold mr-1">{idx + 1}.</span>
                        <span>{q.questionText}</span>
                        {q.required && <span className="text-rose-500 ml-1">*</span>}
                      </label>
                      <span className="text-[10px] text-[#647895] uppercase font-bold tracking-wider shrink-0 bg-white px-2 py-0.5 rounded border border-[#E2EEFC]">
                        {q.type.replace("_", " ")}
                      </span>
                    </div>

                    {/* Question Types */}
                    {q.type === "RATING" && (
                      <div className="flex items-center space-x-2 pt-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected = (answers[q.id] || 0) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAnswers({ ...answers, [q.id]: star })}
                              className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star
                                className={`w-6 h-6 ${
                                  isSelected ? "fill-amber-400 text-amber-500" : "text-slate-300"
                                }`}
                              />
                            </button>
                          );
                        })}
                        <span className="text-xs text-[#647895] ml-2">
                          {answers[q.id] ? `${answers[q.id]} of 5 Stars` : "Select rating"}
                        </span>
                      </div>
                    )}

                    {q.type === "MULTIPLE_CHOICE" && q.options && (
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt) => {
                          const isSelected = answers[q.id] === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[#E5F2FF]/60 border-[#087FC4]"
                                  : "bg-white hover:bg-slate-50 border-[#E2EEFC]"
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={isSelected}
                                onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
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
                      <div className="space-y-2 pt-1">
                        {q.options.map((opt) => {
                          const selectedList: string[] = answers[q.id] || [];
                          const isChecked = selectedList.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={`flex items-center space-x-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? "bg-[#E5F2FF]/60 border-[#087FC4]"
                                  : "bg-white hover:bg-slate-50 border-[#E2EEFC]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  const updated = isChecked
                                    ? selectedList.filter((item) => item !== opt)
                                    : [...selectedList, opt];
                                  setAnswers({ ...answers, [q.id]: updated });
                                }}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                                  isChecked ? "border-[#087FC4] bg-[#087FC4] text-white" : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
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
                        required={q.required}
                        placeholder="Type your response here..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full text-xs p-3 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
                      />
                    )}
                  </div>
                ))}

                <div className="pt-4 border-t border-[#E2EEFC] flex items-center justify-between">
                  <span className="text-[11px] text-[#647895] flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Responses encrypted and anonymous</span>
                  </span>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-6 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Submit Response</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
