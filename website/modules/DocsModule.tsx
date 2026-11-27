"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Printer,
  Copy,
  Check,
  Trash2,
  Edit3,
  Search,
  Plus,
  Eye,
  ArrowLeft,
  X,
  Sparkles,
  Columns,
  Coins,
  Mail,
  FilePlus,
  ChevronDown,
  Building2,
  FolderGit2,
  Users,
  CheckCircle2,
  Send,
  BadgeDollarSign,
  Link as LinkIcon,
  ExternalLink,
  Sliders,
  Type,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { User, usersApi, noticesApi, API_BASE_URL } from "../services/api";

export interface DocHighlight {
  id: string;
  text: string;
  url?: string;
}

export interface DocBullet {
  id: string;
  heading: string;
  bodyText: string;
  highlightText?: string; // backwards compatibility
  highlights?: DocHighlight[];
}

export interface CustomDocument {
  id: string;
  title: string;
  category?: "NOTICE" | "TREASURY" | "RELEASE" | "LETTER" | "CHANGELOG" | "GENERAL";
  recipientName: string;
  salutationPrefix?: "Hi" | "Dear" | "To:" | "Attention:" | "Notice to:" | "None";
  letterSubject?: string;
  showTopLogo: boolean;
  watermarkType: "NONE" | "LOGO" | "TEXT";
  watermarkText?: string;
  watermarkOpacity: number; // 2 to 20
  leadStatement: string;
  bullets: DocBullet[];
  calloutLinkText: string;
  signoffGreeting: string;
  signoffTeam: string;
  footerCopyright: string;
  footerDisclaimer: string;
  layoutScale?: "auto" | "executive" | "standard" | "compact";
  density?: "compact" | "standard";
  updatedAt: string;
}

interface DocsModuleProps {
  user: User | null;
}

const formatSalutation = (
  prefix: CustomDocument["salutationPrefix"] = "To:",
  recipient: string
) => {
  if (!recipient.trim()) return "";
  switch (prefix) {
    case "To:":
      return `To: ${recipient}`;
    case "Attention:":
      return `Attention: ${recipient}`;
    case "Notice to:":
      return `Notice to: ${recipient}`;
    case "Dear":
      return `Dear ${recipient},`;
    case "None":
      return recipient;
    case "Hi":
    default:
      return `Hi ${recipient},`;
  }
};

export const normalizeUrl = (url?: string): string => {
  if (!url) return "#";
  const trimmed = url.trim();
  if (!trimmed) return "#";
  // If it's an internal route starting with '/', keep it
  if (trimmed.startsWith("/")) return trimmed;
  // If it already has a protocol scheme like http://, https://, mailto:, etc.
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*?:/.test(trimmed)) {
    return trimmed;
  }
  // Otherwise, default to https://
  return `https://${trimmed}`;
};

/**
 * Universal text renderer:
 * 1. Parses inline markdown: [link label](url) -> blue clickable link
 * 2. Parses inline markdown: [highlight label] -> blue highlighted text
 * 3. Highlights phrases from explicit bullet highlights (with optional URLs)
 * 4. Highlights legacy bullet highlightText
 */
