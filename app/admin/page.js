"use client";
import { useState, useEffect } from "react";
import { FileText, ShieldCheck, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.files || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSignOut = async () => {
    // Clear cookie
    document.cookie = "auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0f1419] text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 border-b border-gray-800 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShieldCheck className="text-green-500" />
              ComplianceHub
            </h1>
            <p className="text-gray-400 mt-2">
              Active Knowledge Base & Reference Library
            </p>
          </div>
          <button 
            onClick={handleSignOut}
            className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg border border-red-500/20 flex items-center gap-2 hover:bg-red-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* List of Documents */}
        {loading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse">
            Scanning repository...
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.length === 0 ? (
              <div className="p-8 border border-dashed border-gray-700 rounded-lg text-center text-gray-500">
                No documents found in public/documents folder.
              </div>
            ) : (
              documents.map((doc, index) => (
                <div 
                  key={index}
                  className="bg-[#1e2732] p-4 rounded-lg border border-gray-700 flex items-center justify-between hover:border-gray-600 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-500/10 p-3 rounded-lg">
                      <FileText className="text-blue-400 w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{doc.name}</h3>
                      <p className="text-xs text-gray-400">
                        {doc.size} • Loaded from Repository
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-500/10 text-green-400 text-xs rounded-full border border-green-500/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                    Active
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
