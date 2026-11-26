"use client";

import React, { useState, useEffect } from "react";
import {
  FolderGit2,
  Building2,
  FileText,
  Award,
  Send,
  PlusCircle,
  QrCode,
  ExternalLink,
  CheckCircle2,
  Trash2,
  X,
  Loader2,
  Users,
  Briefcase,
  AlertCircle,
  ShieldCheck,
  Globe,
  Mail,
  Layers,
  ChevronRight,
  Tag,
  Plus,
  UserCheck
} from "lucide-react";
import {
  ProjectRecord,
  ContributorApplication,
  DocumentRecord,
  CertificateRecord,
  DocumentCategory,
  MemberRecord,
  User,
  projectsApi,
  contributorsApi,
  documentsApi,
  certificatesApi,
  usersApi
} from "../services/api";

interface ProjectsModuleProps {
  user: User;
  members?: MemberRecord[];
  projects: ProjectRecord[];
  setProjects: React.Dispatch<React.SetStateAction<ProjectRecord[]>>;
  applications: ContributorApplication[];
  setApplications: React.Dispatch<React.SetStateAction<ContributorApplication[]>>;
  documents: DocumentRecord[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentRecord[]>>;
  certificates: CertificateRecord[];
  setCertificates: React.Dispatch<React.SetStateAction<CertificateRecord[]>>;
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  user,
  members = [],
  projects,
  setProjects,
  applications,
  setApplications,
  documents,
  setDocuments,
  certificates,
  setCertificates
}) => {
  const [activeTab, setActiveTab] = useState<"projects" | "applications" | "documents" | "certificates">("projects");
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Available real user accounts
  const [accountList, setAccountList] = useState<MemberRecord[]>(members);

  // Dynamic Document Categories
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Modal / Form States
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);
  const [newProject, setNewProject] = useState({
    title: "",
    contributionType: "Client Project" as ProjectRecord["contributionType"],
    clientName: "",
    domain: "",
    contactEmail: "",
    description: "",
    status: "ACTIVE" as ProjectRecord["status"],
    contributorSlots: 5
  });

  // Application Form State
  const [selectedProjectForApp, setSelectedProjectForApp] = useState<ProjectRecord | null>(null);
  const [proposedRole, setProposedRole] = useState("");
  const [statement, setStatement] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);

  // Document Modal State
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [isSubmittingDoc, setIsSubmittingDoc] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: "",
    projectId: "",
    category: "Specification",
    fileUrl: ""
  });
  const [modalNewCategory, setModalNewCategory] = useState("");
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);

  // Certificate Modal State
  const [showAddCertModal, setShowAddCertModal] = useState(false);
  const [isSubmittingCert, setIsSubmittingCert] = useState(false);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>("");
  const [newCert, setNewCert] = useState({
    projectName: "",
    contributionRole: "Core Contributor"
  });

  // Load categories and ensure account list is populated
  useEffect(() => {
    documentsApi
      .getCategories()
      .then((cats) => {
        if (cats && cats.length > 0) {
          setCategories(cats);
          if (!newDoc.category) {
            setNewDoc((prev) => ({ ...prev, category: cats[0].name }));
          }
        }
      })
      .catch(console.error);

    if (members && members.length > 0) {
      setAccountList(members);
    } else {
      usersApi
        .getAll()
        .then((dbUsers) => {
          if (dbUsers && dbUsers.length > 0) {
            const mapped: MemberRecord[] = dbUsers.map((u) => ({
              id: u.id,
              name: u.name,
              role: u.role,
              department: u.department || "Agency Operations",
              eidNumber: u.eidNumber || "WON-SA-0001",
              sparkBalance: u.sparkBalance || 0,
              links: {},
              timeline: []
            }));
            setAccountList(mapped);
          }
        })
        .catch(console.error);
    }
  }, [members]);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // ==========================================
  // CATEGORY HANDLERS
  // ==========================================
  const handleCreateCategory = async (nameToCreate?: string) => {
    const targetName = (nameToCreate || newCategoryName || modalNewCategory).trim();
    if (!targetName) {
      notify("Please enter a category name", "error");
      return;
    }

    setIsAddingCategory(true);
    try {
      const created = await documentsApi.createCategory(targetName);
      setCategories((prev) => {
        if (prev.some((c) => c.name.toLowerCase() === created.name.toLowerCase())) return prev;
        return [...prev, created];
      });
      setNewDoc((prev) => ({ ...prev, category: created.name }));
      setNewCategoryName("");
      setModalNewCategory("");
      setShowInlineAddCategory(false);
      notify(`Category "${created.name}" created successfully.`);
    } catch (err: any) {
      notify(err.message || "Failed to create category", "error");
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? Documents using this category will retain their label.`)) {
      return;
    }

    try {
      await documentsApi.deleteCategory(categoryId);
      setCategories((prev) => prev.filter((c) => c.id !== categoryId && c._id !== categoryId));
      if (newDoc.category === name) {
        setNewDoc((prev) => ({ ...prev, category: "Specification" }));
      }
      notify(`Category "${name}" deleted.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete category", "error");
    }
  };

  // ==========================================
  // PROJECT HANDLERS
  // ==========================================
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.title.trim()) {
      notify("Please enter a project title", "error");
      return;
    }

    setIsSubmittingProject(true);
    try {
      const created = await projectsApi.create({
        title: newProject.title.trim(),
        contributionType: newProject.contributionType,
        companyDetails: {
          clientName: newProject.clientName.trim() || "WON Originals",
          domain: newProject.domain.trim() || "Internal Systems",
          contactEmail: newProject.contactEmail.trim() || "contact@wonoriginals.agency"
        },
        description: newProject.description.trim(),
        status: newProject.status,
        contributorSlots: Number(newProject.contributorSlots) || 5,
        filledSlots: 0
      });

      setProjects((prev) => [created, ...prev]);
      setShowAddProjectModal(false);
      setNewProject({
        title: "",
        contributionType: "Client Project",
        clientName: "",
        domain: "",
        contactEmail: "",
        description: "",
        status: "ACTIVE",
        contributorSlots: 5
      });
      notify(`Project "${created.title}" successfully created and saved to MongoDB.`);
    } catch (err: any) {
      notify(err.message || "Failed to create project", "error");
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const handleDeleteProject = async (projectId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the project "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await projectsApi.delete(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId && (p as any)._id !== projectId));
      notify(`Project "${title}" deleted from database.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete project", "error");
    }
  };

  const handleToggleProjectStatus = async (project: ProjectRecord) => {
    const nextStatus: ProjectRecord["status"] =
      project.status === "ACTIVE" ? "COMPLETED" : project.status === "COMPLETED" ? "PLANNING" : "ACTIVE";

    try {
      await projectsApi.update(project.id, { status: nextStatus });
      setProjects((prev) =>
        prev.map((p) => (p.id === project.id || (p as any)._id === project.id ? { ...p, status: nextStatus } : p))
      );
      notify(`Project "${project.title}" status changed to ${nextStatus}.`);
    } catch (err: any) {
      notify(err.message || "Failed to update project status", "error");
    }
  };

  // ==========================================
  // CONTRIBUTOR APPLICATION HANDLERS
  // ==========================================
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForApp || !proposedRole || !statement) {
      notify("Please fill all required fields", "error");
      return;
    }

    setIsSubmittingApp(true);
    try {
      const created = await contributorsApi.apply({
        projectId: selectedProjectForApp.id || (selectedProjectForApp as any)._id,
        projectTitle: selectedProjectForApp.title,
        userId: user.id || (user as any)._id,
        userName: user.name,
        roleProposed: proposedRole.trim(),
        statement: statement.trim()
      });

      setApplications((prev) => [created, ...prev]);
      setSelectedProjectForApp(null);
      setProposedRole("");
      setStatement("");
      notify(`Application submitted for ${created.projectTitle}!`);
    } catch (err: any) {
      notify(err.message || "Failed to submit application", "error");
    } finally {
      setIsSubmittingApp(false);
    }
  };

  const handleUpdateAppStatus = async (appId: string, status: "APPROVED" | "REJECTED", app: ContributorApplication) => {
    try {
      await contributorsApi.updateStatus(appId, status);
      setApplications((prev) =>
        prev.map((a) => (a.id === appId || (a as any)._id === appId ? { ...a, status } : a))
      );
      if (status === "APPROVED") {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === app.projectId || (p as any)._id === app.projectId
              ? { ...p, filledSlots: Math.min(p.contributorSlots, (p.filledSlots || 0) + 1) }
              : p
          )
        );
      }
      notify(`Application for ${app.userName} marked as ${status}.`);
    } catch (err: any) {
      notify(err.message || "Failed to update application", "error");
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    try {
      await contributorsApi.delete(appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId && (a as any)._id !== appId));
      notify("Application removed.");
    } catch (err: any) {
      notify(err.message || "Failed to delete application", "error");
    }
  };

  // ==========================================
  // DOCUMENTATION HANDLERS
  // ==========================================
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim()) {
      notify("Please enter a document title", "error");
      return;
    }
    if (!newDoc.category.trim()) {
      notify("Please select or create a category", "error");
      return;
    }

    setIsSubmittingDoc(true);
    try {
      const selectedProj = projects.find((p) => p.id === newDoc.projectId);
      const created = await documentsApi.create({
        title: newDoc.title.trim(),
        projectId: newDoc.projectId || undefined,
        projectTitle: selectedProj ? selectedProj.title : "General Agency Documentation",
        category: newDoc.category.trim(),
        fileUrl: newDoc.fileUrl.trim() || "#"
      });

      setDocuments((prev) => [created, ...prev]);
      setShowAddDocModal(false);
      setNewDoc({ title: "", projectId: "", category: categories[0]?.name || "Specification", fileUrl: "" });
      notify(`Document "${created.title}" uploaded successfully.`);
    } catch (err: any) {
      notify(err.message || "Failed to add document", "error");
    } finally {
      setIsSubmittingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!window.confirm(`Delete document "${title}"?`)) return;
    try {
      await documentsApi.delete(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId && (d as any)._id !== docId));
      notify(`Document "${title}" removed.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete document", "error");
    }
  };

  // ==========================================
  // CERTIFICATE HANDLERS
  // ==========================================
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecipientId) {
      notify("Please select a registered account from the website", "error");
      return;
    }
    const targetMember = accountList.find((m) => m.id === selectedRecipientId);
    if (!targetMember) {
      notify("Selected member account not found", "error");
      return;
    }
    if (!newCert.projectName.trim()) {
      notify("Please choose or specify an initiative/project name", "error");
      return;
    }

    setIsSubmittingCert(true);
    try {
      const created = await certificatesApi.issue({
        recipientName: targetMember.name.trim(),
        recipientEid: targetMember.eidNumber.trim(),
        projectName: newCert.projectName.trim(),
        contributionRole: newCert.contributionRole.trim() || "Core Contributor"
      });

      setCertificates((prev) => [created, ...prev]);
      setShowAddCertModal(false);
      setSelectedRecipientId("");
      setNewCert({
        projectName: "",
        contributionRole: "Core Contributor"
      });
      notify(`Verified certificate ${created.certificateNumber} issued to ${created.recipientName}!`);
    } catch (err: any) {
      notify(err.message || "Failed to issue certificate", "error");
    } finally {
      setIsSubmittingCert(false);
    }
  };

  const handleDeleteCertificate = async (certId: string, certNumber: string) => {
    if (!window.confirm(`Revoke and delete certificate ${certNumber}?`)) return;
    try {
      await certificatesApi.delete(certId);
      setCertificates((prev) => prev.filter((c) => c.id !== certId && (c as any)._id !== certId));
      notify(`Certificate ${certNumber} revoked.`);
    } catch (err: any) {
      notify(err.message || "Failed to delete certificate", "error");
    }
  };

  // Filtered documents by category
  const filteredDocuments =
    selectedCategoryFilter === "ALL"
      ? documents
      : documents.filter((d) => d.category.toLowerCase() === selectedCategoryFilter.toLowerCase());

  // Chosen recipient member details for preview
  const selectedMember = accountList.find((m) => m.id === selectedRecipientId);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Header */}
      <div className="bg-white/95 backdrop-blur-xs rounded-3xl p-5 sm:p-6 border border-[#E2EEFC] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center shrink-0 shadow-2xs border border-[#CDE5FC]">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-serif-fraunces font-normal text-[#101C34] tracking-tight">
                Project Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E5F2FF] text-[#087FC4] text-[10px] font-bold uppercase tracking-wider">
                {projects.length} Active
              </span>
            </div>
            <p className="text-xs text-[#647895] mt-0.5 font-sans">
              Contribution Types, Company Details, Contributor Applications, Documentation & QR Certifications
            </p>
          </div>
        </div>

        {/* Action Button for Active Tab */}
        <div className="flex items-center space-x-2">
          {activeTab === "projects" && (
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="px-4 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          )}
          {activeTab === "documents" && (
            <button
              onClick={() => setShowAddDocModal(true)}
              className="px-4 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          )}
          {activeTab === "certificates" && (
            <button
              onClick={() => setShowAddCertModal(true)}
              className="px-4 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Issue Certificate</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between shadow-2xs animate-fadeIn border ${
            statusMessage.type === "success"
              ? "bg-[#E5F2FF] text-[#0868AE] border-[#bae6fd]"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#087FC4] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-sm ml-3 px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#E2EEFC] pb-2 overflow-x-auto no-scrollbar">
        {[
          { key: "projects", label: "Projects Directory", icon: FolderGit2, count: projects.length },
          { key: "applications", label: "Contributor Applications", icon: Send, count: applications.length },
          { key: "documents", label: "Documentation", icon: FileText, count: documents.length },
          { key: "certificates", label: "Verified Certificates", icon: Award, count: certificates.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#087FC4] text-white shadow-xs"
                  : "bg-white/80 hover:bg-[#E5F2FF]/60 text-[#647895] hover:text-[#101C34] border border-[#E2EEFC]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PROJECTS DIRECTORY                                 */}
      {/* ========================================================= */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {projects.length === 0 ? (
            <div className="bg-white/95 rounded-3xl p-12 text-center border border-[#E2EEFC] shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center mx-auto shadow-2xs border border-[#CDE5FC]">
                <FolderGit2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">No Projects In Database</h3>
                <p className="text-xs text-[#647895] leading-relaxed">
                  There are no projects currently registered in MongoDB Atlas. Click below to add a new project with
                  client specifications and contributor slots.
                </p>
              </div>
              <button
                onClick={() => setShowAddProjectModal(true)}
                className="px-5 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create First Project</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((proj) => {
                const filled = proj.filledSlots || 0;
                const total = proj.contributorSlots || 5;
                const pct = Math.min(100, Math.round((filled / total) * 100));

                return (
                  <div
                    key={proj.id}
                    className="bg-white/95 backdrop-blur-xs rounded-3xl p-6 border border-[#E2EEFC] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges & Delete Button */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2.5 py-1 bg-[#E5F2FF] text-[#087FC4] rounded-full border border-[#CDE5FC]">
                          {proj.contributionType || "Client Project"}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleProjectStatus(proj)}
                            title="Click to toggle status (ACTIVE / COMPLETED / PLANNING)"
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider cursor-pointer border transition-all ${
                              proj.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : proj.status === "COMPLETED"
                                ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            }`}
                          >
                            {proj.status}
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj.id, proj.title)}
                            title="Delete project from MongoDB"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Project Title & Description */}
                      <div>
                        <h3 className="font-serif-fraunces text-lg text-[#101C34] leading-snug">{proj.title}</h3>
                        <p className="text-xs text-[#647895] mt-1.5 line-clamp-3 leading-relaxed">
                          {proj.description || "No project description provided."}
                        </p>
                      </div>

                      {/* Company & Client Details Box */}
                      <div className="p-3 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] text-xs space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[#101C34] font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-[#087FC4]" />
                          <span className="truncate">{proj.companyDetails?.clientName || "WON Originals"}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[#647895] text-[11px]">
                          <Globe className="w-3 h-3 text-slate-400" />
                          <span>Domain: {proj.companyDetails?.domain || "Technology"}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[#087FC4] text-[11px] font-mono">
                          <Mail className="w-3 h-3 text-[#087FC4]" />
                          <span className="truncate">{proj.companyDetails?.contactEmail || "contact@wonoriginals.agency"}</span>
                        </div>
                      </div>

                      {/* Contributor Slots Progress */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs text-[#647895]">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3.5 h-3.5 text-[#087FC4]" />
                            <span>Contributor Slots</span>
                          </span>
                          <span className="font-bold text-[#101C34]">
                            {filled} / {total} filled
                          </span>
                        </div>
                        <div className="w-full bg-[#E5F2FF] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#087FC4] h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Strip */}
                    <div className="pt-3 border-t border-[#E2EEFC] flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedProjectForApp(proj);
                          setActiveTab("applications");
                        }}
                        className="w-full py-2 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Apply as Contributor</span>
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
      {/* TAB 2: CONTRIBUTOR APPLICATIONS                           */}
      {/* ========================================================= */}
      {activeTab === "applications" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form: Apply to Contribute */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-4">
            <div>
              <h3 className="font-serif-fraunces text-xl text-[#101C34]">Apply to Contribute</h3>
              <p className="text-xs text-[#647895] mt-1 font-sans">
                Submit your proposed agency role and qualifications for peer validation.
              </p>
            </div>

            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#101C34] mb-1.5 block">Select Target Project</label>
                <select
                  value={selectedProjectForApp?.id || ""}
                  onChange={(e) => {
                    const found = projects.find((p) => p.id === e.target.value);
                    setSelectedProjectForApp(found || null);
                  }}
                  required
                  className="w-full text-xs p-3 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] font-medium focus:outline-none focus:border-[#087FC4]"
                >
                  <option value="">-- Choose a Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.contributionType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] mb-1.5 block">Proposed Agency Role</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Frontend / Rust Systems / Product Architect"
                  value={proposedRole}
                  onChange={(e) => setProposedRole(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#101C34] mb-1.5 block">
                  Statement / Deliverable Focus
                </label>
                <textarea
                  rows={3}
                  placeholder="Summarize relevant expertise, planned technical milestones, and timeline..."
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  required
                  className="w-full text-xs p-3 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingApp}
                className="w-full py-2.5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer"
              >
                {isSubmittingApp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Contributor Application</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Applications Ledger */}
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div>
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">Application Status Ledger</h3>
                <p className="text-xs text-[#647895] mt-0.5">
                  Live verification stream synced directly with MongoDB Atlas.
                </p>
              </div>
              <span className="text-xs font-bold text-[#087FC4] bg-[#E5F2FF] px-2.5 py-0.5 rounded-full">
                {applications.length} Submitted
              </span>
            </div>

            {applications.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#647895]">
                <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No applications submitted yet. Select a project and submit your candidate application.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-[#101C34]">{app.projectTitle}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : app.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="text-[#647895]">
                        <strong className="text-[#101C34]">Role:</strong> {app.roleProposed}
                      </p>
                      <p className="text-[#647895] text-[11px] italic leading-relaxed">
                        "{app.statement}"
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Candidate: <strong className="text-slate-600">{app.userName}</strong> • Submitted:{" "}
                        {app.submittedAt}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {app.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleUpdateAppStatus(app.id, "APPROVED", app)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateAppStatus(app.id, "REJECTED", app)}
                            className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteApplication(app.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DOCUMENTATION & SPECIFICATIONS                     */}
      {/* ========================================================= */}
      {activeTab === "documents" && (
        <div className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2EEFC] pb-4">
            <div>
              <h3 className="font-serif-fraunces text-xl text-[#101C34]">Project Reports & Documentation</h3>
              <p className="text-xs text-[#647895] mt-0.5">
                Official deliverables, architecture specifications, and client technical reviews.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCategoryManager(!showCategoryManager)}
                className="px-3.5 py-2 bg-[#F0F6FD] hover:bg-[#E5F2FF] text-[#087FC4] border border-[#CDE5FC] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Manage Categories</span>
              </button>
              <button
                onClick={() => setShowAddDocModal(true)}
                className="px-4 py-2 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Document</span>
              </button>
            </div>
          </div>

          {/* Category Management Drawer / Panel */}
          {showCategoryManager && (
            <div className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#CDE5FC] space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#101C34] flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#087FC4]" />
                  <span>Category Management in MongoDB Atlas</span>
                </span>
                <span className="text-[11px] text-[#647895]">{categories.length} total categories</span>
              </div>

              {/* Add category input */}
              <div className="flex items-center gap-2 max-w-md">
                <input
                  type="text"
                  placeholder="New category name (e.g. Legal, Security Review)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="flex-1 text-xs p-2.5 bg-white border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory()}
                  disabled={isAddingCategory || !newCategoryName.trim()}
                  className="px-3.5 py-2.5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Category</span>
                </button>
              </div>

              {/* Active Category Pills with Delete Option */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {categories.map((c) => (
                  <span
                    key={c.id || c._id}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-[#D5E6F8] rounded-full text-xs text-[#101C34] font-medium shadow-2xs"
                  >
                    <span>{c.name}</span>
                    <button
                      onClick={() => handleDeleteCategory(c.id || c._id || "", c.name)}
                      title={`Delete category "${c.name}"`}
                      className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedCategoryFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                selectedCategoryFilter === "ALL"
                  ? "bg-[#087FC4] text-white shadow-2xs"
                  : "bg-[#F0F6FD] text-[#647895] hover:text-[#101C34]"
              }`}
            >
              All Categories ({documents.length})
            </button>
            {categories.map((c) => {
              const count = documents.filter((d) => d.category.toLowerCase() === c.name.toLowerCase()).length;
              const isSelected = selectedCategoryFilter.toLowerCase() === c.name.toLowerCase();
              return (
                <button
                  key={c.id || c._id}
                  onClick={() => setSelectedCategoryFilter(c.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                    isSelected
                      ? "bg-[#087FC4] text-white shadow-2xs"
                      : "bg-[#F0F6FD] text-[#647895] hover:text-[#101C34]"
                  }`}
                >
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200/60 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Document Cards */}
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#647895] space-y-3">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No project documentation records matching this category.</p>
              <button
                onClick={() => setShowAddDocModal(true)}
                className="px-4 py-2 bg-[#087FC4] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Upload First Document</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-[#F8FBFF] rounded-2xl border border-[#E2EEFC] flex items-center justify-between hover:border-[#bae6fd] transition-all"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#E5F2FF] text-[#087FC4] flex items-center justify-center shrink-0 border border-[#CDE5FC]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-[#087FC4] uppercase tracking-wider">
                        {doc.category}
                      </span>
                      <h4 className="text-xs font-bold text-[#101C34] truncate">{doc.title}</h4>
                      <p className="text-[11px] text-[#647895] truncate">
                        {doc.projectTitle} • {doc.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 shrink-0 ml-3">
                    <a
                      href={doc.fileUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-[#087FC4] hover:bg-[#E5F2FF] rounded-lg transition-colors cursor-pointer"
                      title="Open Document Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: VERIFIED QR CERTIFICATES                           */}
      {/* ========================================================= */}
      {activeTab === "certificates" && (
        <div className="bg-white/95 backdrop-blur-xs p-6 rounded-3xl border border-[#E2EEFC] shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
            <div>
              <h3 className="font-serif-fraunces text-xl text-[#101C34]">
                Project Certification & QR Code Verification
              </h3>
              <p className="text-xs text-[#647895] mt-0.5">
                Cryptographically registered contributor certificates stored in MongoDB with unique verifiable IDs.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedRecipientId("");
                setShowAddCertModal(true);
              }}
              className="px-4 py-2 bg-[#087FC4] hover:bg-[#0868AE] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Issue Certificate</span>
            </button>
          </div>

          {certificates.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#647895] space-y-3">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p>No certificates issued yet. Issue a verified pass for project contributors.</p>
              <button
                onClick={() => {
                  setSelectedRecipientId("");
                  setShowAddCertModal(true);
                }}
                className="px-4 py-2 bg-[#087FC4] text-white rounded-xl text-xs font-semibold inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Issue First Certificate</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-6 bg-gradient-to-br from-white via-[#F7FAFD] to-[#E9F3FE] rounded-3xl border border-[#D5E6F8] shadow-sm relative overflow-hidden flex flex-col justify-between space-y-4"
                >
                  {/* Decorative Mountain background */}
                  <div className="absolute right-0 bottom-0 left-0 h-28 opacity-15 pointer-events-none select-none z-0">
                    <img
                      src="/mountain-panorama.png"
                      alt=""
                      className="w-full h-full object-cover object-bottom mix-blend-multiply"
                    />
                  </div>

                  {/* Header */}
                  <div className="relative z-10 flex items-center justify-between border-b border-[#E0EEFC] pb-3">
                    <div className="flex items-center space-x-2">
                      <img src="/won-logo.png" alt="WON" className="h-4 w-auto object-contain" />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#087FC4]">
                        Official Certificate
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono text-[#087FC4] bg-[#E5F2FF] px-2 py-0.5 rounded-full font-bold border border-[#CDE5FC]">
                        {cert.certificateNumber}
                      </span>
                      <button
                        onClick={() => handleDeleteCertificate(cert.id, cert.certificateNumber)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 cursor-pointer"
                        title="Revoke and delete certificate"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 py-3 text-center space-y-1">
                    <p className="text-[10px] text-[#647895] uppercase tracking-widest">This certifies that</p>
                    <p className="font-serif-fraunces text-xl text-[#101C34]">{cert.recipientName}</p>
                    <p className="text-xs text-[#087FC4] font-mono font-semibold">{cert.recipientEid}</p>
                    <p className="text-xs text-[#647895] max-w-sm mx-auto pt-2 leading-relaxed">
                      has successfully contributed as <strong className="text-[#101C34]">{cert.contributionRole}</strong>{" "}
                      to the initiative <strong className="text-[#0868AE]">{cert.projectName}</strong>.
                    </p>
                  </div>

                  {/* Footer with QR */}
                  <div className="relative z-10 flex items-center justify-between pt-3 border-t border-[#E0EEFC] text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Issue Date: {cert.issueDate}</p>
                      <p className="text-[10px] font-semibold text-emerald-700 flex items-center space-x-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Verified on WON Ledger</span>
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white/90 p-2 rounded-xl border border-[#D5E6F8] shadow-2xs">
                      <QrCode className="w-8 h-8 text-[#087FC4]" />
                      <div className="text-[9px] text-[#647895] font-mono leading-tight">
                        SCAN TO<br />VERIFY QR
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: ADD NEW PROJECT                                  */}
      {/* ========================================================= */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#E2EEFC] shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">Add New Project</h3>
              </div>
              <button
                onClick={() => setShowAddProjectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WonOriginals Mobile Ecosystem"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#101C34] block mb-1">Contribution Type</label>
                  <select
                    value={newProject.contributionType}
                    onChange={(e) =>
                      setNewProject({ ...newProject, contributionType: e.target.value as any })
                    }
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  >
                    <option value="Client Project">Client Project</option>
                    <option value="Core Development">Core Development</option>
                    <option value="Bounty / Sprint">Bounty / Sprint</option>
                    <option value="R&D">R&D</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#101C34] block mb-1">Status</label>
                  <select
                    value={newProject.status}
                    onChange={(e) =>
                      setNewProject({ ...newProject, status: e.target.value as any })
                    }
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PLANNING">PLANNING</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-[#101C34] block mb-1">Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Labs"
                    value={newProject.clientName}
                    onChange={(e) => setNewProject({ ...newProject, clientName: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#101C34] block mb-1">Domain</label>
                  <input
                    type="text"
                    placeholder="e.g. AI / Fintech"
                    value={newProject.domain}
                    onChange={(e) => setNewProject({ ...newProject, domain: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  />
                </div>

                <div>
                  <label className="font-semibold text-[#101C34] block mb-1">Slots</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newProject.contributorSlots}
                    onChange={(e) =>
                      setNewProject({ ...newProject, contributorSlots: parseInt(e.target.value) || 5 })
                    }
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="contact@agency.com"
                  value={newProject.contactEmail}
                  onChange={(e) => setNewProject({ ...newProject, contactEmail: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Overview of project deliverables, milestones, and technical requirements..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[#E2EEFC] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProject}
                  className="px-5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingProject ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Project</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: ADD DOCUMENT WITH DYNAMIC CATEGORY CREATION       */}
      {/* ========================================================= */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-[#E2EEFC] shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-[#E5F2FF] text-[#087FC4]">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="font-serif-fraunces text-xl text-[#101C34]">Add Documentation</h3>
              </div>
              <button
                onClick={() => {
                  setShowAddDocModal(false);
                  setShowInlineAddCategory(false);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Architecture Specification"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Associated Project</label>
                <select
                  value={newDoc.projectId}
                  onChange={(e) => setNewDoc({ ...newDoc, projectId: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                >
                  <option value="">General Agency Documentation</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Category Selector + Quick Add */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#101C34] block">Category *</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddCategory(!showInlineAddCategory)}
                    className="text-[11px] font-semibold text-[#087FC4] hover:text-[#0868AE] flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showInlineAddCategory ? "Hide Add" : "Create New Category"}</span>
                  </button>
                </div>

                {/* Inline Category Creation */}
                {showInlineAddCategory && (
                  <div className="mb-2 p-2.5 bg-[#F0F6FD] rounded-xl border border-[#CDE5FC] flex items-center gap-2 animate-fadeIn">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={modalNewCategory}
                      onChange={(e) => setModalNewCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateCategory(modalNewCategory);
                        }
                      }}
                      className="flex-1 text-xs p-1.5 bg-white border border-[#CDE5FC] rounded-lg text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                    />
                    <button
                      type="button"
                      disabled={isAddingCategory || !modalNewCategory.trim()}
                      onClick={() => handleCreateCategory(modalNewCategory)}
                      className="px-2.5 py-1.5 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                    >
                      {isAddingCategory ? "..." : "Add"}
                    </button>
                  </div>
                )}

                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                  required
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4] font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id || c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Quick pills showing delete option */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {categories.map((c) => (
                    <span
                      key={c.id || c._id}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] text-slate-700 rounded-md"
                    >
                      <span>{c.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(c.id || c._id || "", c.name)}
                        title={`Delete ${c.name}`}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Document Link / URL</label>
                <input
                  type="text"
                  placeholder="https://... or internal link"
                  value={newDoc.fileUrl}
                  onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2EEFC] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDoc}
                  className="px-5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingDoc ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Add Document</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ISSUE VERIFIED CERTIFICATE (ACCOUNT BOUND ONLY)   */}
      {/* ========================================================= */}
      {showAddCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-[#E2EEFC] shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#E2EEFC] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#E5F2FF] text-[#087FC4]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-fraunces text-xl text-[#101C34]">Issue Verified Certificate</h3>
                  <p className="text-[11px] text-[#647895]">
                    Cryptographic agency pass tied strictly to an existing website member account.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddCertModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleIssueCertificate} className="space-y-4">
              {/* Mandatory Website Account Dropdown Selection */}
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">
                  Select Recipient Studio Account *
                </label>
                <select
                  required
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full p-3 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] font-medium focus:outline-none focus:border-[#087FC4]"
                >
                  <option value="">-- Choose Member Account from Website (Required) --</option>
                  {accountList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.eidNumber} ({m.role} • {m.department})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#647895] mt-1">
                  * Certificates can only be issued to provisioned members registered in MongoDB Atlas.
                </p>
              </div>

              {/* Verified Account Details Preview Card */}
              {selectedMember && (
                <div className="p-3.5 bg-gradient-to-r from-[#F0F7FF] to-[#E9F3FE] rounded-2xl border border-[#CDE5FC] flex items-center justify-between animate-fadeIn">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-[#087FC4] text-white flex items-center justify-center font-bold text-sm font-serif-fraunces">
                      {selectedMember.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-[#101C34] text-xs">{selectedMember.name}</span>
                        <span className="text-[10px] font-mono font-semibold text-[#087FC4] bg-white px-2 py-0.2 rounded-full border border-[#D5E6F8]">
                          {selectedMember.eidNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#647895] mt-0.5">
                        {selectedMember.role} • {selectedMember.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-[10px] font-semibold shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Verified Identity</span>
                  </div>
                </div>
              )}

              {/* Select Project */}
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Associated Project / Initiative *</label>
                {projects.length > 0 ? (
                  <select
                    required
                    value={newCert.projectName}
                    onChange={(e) => setNewCert({ ...newCert, projectName: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] font-medium focus:outline-none focus:border-[#087FC4]"
                  >
                    <option value="">-- Choose Project from Directory --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title} ({p.contributionType})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. WonOriginals Mobile Ecosystem"
                    value={newCert.projectName}
                    onChange={(e) => setNewCert({ ...newCert, projectName: e.target.value })}
                    className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                  />
                )}
              </div>

              {/* Contribution Role */}
              <div>
                <label className="font-semibold text-[#101C34] block mb-1">Contribution Role *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Systems Architect / Core Contributor"
                  value={newCert.contributionRole}
                  onChange={(e) => setNewCert({ ...newCert, contributionRole: e.target.value })}
                  className="w-full p-2.5 bg-[#F8FBFF] border border-[#E2EEFC] rounded-xl text-[#101C34] focus:outline-none focus:border-[#087FC4]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2EEFC] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCertModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCert || !selectedRecipientId}
                  className="px-5 py-2 bg-[#087FC4] hover:bg-[#0868AE] disabled:bg-slate-300 text-white rounded-xl font-semibold inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingCert ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Pass...</span>
                    </>
                  ) : (
                    <span>Issue Verified Certificate</span>
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