export const renderRichDocumentText = (
  rawText: string,
  explicitHighlights?: DocHighlight[],
  legacyHighlight?: string
): React.ReactNode => {
  if (!rawText) return null;

  const targets: Array<{ phrase: string; url?: string }> = [];

  if (explicitHighlights && explicitHighlights.length > 0) {
    for (const h of explicitHighlights) {
      if (h.text && h.text.trim()) {
        targets.push({ phrase: h.text.trim(), url: h.url ? normalizeUrl(h.url) : undefined });
      }
    }
  }

  if (legacyHighlight && legacyHighlight.trim()) {
    if (!targets.some((t) => t.phrase.toLowerCase() === legacyHighlight.trim().toLowerCase())) {
      targets.push({ phrase: legacyHighlight.trim() });
    }
  }

  // Regex to match markdown links [label](url) and bracket highlights [label]
  const markdownRegex = /\[([^\]]+)\](?:\(([^)]+)\))?/g;
  const parts: Array<{ type: "text" | "link" | "highlight"; content: string; url?: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = markdownRegex.exec(rawText)) !== null) {
    const [fullMatch, label, url] = match;
    const matchIndex = match.index;

    if (matchIndex > lastIndex) {
      parts.push({
        type: "text",
        content: rawText.substring(lastIndex, matchIndex),
      });
    }

    if (url) {
      parts.push({
        type: "link",
        content: label,
        url: normalizeUrl(url),
      });
    } else {
      parts.push({
        type: "highlight",
        content: label,
      });
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  if (lastIndex < rawText.length) {
    parts.push({
      type: "text",
      content: rawText.substring(lastIndex),
    });
  }

  const finalNodes: React.ReactNode[] = [];

  parts.forEach((part, pIdx) => {
    if (part.type === "link") {
      finalNodes.push(
        <a
          key={`link-${pIdx}`}
          href={normalizeUrl(part.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1a73e8] font-medium hover:underline inline cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part.content}
        </a>
      );
    } else if (part.type === "highlight") {
      finalNodes.push(
        <span key={`hl-${pIdx}`} className="text-[#1a73e8] font-medium">
          {part.content}
        </span>
      );
    } else {
      const currentText = part.content;
      if (targets.length === 0) {
        finalNodes.push(<span key={`txt-${pIdx}`}>{currentText}</span>);
        return;
      }

      const sortedTargets = [...targets].sort((a, b) => b.phrase.length - a.phrase.length);
      const escapedPhrases = sortedTargets
        .map((t) => t.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .filter(Boolean);

      if (escapedPhrases.length === 0) {
        finalNodes.push(<span key={`txt-${pIdx}`}>{currentText}</span>);
        return;
      }

      const phraseRegex = new RegExp(`(${escapedPhrases.join("|")})`, "gi");
      const subParts = currentText.split(phraseRegex);

      subParts.forEach((sp, spIdx) => {
        if (!sp) return;
        const matchedTarget = sortedTargets.find(
          (t) => t.phrase.toLowerCase() === sp.toLowerCase()
        );
        if (matchedTarget) {
          if (matchedTarget.url) {
            finalNodes.push(
              <a
                key={`sub-link-${pIdx}-${spIdx}`}
                href={normalizeUrl(matchedTarget.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1a73e8] font-medium hover:underline inline cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                {sp}
              </a>
            );
          } else {
            finalNodes.push(
              <span key={`sub-hl-${pIdx}-${spIdx}`} className="text-[#1a73e8] font-medium">
                {sp}
              </span>
            );
          }
        } else {
          finalNodes.push(<span key={`sub-txt-${pIdx}-${spIdx}`}>{sp}</span>);
        }
      });
    }
  });

  return <>{finalNodes}</>;
};

// Simplified Plain-English Initial Documents
const INITIAL_NOTICE_DOC: CustomDocument = {
  id: "doc-notice-1",
  title: "Official Agency Notice",
  category: "NOTICE",
  recipientName: "All Studio Members & Project Leads",
  salutationPrefix: "To:",
  letterSubject: "",
  showTopLogo: true,
  watermarkType: "LOGO",
  watermarkText: "WON",
  watermarkOpacity: 5,
  density: "compact",
  leadStatement:
    "Here are important updates on our studio schedules and session guidelines starting this week.",
  bullets: [
    {
      id: "n1",
      heading: "Start Date",
      bodyText:
        "These updates go live on [Monday, November 30, 2026] across all project teams.",
      highlights: [{ id: "h1", text: "Monday, November 30, 2026" }],
    },
    {
      id: "n2",
      heading: "Studio Lab Hours",
      bodyText:
        "Lab spaces and remote workstations remain open until [22:00 IST](https://won.agency/schedule) for sprint teams.",
      highlights: [{ id: "h2", text: "22:00 IST", url: "https://won.agency/schedule" }],
    },
    {
      id: "n3",
      heading: "Attendance Check-in",
      bodyText:
        "Please record your session check-in [within 15 minutes](https://won.agency/attendance) of start time to earn daily Spark rewards.",
      highlights: [{ id: "h3", text: "within 15 minutes", url: "https://won.agency/attendance" }],
    },
  ],
  calloutLinkText:
    "Questions or scheduling adjustments? Review the [WON Agency Guidelines](https://won.agency/guidelines) or reach out to operations.",
  signoffGreeting: "Best regards,",
  signoffTeam: "WON Operations Team",
  footerCopyright: "© 2026 WON LLC",
  footerDisclaimer:
    "Official agency announcement. Applies to all active studio participants.",
  updatedAt: new Date().toISOString(),
};

const INITIAL_FUND_RELEASE_DOC: CustomDocument = {
  id: "doc-release-1",
  title: "Fund Release & Disbursement Authorization",
  category: "RELEASE",
  recipientName: "Engineering Sprint Team & Project Lead",
  salutationPrefix: "To:",
  letterSubject: "Authorization for Capital Disbursement (Grant Ref: AGY-FND-2026-081)",
  showTopLogo: true,
  watermarkType: "LOGO",
  watermarkText: "WON",
  watermarkOpacity: 5,
  density: "compact",
  leadStatement:
    "We are pleased to confirm that your project budget request has been approved and funds have been released.",
  bullets: [
    {
      id: "r1",
      heading: "Amount Released",
      bodyText:
        "[$3,500.00 USD](https://won.agency/treasury) has been disbursed to your project account.",
      highlights: [{ id: "r1-h", text: "$3,500.00 USD", url: "https://won.agency/treasury" }],
    },
    {
      id: "r2",
      heading: "Receiving Account",
      bodyText:
        "Transferred to Project Ops Account: [ACC-9482-WON-OPS].",
      highlights: [{ id: "r2-h", text: "ACC-9482-WON-OPS" }],
    },
    {
      id: "r3",
      heading: "Transaction ID",
      bodyText:
        "Reference number: [TXN-WON-882941-TR].",
      highlights: [{ id: "r3-h", text: "TXN-WON-882941-TR" }],
    },
    {
      id: "r4",
      heading: "Receipts & Invoices",
      bodyText:
        "Please submit all vendor receipts in the Treasury tab [within 7 days](https://won.agency/invoices).",
      highlights: [{ id: "r4-h", text: "within 7 days", url: "https://won.agency/invoices" }],
    },
  ],
  calloutLinkText:
    "You can track transaction status anytime in the [WON Treasury Ledger](https://won.agency/treasury).",
  signoffGreeting: "Approved by,",
  signoffTeam: "WON Treasury & Finance Committee",
  footerCopyright: "© 2026 WON LLC",
  footerDisclaimer:
    "Official disbursement certificate. Audited and recorded under agency bylaws.",
  updatedAt: new Date().toISOString(),
};

const INITIAL_TREASURY_DOC: CustomDocument = {
  id: "doc-treasury-1",
  title: "Treasury Fund Requisition",
  category: "TREASURY",
  recipientName: "Treasury Custodian & Finance Committee",
  salutationPrefix: "To:",
  letterSubject: "",
  showTopLogo: true,
  watermarkType: "LOGO",
  watermarkText: "WON",
  watermarkOpacity: 5,
  density: "compact",
  leadStatement:
    "We are requesting funds from the agency treasury for project tools, server hosting, and equipment.",
  bullets: [
    {
      id: "t1",
      heading: "Requested Amount",
      bodyText:
        "Total requested: [$3,500.00 USD](https://won.agency/treasury) for upcoming sprint deliverables.",
      highlights: [{ id: "t1-h", text: "$3,500.00 USD", url: "https://won.agency/treasury" }],
    },
    {
      id: "t2",
      heading: "What It Covers",
      bodyText:
        "Cloud hosting servers, staging domains, and testing devices for upcoming releases.",
      highlights: [{ id: "t2-h", text: "staging domains" }],
    },
    {
      id: "t3",
      heading: "Receiving Account",
      bodyText:
        "Please transfer to [ACC-9482-WON-OPS] (Project Lead account).",
      highlights: [{ id: "t3-h", text: "ACC-9482-WON-OPS" }],
    },
    {
      id: "t4",
      heading: "Receipts",
      bodyText:
        "All receipts and invoices will be submitted [within 5 days](https://won.agency/receipts) of purchase.",
      highlights: [{ id: "t4-h", text: "within 5 days", url: "https://won.agency/receipts" }],
    },
  ],
  calloutLinkText:
    "This request is covered under our approved team budget.",
  signoffGreeting: "Submitted by,",
  signoffTeam: "Engineering Sprint Team",
  footerCopyright: "© 2026 WON LLC",
  footerDisclaimer:
    "Official treasury documentation. Governed by agency financial guidelines.",
  updatedAt: new Date().toISOString(),
};

const INITIAL_LETTER_DOC: CustomDocument = {
  id: "doc-letter-1",
  title: "Formal Agency Letter",
  category: "LETTER",
  recipientName: "Lead Project Contributor",
  salutationPrefix: "Dear",
  letterSubject: "Appointment as Lead Technical Contributor & Milestone Scope",
  showTopLogo: true,
  watermarkType: "LOGO",
  watermarkText: "WON",
  watermarkOpacity: 5,
  density: "compact",
  leadStatement:
    "We are pleased to confirm your appointment and responsibilities for the upcoming agency sprint.",
  bullets: [
    {
      id: "l1",
      heading: "Role & Focus",
      bodyText:
        "You will lead technical planning, coordinate with clients, and guide team members.",
      highlights: [{ id: "l1-h", text: "technical planning" }],
    },
    {
      id: "l2",
      heading: "Key Milestones",
      bodyText:
        "First prototypes and core endpoints are scheduled for review on [December 15, 2026](https://won.agency/milestones).",
      highlights: [{ id: "l2-h", text: "December 15, 2026", url: "https://won.agency/milestones" }],
    },
    {
      id: "l3",
      heading: "Workspace Access",
      bodyText:
        "Full credentials for studio labs and cloud environments have been activated.",
      highlights: [{ id: "l3-h", text: "Full credentials" }],
    },
  ],
  calloutLinkText:
    "Please confirm your acceptance by replying to this letter.",
  signoffGreeting: "Sincerely,",
  signoffTeam: "WON Directorate & Studio Council",
  footerCopyright: "© 2026 WON LLC",
  footerDisclaimer:
    "WON Agency • Official Correspondence",
  updatedAt: new Date().toISOString(),
};

const INITIAL_CHANGELOG_DOC: CustomDocument = {
  id: "doc-changelog-1",
  title: "Service & Milestone Changelog",
  category: "CHANGELOG",
  recipientName: "All Studio Members",
  salutationPrefix: "To:",
  letterSubject: "",
  showTopLogo: true,
  watermarkType: "LOGO",
  watermarkText: "WON",
  watermarkOpacity: 5,
  density: "compact",
  leadStatement:
    "We’re updating agency workflow settings and session protocols to make collaboration easier for everyone. We’ll roll out these improvements in the coming weeks.",
  bullets: [
    {
      id: "b1",
      heading: "What’s changing",
      bodyText:
        "You will now have access to [real-time milestone tracking](https://won.agency/projects) and instant Spark token verification.",
      highlights: [{ id: "b1-h", text: "real-time milestone tracking", url: "https://won.agency/projects" }],
    },
    {
      id: "b2",
      heading: "How this affects you",
      bodyText:
        "All active projects, credentials, and passes will [update automatically](https://won.agency/settings) with zero downtime.",
      highlights: [{ id: "b2-h", text: "update automatically", url: "https://won.agency/settings" }],
    },
    {
      id: "b3",
      heading: "What’s not changing",
      bodyText:
        "Your notification preferences and saved sprint records will stay as they are.",
      highlights: [{ id: "b3-h", text: "saved sprint records" }],
    },
  ],
  calloutLinkText:
    "Learn more in the [WON Agency Guidelines](https://won.agency/guidelines) and the [Help Center](https://won.agency/help).",
  signoffGreeting: "Sincerely,",
  signoffTeam: "The WON Team",
  footerCopyright: "© 2026 WON LLC",
  footerDisclaimer:
    "You have received this service announcement to update you about changes to WON.",
  updatedAt: new Date().toISOString(),
};

export const DocsModule: React.FC<DocsModuleProps> = ({ user }) => {
  // Navigation: false = Editor/Canvas, true = All Documents Library view
  const [showLibrary, setShowLibrary] = useState(false);
  const [searchLibraryQuery, setSearchLibraryQuery] = useState("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  // Current editing document fields
  const [docTitle, setDocTitle] = useState("Agency Notice");
  const [docCategory, setDocCategory] = useState<CustomDocument["category"]>("NOTICE");
  const [recipientName, setRecipientName] = useState("All Studio Members & Project Leads");
  const [salutationPrefix, setSalutationPrefix] = useState<CustomDocument["salutationPrefix"]>("To:");
  const [letterSubject, setLetterSubject] = useState("");
  const [showTopLogo, setShowTopLogo] = useState(true);
  const [watermarkType, setWatermarkType] = useState<"NONE" | "LOGO" | "TEXT">("LOGO");
  const [watermarkText, setWatermarkText] = useState("WON");
  const [watermarkOpacity, setWatermarkOpacity] = useState(5); // 5%
  const [layoutScale, setLayoutScale] = useState<"auto" | "executive" | "standard" | "compact">("auto");
  const [density, setDensity] = useState<"compact" | "standard">("compact");

  const [leadStatement, setLeadStatement] = useState(
    "Here are important updates on our studio schedules and session guidelines starting this week."
  );
  const [bullets, setBullets] = useState<DocBullet[]>([
    {
      id: "n1",
      heading: "Start Date",
      bodyText:
        "These updates go live on [Monday, November 30, 2026] across all project teams.",
      highlights: [{ id: "h1", text: "Monday, November 30, 2026" }],
    },
    {
      id: "n2",
      heading: "Studio Lab Hours",
      bodyText:
        "Lab spaces and remote workstations remain open until [22:00 IST](https://won.agency/schedule) for sprint teams.",
      highlights: [{ id: "h2", text: "22:00 IST", url: "https://won.agency/schedule" }],
    },
    {
      id: "n3",
      heading: "Attendance Check-in",
      bodyText:
        "Please record your session check-in [within 15 minutes](https://won.agency/attendance) of start time to earn daily Spark rewards.",
      highlights: [{ id: "h3", text: "within 15 minutes", url: "https://won.agency/attendance" }],
    },
  ]);

  const [calloutLinkText, setCalloutLinkText] = useState(
    "Questions or scheduling adjustments? Review the [WON Agency Guidelines](https://won.agency/guidelines) or reach out to operations."
  );
  const [signoffGreeting, setSignoffGreeting] = useState("Best regards,");
  const [signoffTeam, setSignoffTeam] = useState("WON Operations Team");
  const [footerCopyright, setFooterCopyright] = useState("© 2026 WON LLC");
  const [footerDisclaimer, setFooterDisclaimer] = useState(
    "Official agency announcement. Applies to all active studio participants."
  );

  // Dynamic Content-Aware Auto Scaling (Like MNC Executive Memos)
  const effectiveScale = useMemo(() => {
    if (layoutScale !== "auto") return layoutScale;
    const totalChars =
      (leadStatement?.length || 0) +
      bullets.reduce((acc, b) => acc + (b.heading?.length || 0) + (b.bodyText?.length || 0), 0) +
      (calloutLinkText?.length || 0);

    // If document is short (< 4 bullets, under 500 chars), scale up to Executive so it fills the page with authority!
    if (bullets.length <= 3 && totalChars < 500) {
      return "executive";
    }
    if (bullets.length <= 5 && totalChars < 900) {
      return "standard";
    }
    return "compact";
  }, [layoutScale, leadStatement, bullets, calloutLinkText]);

  // View mode: 'split' | 'editor' | 'preview'
  const [viewMode, setViewMode] = useState<"split" | "editor" | "preview">("split");
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeDocId, setActiveDocId] = useState<string | null>("doc-notice-1");

  // Per-bullet new highlight/link input state
  const [newHlText, setNewHlText] = useState<Record<string, string>>({});
  const [newHlUrl, setNewHlUrl] = useState<Record<string, string>>({});

  // Mini Link/Highlight inserter modal
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    targetField: "lead" | "callout" | string; // 'bullet-<id>'
  } | null>(null);
  const [modalInputText, setModalInputText] = useState("");
  const [modalInputUrl, setModalInputUrl] = useState("");

  // Optional Send / Mail Notice State
  const [showSendModal, setShowSendModal] = useState(false);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [customEmailInput, setCustomEmailInput] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("ALL");
  const [sendDeliveryMethod, setSendDeliveryMethod] = useState<{ email: boolean; feed: boolean }>({
    email: true,
    feed: true,
  });
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Fetch team members for emailing/dispatch
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setLoadingMembers(true);
        const list = await usersApi.getAll();
        if (isMounted) {
          setTeamMembers(list);
          const validEmails = list.map((u) => u.email).filter(Boolean);
          setSelectedEmails(validEmails);
        }
      } catch (e) {
        console.error("Failed to load users for dispatch:", e);
      } finally {
        if (isMounted) setLoadingMembers(false);
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered emails based on department
  useEffect(() => {
    if (selectedDeptFilter === "ALL") {
      const allEmails = teamMembers.map((u) => u.email).filter(Boolean);
      setSelectedEmails(allEmails);
    } else {
      const filtered = teamMembers
        .filter((u) => u.department?.toLowerCase() === selectedDeptFilter.toLowerCase())
        .map((u) => u.email)
        .filter(Boolean);
      setSelectedEmails(filtered);
    }
  }, [selectedDeptFilter, teamMembers]);

  // Saved documents library (scoped per user + synced with cloud shared docs)
  const storageKey = `won_custom_docs_v8_${user?.id || user?.email || "guest"}`;
  const [savedDocs, setSavedDocs] = useState<CustomDocument[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Load docs created by or explicitly shared via email with this user
  useEffect(() => {
    if (!user?.email && !user?.id) return;
    const emailParam = encodeURIComponent((user?.email || "").trim().toLowerCase());
    const userIdParam = encodeURIComponent(user?.id || "");
    fetch(`${API_BASE_URL}/documents?email=${emailParam}&userId=${userIdParam}&docType=STUDIO`)
      .then((r) => (r.ok ? r.json() : []))
      .then((cloudDocs: any[]) => {
        if (!Array.isArray(cloudDocs) || cloudDocs.length === 0) return;
        const parsedCloud: CustomDocument[] = cloudDocs
          .map((d) => {
            try {
              return d.payloadJson ? (JSON.parse(d.payloadJson) as CustomDocument) : null;
            } catch {
              return null;
            }
          })
          .filter((x): x is CustomDocument => Boolean(x && x.id));
        if (parsedCloud.length > 0) {
          setSavedDocs((prev) => {
            const byId = new Map(prev.map((doc) => [doc.id, doc]));
            parsedCloud.forEach((doc) => {
              if (!byId.has(doc.id)) byId.set(doc.id, doc);
            });
            return Array.from(byId.values());
          });
        }
      })
      .catch(() => {});
  }, [user?.id, user?.email]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedDocs));
    } catch (e) {
      console.error(e);
    }
  }, [savedDocs, storageKey]);

  // Bullet Handlers
  const handleAddBullet = (headingDefault = "", bodyDefault = "") => {
    setBullets((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        heading: headingDefault,
        bodyText: bodyDefault,
        highlights: [],
      },
    ]);
  };

  const handleUpdateBullet = (id: string, field: keyof DocBullet, value: any) => {
    setBullets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleRemoveBullet = (id: string) => {
    setBullets((prev) => prev.filter((b) => b.id !== id));
  };

  // Multiple Highlights & Links Handler
  const handleAddHighlightToBullet = (bulletId: string) => {
    const text = (newHlText[bulletId] || "").trim();
    const rawUrl = (newHlUrl[bulletId] || "").trim();
    if (!text) return;

    const normalized = rawUrl ? normalizeUrl(rawUrl) : undefined;

    setBullets((prev) =>
      prev.map((b) => {
        if (b.id !== bulletId) return b;
        const currentHls = b.highlights || [];
        return {
          ...b,
          highlights: [
            ...currentHls,
            { id: `hl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, text, url: normalized },
          ],
        };
      })
    );

    setNewHlText((prev) => ({ ...prev, [bulletId]: "" }));
    setNewHlUrl((prev) => ({ ...prev, [bulletId]: "" }));
  };

  const handleRemoveHighlightFromBullet = (bulletId: string, highlightId: string) => {
    setBullets((prev) =>
      prev.map((b) => {
        if (b.id !== bulletId) return b;
        return {
          ...b,
          highlights: (b.highlights || []).filter((h) => h.id !== highlightId),
        };
      })
    );
  };

  // Open Link Inserter Modal
  const handleOpenLinkModal = (targetField: "lead" | "callout" | string) => {
    setLinkModal({ isOpen: true, targetField });
    setModalInputText("");
    setModalInputUrl("");
  };

  const handleConfirmInsertLink = () => {
    if (!linkModal || !modalInputText.trim()) {
      setLinkModal(null);
      return;
    }

    const cleanUrl = modalInputUrl.trim() ? normalizeUrl(modalInputUrl.trim()) : "";
    const snippet = cleanUrl
      ? `[${modalInputText.trim()}](${cleanUrl})`
      : `[${modalInputText.trim()}]`;

    if (linkModal.targetField === "lead") {
      setLeadStatement((prev) => (prev ? `${prev} ${snippet}` : snippet));
    } else if (linkModal.targetField === "callout") {
      setCalloutLinkText((prev) => (prev ? `${prev} ${snippet}` : snippet));
    } else if (linkModal.targetField.startsWith("bullet-")) {
      const bId = linkModal.targetField.replace("bullet-", "");
      setBullets((prev) =>
        prev.map((b) =>
          b.id === bId ? { ...b, bodyText: b.bodyText ? `${b.bodyText} ${snippet}` : snippet } : b
        )
      );
    }

    setLinkModal(null);
  };

  // Reset / Blank Document
  const handleStartBlank = () => {
    setActiveDocId(null);
    setDocTitle("Untitled Document");
    setDocCategory("GENERAL");
    setRecipientName("");
    setSalutationPrefix("To:");
    setLetterSubject("");
    setShowTopLogo(true);
    setWatermarkType("NONE");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement("");
    setBullets([
      {
        id: `b-${Date.now()}`,
        heading: "",
        bodyText: "",
        highlights: [],
      },
    ]);
    setCalloutLinkText("");
    setSignoffGreeting("Sincerely,");
    setSignoffTeam("The WON Team");
    setFooterCopyright("© 2026 WON LLC");
    setFooterDisclaimer("");
    setShowTemplateDropdown(false);
  };

  // Template Loaders
  const handleLoadNotice = () => {
    setActiveDocId(null);
    setDocTitle(INITIAL_NOTICE_DOC.title);
    setDocCategory("NOTICE");
    setRecipientName(INITIAL_NOTICE_DOC.recipientName);
    setSalutationPrefix(INITIAL_NOTICE_DOC.salutationPrefix);
    setLetterSubject("");
    setShowTopLogo(true);
    setWatermarkType("LOGO");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement(INITIAL_NOTICE_DOC.leadStatement);
    setBullets(INITIAL_NOTICE_DOC.bullets);
    setCalloutLinkText(INITIAL_NOTICE_DOC.calloutLinkText);
    setSignoffGreeting(INITIAL_NOTICE_DOC.signoffGreeting);
    setSignoffTeam(INITIAL_NOTICE_DOC.signoffTeam);
    setFooterCopyright(INITIAL_NOTICE_DOC.footerCopyright);
    setFooterDisclaimer(INITIAL_NOTICE_DOC.footerDisclaimer);
    setShowTemplateDropdown(false);
  };

  const handleLoadFundRelease = () => {
    setActiveDocId(null);
    setDocTitle(INITIAL_FUND_RELEASE_DOC.title);
    setDocCategory("RELEASE");
    setRecipientName(INITIAL_FUND_RELEASE_DOC.recipientName);
    setSalutationPrefix(INITIAL_FUND_RELEASE_DOC.salutationPrefix);
    setLetterSubject(INITIAL_FUND_RELEASE_DOC.letterSubject || "");
    setShowTopLogo(true);
    setWatermarkType("LOGO");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement(INITIAL_FUND_RELEASE_DOC.leadStatement);
    setBullets(INITIAL_FUND_RELEASE_DOC.bullets);
    setCalloutLinkText(INITIAL_FUND_RELEASE_DOC.calloutLinkText);
    setSignoffGreeting(INITIAL_FUND_RELEASE_DOC.signoffGreeting);
    setSignoffTeam(INITIAL_FUND_RELEASE_DOC.signoffTeam);
    setFooterCopyright(INITIAL_FUND_RELEASE_DOC.footerCopyright);
    setFooterDisclaimer(INITIAL_FUND_RELEASE_DOC.footerDisclaimer);
    setShowTemplateDropdown(false);
  };

  const handleLoadAmountRequest = () => {
    setActiveDocId(null);
    setDocTitle(INITIAL_TREASURY_DOC.title);
    setDocCategory("TREASURY");
    setRecipientName(INITIAL_TREASURY_DOC.recipientName);
    setSalutationPrefix(INITIAL_TREASURY_DOC.salutationPrefix);
    setLetterSubject("");
    setShowTopLogo(true);
    setWatermarkType("LOGO");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement(INITIAL_TREASURY_DOC.leadStatement);
    setBullets(INITIAL_TREASURY_DOC.bullets);
    setCalloutLinkText(INITIAL_TREASURY_DOC.calloutLinkText);
    setSignoffGreeting(INITIAL_TREASURY_DOC.signoffGreeting);
    setSignoffTeam(INITIAL_TREASURY_DOC.signoffTeam);
    setFooterCopyright(INITIAL_TREASURY_DOC.footerCopyright);
    setFooterDisclaimer(INITIAL_TREASURY_DOC.footerDisclaimer);
    setShowTemplateDropdown(false);
  };

  const handleLoadFormalLetter = () => {
    setActiveDocId(null);
    setDocTitle(INITIAL_LETTER_DOC.title);
    setDocCategory("LETTER");
    setRecipientName(INITIAL_LETTER_DOC.recipientName);
    setSalutationPrefix(INITIAL_LETTER_DOC.salutationPrefix);
    setLetterSubject(INITIAL_LETTER_DOC.letterSubject || "");
    setShowTopLogo(true);
    setWatermarkType("LOGO");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement(INITIAL_LETTER_DOC.leadStatement);
    setBullets(INITIAL_LETTER_DOC.bullets);
    setCalloutLinkText(INITIAL_LETTER_DOC.calloutLinkText);
    setSignoffGreeting(INITIAL_LETTER_DOC.signoffGreeting);
    setSignoffTeam(INITIAL_LETTER_DOC.signoffTeam);
    setFooterCopyright(INITIAL_LETTER_DOC.footerCopyright);
    setFooterDisclaimer(INITIAL_LETTER_DOC.footerDisclaimer);
    setShowTemplateDropdown(false);
  };

  const handleLoadChangelog = () => {
    setActiveDocId(null);
    setDocTitle(INITIAL_CHANGELOG_DOC.title);
    setDocCategory("CHANGELOG");
    setRecipientName(INITIAL_CHANGELOG_DOC.recipientName);
    setSalutationPrefix(INITIAL_CHANGELOG_DOC.salutationPrefix);
    setLetterSubject("");
    setShowTopLogo(true);
    setWatermarkType("LOGO");
    setWatermarkOpacity(5);
    setDensity("compact");
    setLeadStatement(INITIAL_CHANGELOG_DOC.leadStatement);
    setBullets(INITIAL_CHANGELOG_DOC.bullets);
    setCalloutLinkText(INITIAL_CHANGELOG_DOC.calloutLinkText);
    setSignoffGreeting(INITIAL_CHANGELOG_DOC.signoffGreeting);
    setSignoffTeam(INITIAL_CHANGELOG_DOC.signoffTeam);
    setFooterCopyright(INITIAL_CHANGELOG_DOC.footerCopyright);
    setFooterDisclaimer(INITIAL_CHANGELOG_DOC.footerDisclaimer);
    setShowTemplateDropdown(false);
  };

  // Save Document to Library
  const handleSaveDoc = () => {
    const docData: CustomDocument = {
      id: activeDocId || `doc-${Date.now()}`,
      title: docTitle || "Untitled Document",
      category: docCategory,
      recipientName,
      salutationPrefix,
      letterSubject,
      showTopLogo,
      watermarkType,
      watermarkText,
      watermarkOpacity,
      layoutScale,
      density,
      leadStatement,
      bullets,
      calloutLinkText,
      signoffGreeting,
      signoffTeam,
      footerCopyright,
      footerDisclaimer,
      updatedAt: new Date().toISOString(),
    };

    if (activeDocId) {
      setSavedDocs((prev) => prev.map((d) => (d.id === activeDocId ? docData : d)));
    } else {
      setSavedDocs((prev) => [docData, ...prev]);
      setActiveDocId(docData.id);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Load a Saved Document from Library
  const handleOpenSaved = (doc: CustomDocument) => {
    setActiveDocId(doc.id);
    setDocTitle(doc.title);
    setDocCategory(doc.category || "GENERAL");
    setRecipientName(doc.recipientName);
    setSalutationPrefix(doc.salutationPrefix || "To:");
    setLetterSubject(doc.letterSubject || "");
    setShowTopLogo(doc.showTopLogo ?? true);
    setWatermarkType(doc.watermarkType || "NONE");
    setWatermarkText(doc.watermarkText || "WON");
    setWatermarkOpacity(doc.watermarkOpacity || 5);
    setLayoutScale(doc.layoutScale || "auto");
    setDensity(doc.density || "compact");
    setLeadStatement(doc.leadStatement);
    setBullets(doc.bullets || []);
    setCalloutLinkText(doc.calloutLinkText || "");
    setSignoffGreeting(doc.signoffGreeting || "Sincerely,");
    setSignoffTeam(doc.signoffTeam || "The WON Team");
    setFooterCopyright(doc.footerCopyright || "© 2026 WON LLC");
    setFooterDisclaimer(doc.footerDisclaimer || "");
    setShowLibrary(false);
  };

  const handleDeleteSaved = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this document from your library?")) {
      setSavedDocs((prev) => prev.filter((d) => d.id !== id));
      if (activeDocId === id) {
        handleStartBlank();
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const salutation = formatSalutation(salutationPrefix, recipientName);
    const text = `
${salutation ? `${salutation}` : ""}
${letterSubject ? `\nSubject: ${letterSubject}\n` : ""}
${leadStatement}

${bullets
  .map(
    (b) =>
      `• ${b.heading ? `${b.heading}: ` : ""}${b.bodyText.replace(/\[([^\]]+)\](?:\(([^)]+)\))?/g, "$1")}`
  )
  .join("\n")}

${calloutLinkText ? `${calloutLinkText.replace(/\[([^\]]+)\](?:\(([^)]+)\))?/g, "$1")}\n` : ""}
${signoffGreeting}
${signoffTeam}

${footerCopyright}
${footerDisclaimer}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Dispatch / Mailing Handlers
  const handleAddCustomEmail = () => {
    const trimmed = customEmailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return;
    if (!selectedEmails.includes(trimmed)) {
      setSelectedEmails((prev) => [...prev, trimmed]);
    }
    setCustomEmailInput("");
  };

  const handleRemoveEmail = (email: string) => {
    setSelectedEmails((prev) => prev.filter((e) => e !== email));
  };

  const generateEmailSubject = () => {
    return `[WON Official Notice] ${docTitle || "Official Directive"}`;
  };

  const generateEmailBody = () => {
    const salutation = formatSalutation(salutationPrefix, recipientName);
    return `
${salutation ? `${salutation}` : ""}

${letterSubject ? `SUBJECT: ${letterSubject}\n` : ""}${leadStatement}

${bullets
  .map(
    (b) =>
      `• ${b.heading ? `${b.heading}: ` : ""}${b.bodyText.replace(/\[([^\]]+)\](?:\(([^)]+)\))?/g, "$1")}`
  )
  .join("\n")}

${calloutLinkText ? `${calloutLinkText.replace(/\[([^\]]+)\](?:\(([^)]+)\))?/g, "$1")}\n` : ""}${signoffGreeting}
${signoffTeam}

━━━━━━━━━━━━━━━━━━━━━━━━━━━
${footerCopyright || "© 2026 WON LLC"} • Agency Operations
${footerDisclaimer || "Official agency notice. Compliance required."}
    `.trim();
  };

  const handleOpenMailClient = () => {
    const subject = encodeURIComponent(generateEmailSubject());
    const body = encodeURIComponent(generateEmailBody());
    const bcc = encodeURIComponent(selectedEmails.join(","));
    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`;
    window.open(mailtoUrl, "_blank");
  };

  const handleDispatchNotice = async () => {
    try {
      setIsDispatching(true);
      setDispatchStatus("Preparing notice broadcast...");

      let emailSuccess = false;
      let feedSuccess = false;
      let emailError: string | null = null;

      // 1. Send via Resend Email API
      if (sendDeliveryMethod.email && selectedEmails.length > 0) {
        setDispatchStatus(`Sending emails to ${selectedEmails.length} recipients...`);
        const emailRes = await noticesApi.sendEmail({
          toEmails: selectedEmails,
          title: docTitle || "Agency Notice",
          salutation: formatSalutation(salutationPrefix, recipientName),
          subject: letterSubject || docTitle,
          leadStatement,
          bullets: bullets.map((b) => ({
            heading: b.heading,
            bodyText: b.bodyText,
          })),
          calloutLinkText,
          signoffGreeting,
          signoffTeam,
          footerCopyright,
          footerDisclaimer,
        });

        if (emailRes.success) {
          emailSuccess = true;
        } else {
          emailError = emailRes.error || "Email delivery failed";
        }
      }

      // 2. Publish to backend notice board feed
      if (sendDeliveryMethod.feed) {
        setDispatchStatus("Publishing notice to agency portal feed...");
        await noticesApi.publish({
          title: docTitle || "Official Agency Directive",
          content: generateEmailBody(),
          authorityName: user?.name || "WON Directorate",
          authorityRole: "Operations Oversight",
        });
        feedSuccess = true;
      }

      if (emailSuccess) {
        // Persist shared studio doc in MongoDB so only creator + email recipients see it in Docs Library
        const sharedDocId = activeDocId || `studio-${Date.now()}`;
        const sharedPayload: CustomDocument = {
          id: sharedDocId,
          title: docTitle || "Shared Notice",
          recipientName,
          salutationPrefix,
          letterSubject,
          leadStatement,
          bullets,
          calloutLinkText,
          signoffGreeting,
          signoffTeam,
          footerCopyright,
          footerDisclaimer,
          showTopLogo,
          watermarkType,
          watermarkText,
          watermarkOpacity,
          updatedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        };
        fetch(`${API_BASE_URL}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: sharedPayload.title,
            category: "Studio Doc",
            fileUrl: "#studio-doc",
            docType: "STUDIO",
            createdById: user?.id || "",
            createdByEmail: user?.email || "",
            sharedWithEmails: selectedEmails,
            payloadJson: JSON.stringify(sharedPayload),
          }),
        }).catch(() => {});
      }

      if (emailError) {
        setDispatchStatus(
          feedSuccess
            ? `⚠ Live feed updated, but email failed: ${emailError}`
            : `Email error: ${emailError}`
        );
        setTimeout(() => {
          setIsDispatching(false);
        }, 4000);
      } else if (emailSuccess && feedSuccess) {
        setDispatchStatus(`✓ Dispatched to ${selectedEmails.length} recipients & posted to live feed!`);
        setTimeout(() => {
          setIsDispatching(false);
          setDispatchStatus(null);
          setShowSendModal(false);
        }, 2200);
      } else if (emailSuccess) {
        setDispatchStatus(`✓ Successfully dispatched to ${selectedEmails.length} recipients!`);
        setTimeout(() => {
          setIsDispatching(false);
          setDispatchStatus(null);
          setShowSendModal(false);
        }, 2200);
      } else if (feedSuccess) {
        setDispatchStatus("✓ Published to agency portal live feed!");
        setTimeout(() => {
          setIsDispatching(false);
          setDispatchStatus(null);
          setShowSendModal(false);
        }, 1800);
      } else {
        setDispatchStatus("✓ Notice processed successfully!");
        setTimeout(() => {
          setIsDispatching(false);
          setDispatchStatus(null);
          setShowSendModal(false);
        }, 1500);
      }
    } catch (e: any) {
      console.error(e);
      setDispatchStatus(`Notice processing error: ${e?.message || "Please check configuration"}`);
      setTimeout(() => {
        setIsDispatching(false);
      }, 3000);
    }
  };

  // Filtered documents in library
  const filteredLibraryDocs = useMemo(() => {
    if (!searchLibraryQuery.trim()) return savedDocs;
    const q = searchLibraryQuery.toLowerCase();
    return savedDocs.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.recipientName.toLowerCase().includes(q) ||
        d.leadStatement.toLowerCase().includes(q)
    );
  }, [savedDocs, searchLibraryQuery]);

  return (
    <div className="w-full space-y-4">
      {/* =========================================================================
          PRINT STYLESHEET: PRINTS CLEAN WHITE DOCUMENT ONLY (NO BROWSER HEADERS/FOOTERS)
         ========================================================================= */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0mm; /* Wipes out default browser headers (date/title) and footers (localhost:3000 / 1/1) */
        }
        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #gemini-live-doc,
          #gemini-live-doc * {
            visibility: visible;
          }
          #gemini-live-doc {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }

          /* MNC AUTO-FIT SCALING: EXECUTIVE (FOR SHORT / MEDIUM NOTICES) */
          .scale-executive {
            padding: 24mm 24mm 20mm 24mm !important;
          }
          .scale-executive .doc-print-main {
            gap: 22px !important;
          }
          .scale-executive .doc-logo-img {
            height: 48px !important;
            margin-bottom: 6px !important;
          }
          .scale-executive .doc-salutation {
            font-size: 16pt !important;
            line-height: 1.35 !important;
          }
          .scale-executive .doc-subject {
            font-size: 11pt !important;
            padding-bottom: 6px !important;
          }
          .scale-executive .doc-lead-text {
            font-size: 12.5pt !important;
            line-height: 1.72 !important;
          }
          .scale-executive .doc-print-bullets {
            gap: 16px !important;
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .scale-executive .doc-bullet-item {
            font-size: 12pt !important;
            line-height: 1.7 !important;
            gap: 12px !important;
          }
          .scale-executive .doc-callout-text {
            font-size: 12pt !important;
            line-height: 1.7 !important;
          }
          .scale-executive .doc-signoff {
            padding-top: 24px !important;
            font-size: 12pt !important;
            line-height: 1.5 !important;
          }
          .scale-executive .doc-print-footer {
            margin-top: 38px !important;
            padding-top: 18px !important;
            border-top: 1px solid #e2e8f0 !important;
          }

          /* MNC AUTO-FIT SCALING: STANDARD (FOR BALANCED NOTICES) */
          .scale-standard {
            padding: 20mm 22mm 16mm 22mm !important;
          }
          .scale-standard .doc-print-main {
            gap: 16px !important;
          }
          .scale-standard .doc-logo-img {
            height: 40px !important;
          }
          .scale-standard .doc-salutation {
            font-size: 14pt !important;
          }
          .scale-standard .doc-lead-text {
            font-size: 11pt !important;
            line-height: 1.62 !important;
          }
          .scale-standard .doc-print-bullets {
            gap: 12px !important;
          }
          .scale-standard .doc-bullet-item {
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          .scale-standard .doc-callout-text {
            font-size: 11pt !important;
            line-height: 1.6 !important;
          }
          .scale-standard .doc-signoff {
            padding-top: 18px !important;
            font-size: 11pt !important;
          }
          .scale-standard .doc-print-footer {
            margin-top: 28px !important;
            padding-top: 14px !important;
            border-top: 1px solid #e2e8f0 !important;
          }

          /* MNC AUTO-FIT SCALING: COMPACT (FOR DENSE / MANY-POINT NOTICES) */
          .scale-compact {
            padding: 16mm 18mm 14mm 18mm !important;
          }
          .scale-compact .doc-print-main {
            gap: 12px !important;
          }
          .scale-compact .doc-logo-img {
            height: 34px !important;
          }
          .scale-compact .doc-salutation {
            font-size: 12.5pt !important;
          }
          .scale-compact .doc-lead-text {
            font-size: 10pt !important;
            line-height: 1.5 !important;
          }
          .scale-compact .doc-print-bullets {
            gap: 9px !important;
          }
          .scale-compact .doc-bullet-item {
            font-size: 10pt !important;
            line-height: 1.5 !important;
          }
          .scale-compact .doc-callout-text {
            font-size: 10pt !important;
            line-height: 1.5 !important;
          }
          .scale-compact .doc-signoff {
            padding-top: 14px !important;
            font-size: 10pt !important;
          }
          .scale-compact .doc-print-footer {
            margin-top: 20px !important;
            padding-top: 12px !important;
            border-top: 1px solid #e2e8f0 !important;
          }
        }
      `}</style>

      {/* =========================================================================
          MINI LINK & HIGHLIGHT INSERTION MODAL
         ========================================================================= */}
      {linkModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 max-w-md w-full space-y-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-50 text-[#1a73e8] flex items-center justify-center">
                  <LinkIcon className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Add Blue Highlight or Link</h4>
                  <p className="text-[10px] text-slate-500">Insert custom blue text or a clickable link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLinkModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Text to Display (in Google Blue)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={modalInputText}
                  onChange={(e) => setModalInputText(e.target.value)}
                  placeholder="e.g. Monday, November 30 / Guidelines"
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={modalInputUrl}
                  onChange={(e) => setModalInputUrl(e.target.value)}
                  placeholder="e.g. https://won.agency/schedule or /attendance"
                  className="w-full text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#087FC4]"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Leave blank to add as blue highlight text without a link.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLinkModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInsertLink}
                disabled={!modalInputText.trim()}
                className="px-4 py-1.5 rounded-xl bg-[#087FC4] hover:bg-[#066AA8] disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Insert Blue Text
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SEND / MAIL NOTICE TO MEMBERS DIALOG MODAL (OPTIONAL)
         ========================================================================= */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-5 sm:p-6 max-w-lg w-full space-y-4 animate-in fade-in-0 zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-2xl bg-sky-50 text-[#087FC4] flex items-center justify-center shadow-2xs">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Send Notice to Members</span>
                    <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Directly dispatch this notice to members’ email and publish to the agency feed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSendModal(false);
                  setDispatchStatus(null);
                }}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Message (If Dispatched) */}
            {dispatchStatus && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{dispatchStatus}</span>
              </div>
            )}

            {/* Audience Filter & Recipient Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  RECIPIENTS ({selectedEmails.length} Selected)
                </label>
                <div className="flex items-center gap-1">
                  {(["ALL", "Engineering", "Design", "Operations"] as const).map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedDeptFilter(dept)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                        selectedDeptFilter === dept
                          ? "bg-[#087FC4] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Pills list */}
              <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl max-h-28 overflow-y-auto space-y-1">
                {selectedEmails.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No recipients selected</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] shadow-2xs"
                      >
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Add Custom Email */}
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  value={customEmailInput}
                  onChange={(e) => setCustomEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomEmail();
                    }
                  }}
                  placeholder="Add another member email (e.g. lead@won.agency)..."
                  className="flex-1 text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#087FC4]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomEmail}
                  disabled={!customEmailInput.includes("@")}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Delivery Methods */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                DELIVERY CHANNELS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendDeliveryMethod.email}
                    onChange={(e) =>
                      setSendDeliveryMethod((prev) => ({ ...prev, email: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#087FC4] rounded-md mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Direct Member Mail</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                        Email
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500">Dispatch HTML email to all selected recipients</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendDeliveryMethod.feed}
                    onChange={(e) =>
                      setSendDeliveryMethod((prev) => ({ ...prev, feed: e.target.checked }))
                    }
                    className="w-4 h-4 text-[#087FC4] rounded-md mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Agency Notice Feed</span>
                    <span className="text-[10px] text-slate-500">Post notice live to all member portals</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Email Preview */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                EMAIL PREVIEW
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono text-slate-700 space-y-1.5 max-h-32 overflow-y-auto whitespace-pre-wrap select-all">
                <p className="font-semibold text-slate-900 border-b border-slate-200 pb-1">
                  Subject: {generateEmailSubject()}
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {generateEmailBody()}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenMailClient}
                disabled={selectedEmails.length === 0}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="Open your desktop email client (Gmail, Outlook) pre-filled with all recipients"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#087FC4]" />
                <span>Open in Mail App (Mailto)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-600 hover:bg-slate-100 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchNotice}
                  disabled={isDispatching || selectedEmails.length === 0}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isDispatching ? "Broadcasting..." : "Dispatch to Members"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW A: ALL DOCUMENTS LIBRARY SCREEN
         ========================================================================= */}
      {showLibrary ? (
        <div className="space-y-6">
          {/* Top Library Navigation Bar */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_12px_rgba(16,28,52,0.03)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLibrary(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Document Editor</span>
              </button>

              <span className="text-xs font-bold text-slate-800">
                All Documents ({savedDocs.length})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleStartBlank();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Blank</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLoadNotice();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#087FC4] hover:bg-sky-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Notice
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLoadFundRelease();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Fund Release
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLoadAmountRequest();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Requisition
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLoadFormalLetter();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Letter
              </button>

              <button
                type="button"
                onClick={() => {
                  handleLoadChangelog();
                  setShowLibrary(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#087FC4] hover:bg-sky-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Changelog
              </button>
            </div>
          </div>

          {/* Library Templates Shelf */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs text-slate-600 uppercase tracking-wider px-1">
              Start with a Plain-English Template
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Template 1: Notice */}
              <div
                onClick={() => {
                  handleLoadNotice();
                  setShowLibrary(false);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-[#087FC4] hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#087FC4] flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold text-[#087FC4] bg-sky-50 px-2 py-0.5 rounded-md">
                      NOTICE
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-[#087FC4]">
                    Official Notice
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Clean team announcements, dates, lab hours, and check-in guidelines.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#087FC4] group-hover:underline">
                  Use Notice Template →
                </span>
              </div>

              {/* Template 2: Fund Release */}
              <div
                onClick={() => {
                  handleLoadFundRelease();
                  setShowLibrary(false);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <BadgeDollarSign className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      DISBURSEMENT
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-emerald-600">
                    Fund Release
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Disbursement confirmation with amount, account ref, and receipts policy.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 group-hover:underline">
                  Use Release Template →
                </span>
              </div>

              {/* Template 3: Amount Request */}
              <div
                onClick={() => {
                  handleLoadAmountRequest();
                  setShowLibrary(false);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Coins className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      REQUISITION
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-amber-600">
                    Amount Request
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Treasury budget request for tools, servers, and hardware.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-amber-600 group-hover:underline">
                  Use Requisition Template →
                </span>
              </div>

              {/* Template 4: Formal Letter */}
              <div
                onClick={() => {
                  handleLoadFormalLetter();
                  setShowLibrary(false);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      LETTER
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-indigo-600">
                    Formal Letter
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Appointment letter with Subject line, terms, and formal sign-off.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-indigo-600 group-hover:underline">
                  Use Letter Template →
                </span>
              </div>

              {/* Template 5: Changelog */}
              <div
                onClick={() => {
                  handleLoadChangelog();
                  setShowLibrary(false);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-sky-500 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-8 h-8 rounded-xl bg-sky-50 text-[#087FC4] flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-bold text-[#087FC4] bg-sky-50 px-2 py-0.5 rounded-md">
                      CHANGELOG
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-900 group-hover:text-[#087FC4]">
                    Changelog
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Gemini format with What’s changing, How it affects you, and blue links.
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#087FC4] group-hover:underline">
                  Use Changelog Template →
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar & Library Documents Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between gap-4 px-1">
              <h3 className="font-semibold text-xs text-slate-600 uppercase tracking-wider">
                Saved Documents ({filteredLibraryDocs.length})
              </h3>
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchLibraryQuery}
                  onChange={(e) => setSearchLibraryQuery(e.target.value)}
                  placeholder="Search saved documents..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#087FC4]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLibraryDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleOpenSaved(doc)}
                  className={`bg-white rounded-2xl border p-4 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    activeDocId === doc.id
                      ? "border-[#087FC4] ring-2 ring-[#087FC4]/15"
                      : "border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {doc.category || "GENERAL"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#087FC4] transition-colors line-clamp-1">
                      {doc.title}
                    </h4>

                    {doc.recipientName && (
                      <p className="text-xs text-slate-600 font-medium line-clamp-1">
                        {formatSalutation(doc.salutationPrefix, doc.recipientName)}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {doc.leadStatement}
                    </p>

                    <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{doc.bullets?.length || 0} bullets</span>
                      <span>•</span>
                      <span>{doc.watermarkType === "NONE" ? "No watermark" : `${doc.watermarkType} watermark`}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[#087FC4] font-semibold flex items-center gap-1 group-hover:underline">
                      <span>Open in Editor</span>
                      <span>→</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSaved(doc.id, e)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW B: DOCUMENT EDITOR & REALTIME PREVIEW CANVAS
           ========================================================================= */
        <div className="space-y-4">
          {/* Top Action Bar with "All Documents" Back Navigation */}
          <div className="no-print bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-[0_2px_12px_rgba(16,28,52,0.03)] flex flex-wrap items-center justify-between gap-3">
            {/* Left: All Documents Back Button + Doc Title Input */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLibrary(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                title="View all saved documents"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Documents</span>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded-md border border-slate-200">
                  {savedDocs.length}
                </span>
              </button>

              <div className="h-5 w-px bg-slate-200 hidden sm:block" />

              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Document Title"
                className="text-sm font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#087FC4] focus:outline-none transition-all px-1 py-0.5"
              />
            </div>

            {/* Right: View Toggles, Density & Fast Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* MNC Page Scale / Auto-Fit Selector */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 hidden md:inline">Scale:</span>
                {(
                  [
                    { key: "auto", label: "✨ Auto-Fit" },
                    { key: "executive", label: "Executive" },
                    { key: "standard", label: "Standard" },
                    { key: "compact", label: "Compact" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setLayoutScale(item.key)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      layoutScale === item.key
                        ? "bg-white text-[#087FC4] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    title={
                      item.key === "auto"
                        ? `Auto-Fit active: Currently scaling as ${effectiveScale}`
                        : `${item.label} scale`
                    }
                  >
                    <span>{item.label}</span>
                    {item.key === "auto" && (
                      <span className="text-[9px] text-[#087FC4]/80 uppercase ml-1 hidden lg:inline">
                        ({effectiveScale})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Segmented View Mode */}
              <div className="inline-flex p-1 bg-slate-100/80 border border-slate-200/60 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode("editor")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "editor"
                      ? "bg-white text-[#087FC4] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor Only</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "split"
                      ? "bg-white text-[#087FC4] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Split Realtime</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === "preview"
                      ? "bg-white text-[#087FC4] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Document Only</span>
                </button>
              </div>

              {/* Templates Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplateDropdown((prev) => !prev)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#087FC4]" />
                  <span>Templates</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showTemplateDropdown && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/80 p-1.5 z-50 space-y-1 animate-in fade-in-0 duration-100">
                    <button
                      type="button"
                      onClick={handleLoadNotice}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-[#087FC4]" />
                      <div>
                        <p className="font-semibold">Official Notice</p>
                        <p className="text-[10px] text-slate-400">Team announcement & schedule memo</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadFundRelease}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                    >
                      <BadgeDollarSign className="w-4 h-4 text-emerald-600" />
                      <div>
                        <p className="font-semibold">Fund Release</p>
                        <p className="text-[10px] text-slate-400">Budget disbursement confirmation</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadAmountRequest}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                    >
                      <Coins className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="font-semibold">Amount Request</p>
                        <p className="text-[10px] text-slate-400">Treasury equipment & fund request</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadFormalLetter}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-indigo-600" />
                      <div>
                        <p className="font-semibold">Formal Letter</p>
                        <p className="text-[10px] text-slate-400">Official letterhead with Subject line</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleLoadChangelog}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-800 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-sky-600" />
                      <div>
                        <p className="font-semibold">Changelog</p>
                        <p className="text-[10px] text-slate-400">Gemini service & milestone update</p>
                      </div>
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      type="button"
                      onClick={handleStartBlank}
                      className="w-full text-left px-3 py-1.5 rounded-xl text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600 transition-colors cursor-pointer"
                    >
                      <FilePlus className="w-3.5 h-3.5 text-slate-400" />
                      <span>Start Blank Document</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Copy, Save, Print */}
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copySuccess ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveDoc}
                className="px-4 py-1.5 rounded-xl bg-[#087FC4] hover:bg-[#066AA8] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saveSuccess ? "Saved!" : "Save"}</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              {/* Optional Send / Mail Notice to Members Button */}
              <button
                type="button"
                onClick={() => {
                  setShowSendModal(true);
                  setDispatchStatus(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Optionally email or broadcast this notice to members"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Notice</span>
              </button>
            </div>
          </div>

          {/* Main Layout: Editor & Real-time Canvas */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* =======================================================================
                LEFT COLUMN: THE EDITING SCREEN (ACTIVE FIRST)
               ======================================================================= */}
            {(viewMode === "editor" || viewMode === "split") && (
              <div
                className={`no-print bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_12px_rgba(16,28,52,0.03)] space-y-5 ${
                  viewMode === "editor" ? "lg:col-span-12 max-w-4xl mx-auto w-full" : "lg:col-span-6"
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">Document Editor</h3>
                    <p className="text-[11px] text-slate-500">
                      Edit text or add blue links. Changes render live in the preview.
                    </p>
                  </div>

                  {/* Fast Template Quick Bar */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={handleLoadNotice}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 text-[#087FC4] text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Notice
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadFundRelease}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-emerald-50 text-emerald-700 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Fund Release
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadAmountRequest}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-amber-50 text-amber-700 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Requisition
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadFormalLetter}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 text-indigo-700 text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Letter
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadChangelog}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 text-[#087FC4] text-[10px] font-semibold transition-colors cursor-pointer"
                    >
                      Changelog
                    </button>
                  </div>
                </div>

                {/* HEADER & WATERMARK CONTROLS */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Header & Watermark Controls
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Top Logo Toggle */}
                    <div className="flex items-center justify-between p-2.5 bg-white border border-slate-200/70 rounded-xl">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 block">Top Agency Logo</label>
                        <span className="text-[10px] text-slate-500">Centered WON logo at top</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showTopLogo}
                        onChange={(e) => setShowTopLogo(e.target.checked)}
                        className="w-4 h-4 text-[#087FC4] rounded-md cursor-pointer"
                      />
                    </div>

                    {/* Watermark Selector */}
                    <div className="p-2.5 bg-white border border-slate-200/70 rounded-xl space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 block">Background Watermark</label>
                      <select
                        value={watermarkType}
                        onChange={(e) => setWatermarkType(e.target.value as any)}
                        className="w-full text-xs py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#087FC4]"
                      >
                        <option value="NONE">No Watermark (Clean White)</option>
                        <option value="LOGO">Agency Logo Watermark</option>
                        <option value="TEXT">Custom Text Watermark</option>
                      </select>
                    </div>
                  </div>

                  {/* Watermark Options */}
                  {watermarkType !== "NONE" && (
                    <div className="p-3 bg-white border border-slate-200/70 rounded-xl space-y-2.5">
                      {watermarkType === "TEXT" && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                            WATERMARK TEXT
                          </label>
                          <input
                            type="text"
                            value={watermarkText}
                            onChange={(e) => setWatermarkText(e.target.value)}
                            placeholder="e.g. WON / CONFIDENTIAL"
                            className="w-full text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                          />
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Watermark Opacity</span>
                          <span className="font-mono text-[#087FC4]">{watermarkOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          value={watermarkOpacity}
                          onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                          className="w-full accent-[#087FC4] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* AUDIENCE / RECIPIENT & SALUTATION CONTROLS (NO PERSONAL NAMES) */}
                <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200/60 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Audience & Recipient Settings
                    </span>
                    <span className="text-[10px] text-slate-400">Team, Pod, or Role Based</span>
                  </div>

                  {/* Quick Audience Chips (Clean, Professional, Generic) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 block">Quick Team & Audience Select:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "All Studio Members", prefix: "To:" as const },
                        { label: "All Project Leads", prefix: "To:" as const },
                        { label: "Engineering Team", prefix: "To:" as const },
                        { label: "Design Pod", prefix: "To:" as const },
                        { label: "Operations Team", prefix: "To:" as const },
                        { label: "Entire Agency Workspace", prefix: "To:" as const },
                        { label: "All Team Members", prefix: "Dear" as const },
                        { label: "Project Stakeholders", prefix: "Attention:" as const },
                        { label: "Notice to All Staff", prefix: "Notice to:" as const },
                        { label: "General Announcement", prefix: "None" as const },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setRecipientName(item.label);
                            setSalutationPrefix(item.prefix);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors cursor-pointer ${
                            recipientName === item.label
                              ? "bg-[#087FC4] border-[#087FC4] text-white shadow-2xs"
                              : "bg-white border-slate-200/80 text-slate-600 hover:border-[#087FC4] hover:text-[#087FC4]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        SALUTATION GREETING
                      </label>
                      <select
                        value={salutationPrefix}
                        onChange={(e) => setSalutationPrefix(e.target.value as any)}
                        className="w-full text-xs py-2 px-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-[#087FC4]"
                      >
                        <option value="To:">To: (Notice / Directive)</option>
                        <option value="Dear">Dear (Letter / Team)</option>
                        <option value="Hi">Hi (Friendly / Direct)</option>
                        <option value="Attention:">Attention: (Alert)</option>
                        <option value="Notice to:">Notice to: (Formal)</option>
                        <option value="None">None (Direct Headline)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        AUDIENCE / RECIPIENT NAME
                      </label>
                      <input
                        type="text"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="e.g. All Studio Members / Engineering Team"
                        className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#087FC4] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      LETTER SUBJECT LINE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={letterSubject}
                      onChange={(e) => setLetterSubject(e.target.value)}
                      placeholder="e.g. Authorization for Capital Disbursement (Leave blank if not letter)"
                      className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-[#087FC4] outline-none"
                    />
                  </div>
                </div>

                {/* LEAD STATEMENT WITH SIMPLIFIER STARTERS & LINK INSERTER */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      LEAD ANNOUNCEMENT STATEMENT
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenLinkModal("lead")}
                      className="text-[11px] text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>+ Add Blue Link / Text</span>
                    </button>
                  </div>

                  {/* Quick Plain-English Starters */}
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Quick Plain English:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setLeadStatement(
                          "Here are important updates on our studio schedules and session guidelines starting this week."
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] transition-colors cursor-pointer"
                    >
                      Studio Notice
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLeadStatement(
                          "We are pleased to confirm that your project budget request has been approved and funds have been released."
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] transition-colors cursor-pointer"
                    >
                      Fund Approved
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLeadStatement(
                          "We are requesting funds from the agency treasury for project tools, server hosting, and equipment."
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] transition-colors cursor-pointer"
                    >
                      Budget Request
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setLeadStatement(
                          "We’re updating agency workflow settings and session protocols to make collaboration easier for everyone."
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] transition-colors cursor-pointer"
                    >
                      System Update
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={leadStatement}
                    onChange={(e) => setLeadStatement(e.target.value)}
                    placeholder="Type your opening directive... (Tip: use [blue text] or [link text](https://url) for blue highlights)"
                    className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none leading-relaxed"
                  />
                </div>

                {/* BULLET SECTIONS WITH MULTI-HIGHLIGHT & LINK SUPPORT */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        BULLET POINTS ({bullets.length})
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Add structured points with multiple blue highlights or clickable URLs
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddBullet("", "")}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#087FC4] hover:bg-sky-100 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Point</span>
                    </button>
                  </div>

                  {/* Quick Heading Adders */}
                  <div className="flex items-center gap-1.5 flex-wrap pb-1">
                    <span className="text-[10px] text-slate-400 font-semibold">Quick Headings:</span>
                    {[
                      "What’s changing",
                      "How it affects you",
                      "Start Date",
                      "Amount Released",
                      "What It Covers",
                      "Next Steps",
                    ].map((title) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => handleAddBullet(title, "")}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-sky-50 hover:text-[#087FC4] text-slate-600 text-[10px] transition-colors cursor-pointer"
                      >
                        + {title}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {bullets.map((bullet, idx) => (
                      <div
                        key={bullet.id}
                        className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5 relative"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={bullet.heading}
                            onChange={(e) => handleUpdateBullet(bullet.id, "heading", e.target.value)}
                            placeholder={`Heading (e.g. Start Date / Amount Released / What's changing)`}
                            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 text-slate-800 outline-none focus:border-[#087FC4]"
                          />

                          <button
                            type="button"
                            onClick={() => handleOpenLinkModal(`bullet-${bullet.id}`)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-sky-50 text-[#1a73e8] text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Insert blue link or text into this bullet"
                          >
                            <LinkIcon className="w-3 h-3" />
                            <span>Link</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(bullet.id)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove bullet point"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          value={bullet.bodyText}
                          onChange={(e) => handleUpdateBullet(bullet.id, "bodyText", e.target.value)}
                          placeholder="Bullet details... (Tip: use [blue text] or [link text](https://url) directly)"
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 outline-none focus:border-[#087FC4] leading-relaxed"
                        />

                        {/* Dedicated Blue Highlights & Links Manager for this bullet */}
                        <div className="p-2.5 bg-white border border-slate-200/70 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
                              <span>Blue Highlights & Links ({bullet.highlights?.length || 0})</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Highlight any phrase or attach a URL
                            </span>
                          </div>

                          {/* Existing Highlights Pills */}
                          {bullet.highlights && bullet.highlights.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pb-1">
                              {bullet.highlights.map((hl) => (
                                <span
                                  key={hl.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#1a73e8] text-[11px] font-medium"
                                >
                                  <span>{hl.text}</span>
                                  {hl.url && (
                                    <span className="text-[9px] text-slate-400 max-w-[120px] truncate" title={hl.url}>
                                      🔗 {hl.url}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveHighlightFromBullet(bullet.id, hl.id)}
                                    className="hover:text-rose-600 cursor-pointer ml-0.5 text-slate-400"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Add Highlight / Link Input Row */}
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            <input
                              type="text"
                              placeholder="Phrase to turn blue..."
                              value={newHlText[bullet.id] || ""}
                              onChange={(e) =>
                                setNewHlText((prev) => ({ ...prev, [bullet.id]: e.target.value }))
                              }
                              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#087FC4] flex-1 min-w-[130px]"
                            />
                            <input
                              type="text"
                              placeholder="URL link (optional - e.g. https://...)"
                              value={newHlUrl[bullet.id] || ""}
                              onChange={(e) =>
                                setNewHlUrl((prev) => ({ ...prev, [bullet.id]: e.target.value }))
                              }
                              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#087FC4] flex-1 min-w-[130px]"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddHighlightToBullet(bullet.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CALLOUT LINK & SIGNOFF */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        CALLOUT / LINK NOTE (OPTIONAL)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleOpenLinkModal("callout")}
                        className="text-[11px] text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>+ Add Blue Link / Text</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={calloutLinkText}
                      onChange={(e) => setCalloutLinkText(e.target.value)}
                      placeholder="e.g. Questions? Review the [WON Guidelines](https://won.agency/guidelines)."
                      className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        SIGNOFF GREETING
                      </label>
                      <input
                        type="text"
                        value={signoffGreeting}
                        onChange={(e) => setSignoffGreeting(e.target.value)}
                        placeholder="Sincerely, / Best regards,"
                        className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        SIGNOFF TEAM OR SENDER
                      </label>
                      <input
                        type="text"
                        value={signoffTeam}
                        onChange={(e) => setSignoffTeam(e.target.value)}
                        placeholder="The WON Team / Operations Directorate"
                        className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none"
                      />
                    </div>
                  </div>

                  {/* FOOTER CONTROLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        FOOTER COPYRIGHT
                      </label>
                      <input
                        type="text"
                        value={footerCopyright}
                        onChange={(e) => setFooterCopyright(e.target.value)}
                        placeholder="© 2026 WON LLC"
                        className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        MANDATORY DISCLAIMER (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        value={footerDisclaimer}
                        onChange={(e) => setFooterDisclaimer(e.target.value)}
                        placeholder="Official announcement notice..."
                        className="w-full text-xs py-2 px-3 bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-[#087FC4] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =======================================================================
                RIGHT COLUMN: REAL-TIME GEMINI DOCUMENT CANVAS (COMPACT & PROPORTIONAL)
               ======================================================================= */}
            <div
              className={`w-full flex justify-center bg-slate-100/70 p-3 sm:p-6 rounded-3xl overflow-x-auto ${
                viewMode === "preview"
                  ? "lg:col-span-12"
                  : viewMode === "split"
                  ? "lg:col-span-6"
                  : "hidden print:flex"
              }`}
            >
              {/* 
                Live Paper Canvas:
                - max-w-[590px] matches standard Google notice proportions
                - Natural height (min-h-[auto]) on screen without huge vertical voids
                - In Print: full page height, zero browser headers/footers, balanced distribution
              */}
              <div
                id="gemini-live-doc"
                className={`bg-white w-full rounded-xl shadow-[0_2px_14px_rgba(0,0,0,0.06)] border border-slate-200/80 relative overflow-hidden transition-all scale-${effectiveScale} ${
                  effectiveScale === "executive"
                    ? "max-w-[640px] px-8 sm:px-12 py-8 sm:py-10 space-y-6"
                    : effectiveScale === "standard"
                    ? "max-w-[600px] px-7 sm:px-10 py-7 sm:py-8 space-y-4.5"
                    : "max-w-[580px] px-6 sm:px-8 py-6 sm:py-7 space-y-3.5"
                }`}
                style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
              >
                {/* WATERMARK LAYER (LOGO OR TEXT) */}
                {watermarkType === "LOGO" && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
                    style={{ opacity: watermarkOpacity / 100 }}
                  >
                    <img
                      src="/won-logo.png"
                      alt="Watermark"
                      className="w-72 h-auto object-contain filter grayscale"
                    />
                  </div>
                )}

                {watermarkType === "TEXT" && watermarkText && (
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                    style={{ opacity: watermarkOpacity / 100 }}
                  >
                    <span className="text-7xl sm:text-8xl font-black text-slate-900 rotate-[-35deg] tracking-widest uppercase">
                      {watermarkText}
                    </span>
                  </div>
                )}

                {/* DOCUMENT MAIN BODY */}
                <div
                  className={`doc-print-main relative z-10 transition-all ${
                    effectiveScale === "executive"
                      ? "space-y-5"
                      : effectiveScale === "standard"
                      ? "space-y-4"
                      : "space-y-3"
                  }`}
                >
                  {/* TOP: CENTERED WON LOGO */}
                  {showTopLogo && (
                    <div className="flex justify-center pt-0.5 pb-1">
                      <img
                        src="/won-logo.png"
                        alt="WON"
                        className={`doc-logo-img w-auto object-contain transition-all ${
                          effectiveScale === "executive"
                            ? "h-10 sm:h-12 pb-1"
                            : effectiveScale === "standard"
                            ? "h-8 sm:h-9"
                            : "h-7 sm:h-8"
                        }`}
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* SALUTATION / AUDIENCE */}
                  {recipientName && (
                    <div className="pt-0.5">
                      <h2
                        className={`doc-salutation font-semibold text-[#202124] tracking-normal leading-snug transition-all ${
                          effectiveScale === "executive"
                            ? "text-[18px] sm:text-[20px]"
                            : effectiveScale === "standard"
                            ? "text-[16px] sm:text-[17px]"
                            : "text-[15px] sm:text-[16px]"
                        }`}
                      >
                        {formatSalutation(salutationPrefix, recipientName)}
                      </h2>
                    </div>
                  )}

                  {/* LETTER SUBJECT LINE (IF APPLICABLE) */}
                  {letterSubject && (
                    <div className="doc-subject pb-1 border-b border-slate-200">
                      <p
                        className={`font-bold text-[#202124] tracking-wide uppercase transition-all ${
                          effectiveScale === "executive" ? "text-xs sm:text-sm" : "text-xs"
                        }`}
                      >
                        SUBJECT:{" "}
                        <span className="underline decoration-slate-300 underline-offset-4">
                          {letterSubject}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* LEAD STATEMENT */}
                  {leadStatement && (
                    <div>
                      <p
                        className={`doc-lead-text text-[#3c4043] font-normal transition-all ${
                          effectiveScale === "executive"
                            ? "text-[15px] sm:text-[16px] leading-[1.72]"
                            : effectiveScale === "standard"
                            ? "text-[13.5px] sm:text-[14px] leading-[1.6]"
                            : "text-[12.5px] sm:text-[13px] leading-[1.5]"
                        }`}
                      >
                        {renderRichDocumentText(leadStatement)}
                      </p>
                    </div>
                  )}

                  {/* BULLETS */}
                  {bullets.length > 0 && (
                    <div
                      className={`doc-print-bullets pt-0.5 transition-all ${
                        effectiveScale === "executive"
                          ? "space-y-3.5"
                          : effectiveScale === "standard"
                          ? "space-y-2.5"
                          : "space-y-2"
                      }`}
                    >
                      {bullets
                        .filter((b) => b.heading.trim() || b.bodyText.trim())
                        .map((bullet) => (
                          <div
                            key={bullet.id}
                            className={`doc-bullet-item flex items-start text-[#3c4043] transition-all ${
                              effectiveScale === "executive"
                                ? "gap-3 text-[14.5px] sm:text-[15.5px] leading-[1.7]"
                                : effectiveScale === "standard"
                                ? "gap-2.5 text-[13.5px] sm:text-[14px] leading-[1.6]"
                                : "gap-2 text-[12.5px] sm:text-[13px] leading-[1.5]"
                            }`}
                          >
                            <span className="text-[#202124] font-bold select-none text-base shrink-0 mt-[-1px]">
                              •
                            </span>
                            <div className="flex-1">
                              {bullet.heading && (
                                <strong className="font-semibold text-[#202124]">
                                  {bullet.heading}:{" "}
                                </strong>
                              )}
                              <span>
                                {renderRichDocumentText(
                                  bullet.bodyText,
                                  bullet.highlights,
                                  bullet.highlightText
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* CALLOUT / LINK PARAGRAPH */}
                  {calloutLinkText && (
                    <div className="pt-1">
                      <p
                        className={`doc-callout-text text-[#3c4043] transition-all ${
                          effectiveScale === "executive"
                            ? "text-[14.5px] sm:text-[15.5px] leading-[1.7]"
                            : effectiveScale === "standard"
                            ? "text-[13.5px] sm:text-[14px] leading-[1.6]"
                            : "text-[12.5px] sm:text-[13px] leading-[1.5]"
                        }`}
                      >
                        {renderRichDocumentText(calloutLinkText)}
                      </p>
                    </div>
                  )}

                  {/* SIGNOFF */}
                  <div
                    className={`doc-signoff transition-all ${
                      effectiveScale === "executive"
                        ? "pt-4 space-y-1 text-[15px] sm:text-[15.5px]"
                        : effectiveScale === "standard"
                        ? "pt-3 space-y-0.5 text-[13.5px] sm:text-[14px]"
                        : "pt-2 space-y-0.5 text-[12.5px] sm:text-[13px]"
                    }`}
                  >
                    <p className="text-[#3c4043] font-normal">
                      {signoffGreeting}
                    </p>
                    <p className="text-[#202124] font-semibold">
                      {signoffTeam}
                    </p>
                  </div>
                </div>

                {/* BOTTOM: CENTERED FOOTER (NATURAL ELEGANT MARGIN - NO OVERFLOW) */}
                <div
                  className={`doc-print-footer relative z-10 border-t border-slate-100 text-center transition-all ${
                    effectiveScale === "executive"
                      ? "pt-5 mt-7 space-y-2"
                      : effectiveScale === "standard"
                      ? "pt-4 mt-5 space-y-1.5"
                      : "pt-3 mt-4 space-y-1"
                  }`}
                >
                  <div className="flex justify-center">
                    <img
                      src="/won-logo.png"
                      alt="WON"
                      className={`w-auto object-contain opacity-70 grayscale hover:grayscale-0 transition-all ${
                        effectiveScale === "executive" ? "h-6" : "h-5"
                      }`}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>

                  <div className="text-[10.5px] text-[#70757a] space-y-0.5">
                    <p>{footerCopyright || "© 2026 WON LLC"}</p>
                    <p className="text-[10px] text-slate-400">Agency Studio • Digital Operations</p>
                    {footerDisclaimer && (
                      <p className="pt-1 text-[9.5px] text-[#80868b] max-w-sm mx-auto leading-normal">
                        {footerDisclaimer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
