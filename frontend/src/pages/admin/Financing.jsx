import { useEffect, useState } from 'react'
import apiClient, { backendUrl } from '../../api/client'

/**
 * Financing document review + download. Forwarding the packet to the
 * partner bank happens outside this system (email/physical handoff) —
 * Admin's job here is verifying documents and downloading them.
 */
export default function Financing() {
  const [applications, setApplications] = useState([])

  function load() {
    apiClient.get('/admin/financing-applications').then(({ data }) => setApplications(data.data ?? []))
  }

  useEffect(load, [])

  async function verifyDocument(docId) {
    await apiClient.post(`/admin/financing-documents/${docId}/verify`)
    load()
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-brand">Financing Applications</h1>
      <div className="space-y-4">
        {applications.map((app) => (
          <div key={app.id} className="rounded border border-slate-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>
                {app.buyer?.name} — {app.vehicle?.year} {app.vehicle?.make} {app.vehicle?.model} ({app.employment_profile})
              </span>
              <span className="text-slate-500">{app.status}</span>
            </div>
            <ul className="mt-2 space-y-1">
              {app.documents?.map((doc) => (
                <li key={doc.id} className="flex items-center justify-between">
                  <span>{doc.doc_type} {doc.verified ? '✅' : ''}</span>
                  <span className="flex gap-3">
                    <a
                      href={backendUrl(`/api/admin/financing-documents/${doc.id}/download`)}
                      className="text-brand underline"
                    >
                      Download
                    </a>
                    {!doc.verified && (
                      <button onClick={() => verifyDocument(doc.id)} className="text-brand underline">
                        Mark verified
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
