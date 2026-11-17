import React, { useEffect, useState } from 'react';
import { Code2, Copy, Database, Download, Server, Shield, Users } from 'lucide-react';
import {
  fetchAcademicFiles,
  fetchAdminOverview,
  updateUserRoleApi,
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function AdminPage() {
  const { dbUser } = useAuth();
  const [tab, setTab] = useState<'governance' | 'spark-code'>('governance');
  const [overview, setOverview] = useState<any | null>(null);
  const [academicFiles, setAcademicFiles] = useState<any[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ov, ac] = await Promise.all([fetchAdminOverview(), fetchAcademicFiles()]);
      setOverview(ov);
      setAcademicFiles(ac.files || []);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: number, nextRole: string) => {
    setError(null);
    try {
      await updateUserRoleApi(userId, nextRole);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activeFile = academicFiles[selectedFileIndex];

  const handleCopyCode = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.path.split('/').pop() || 'source.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Admin Console & Java Spark Source Explorer
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor Spark RDD jobs, manage RBAC user roles, verify data adapters, and inspect the Java 21 / Spring Boot academic repository.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#0B1324] p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setTab('governance')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === 'governance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Platform Governance
          </button>
          <button
            type="button"
            onClick={() => setTab('spark-code')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              tab === 'spark-code' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Java 21 + Spark RDD Code
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {tab === 'governance' ? (
        <div className="space-y-6">
          {/* Users & RBAC */}
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h2 className="font-display text-base font-semibold text-white">
                  Registered Users & Role Authorization
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Your role: <strong className="text-cyan-300">{dbUser?.roleName || 'Guest'}</strong>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#070E1E] text-slate-400">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(overview?.users || []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500">
                        Sign in with Google to register the first Administrator account in PostgreSQL.
                      </td>
                    </tr>
                  ) : (
                    overview.users.map((u: any) => (
                      <tr key={u.id}>
                        <td className="py-3 px-4 font-medium text-white">{u.displayName}</td>
                        <td className="py-3 px-4 text-slate-300">{u.email}</td>
                        <td className="py-3 px-4">
                          {dbUser?.roleName === 'ADMIN' ? (
                            <select
                              value={u.roleName}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              aria-label={`Change role for ${u.email}`}
                              className="rounded border border-slate-700 bg-[#070E1E] px-2 py-1 text-xs text-slate-100"
                            >
                              <option value="ADMIN">ADMIN</option>
                              <option value="ANALYST">ANALYST</option>
                              <option value="USER">USER</option>
                            </select>
                          ) : (
                            <span className="font-mono-tabular text-cyan-300">{u.roleName}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono-tabular text-slate-400">
                          {new Date(u.lastLoginAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Sources & External Adapters */}
          <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h2 className="font-display text-base font-semibold text-white">
                Data Ingestion Adapters & Provenance
              </h2>
            </div>
            <div className="divide-y divide-slate-800/70">
              {(overview?.dataSources || []).map((ds: any) => (
                <div key={ds.id} className="p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-white">
                      {ds.name} · <span className="text-slate-400">{ds.providerType}</span>
                    </p>
                    <p className="mt-1 text-slate-400">{ds.configNotes}</p>
                  </div>
                  <div className="text-right font-mono-tabular">
                    <p className={ds.isEnabled ? 'text-emerald-400' : 'text-amber-400'}>
                      {ds.isEnabled ? 'Active' : 'Credential Required'} · {ds.isDemo ? 'Demo/External' : 'Live Local'}
                    </p>
                    <p className="mt-0.5 text-slate-500">
                      Last sync: {new Date(ds.lastSyncedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Spark Jobs & Audit Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-400" />
                <h2 className="font-display text-base font-semibold text-white">
                  Spark RDD Job History
                </h2>
              </div>
              <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto">
                {(overview?.jobs || []).map((job: any) => (
                  <div key={job.id} className="p-4 text-xs flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono-tabular font-semibold text-white">{job.jobUid}</p>
                      <p className="mt-0.5 text-slate-400">
                        {job.processedRecords}/{job.totalRecords} records · {job.rddPartitions} partitions
                      </p>
                    </div>
                    <div className="text-right font-mono-tabular">
                      <span className="text-emerald-400 font-semibold">{job.status}</span>
                      <p className="text-slate-500">{job.durationMs} ms</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                <h2 className="font-display text-base font-semibold text-white">
                  Security & Job Audit Logs
                </h2>
              </div>
              <div className="divide-y divide-slate-800/70 max-h-80 overflow-y-auto">
                {(overview?.auditLogs || []).map((log: any) => (
                  <div key={log.id} className="p-4 text-xs flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-200">{log.action}</p>
                      <p className="mt-0.5 text-slate-400">
                        {log.actorEmail} · {log.resourceType} ({log.resourceId})
                      </p>
                    </div>
                    <span className="font-mono-tabular text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-[#0B1324] p-4 space-y-2">
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-xs font-semibold text-slate-300">Academic Source Modules</span>
              <a
                href="/api/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:text-blue-300"
              >
                OpenAPI JSON
              </a>
            </div>
            {academicFiles.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full text-left rounded-lg p-3 transition-colors cursor-pointer ${
                  selectedFileIndex === idx
                    ? 'bg-blue-600/20 border border-blue-500/50 text-white'
                    : 'bg-[#070E1E] border border-slate-800/70 text-slate-300 hover:border-slate-700'
                }`}
              >
                <p className="text-xs font-mono-tabular font-semibold truncate">{file.path}</p>
                <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{file.summary}</p>
              </button>
            ))}
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-[#0B1324] overflow-hidden flex flex-col">
            {activeFile && (
              <>
                <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#070E1E]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-mono-tabular text-xs font-semibold text-white truncate">
                      {activeFile.path}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-1 text-xs text-slate-200 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadFile}
                      className="inline-flex items-center gap-1.5 rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-500 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
                <pre className="p-5 overflow-x-auto text-xs font-mono-tabular text-slate-200 leading-relaxed max-h-[600px]">
                  <code>{activeFile.content}</code>
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
