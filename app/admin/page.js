'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const router = useRouter()
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    checkAuth()
    fetchMetrics()
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [tab])
  
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
    }
  }
  
  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/admin/metrics?type=${tab}`)
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      } else if (res.status === 403) {
        alert('Admin access required')
        router.push('/')
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading metrics...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-600">System monitoring and metrics</p>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          {['overview', 'errors', 'health', 'endpoints'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-medium capitalize ${
                tab === t 
                  ? 'text-slate-900 border-b-2 border-slate-900' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        {/* Overview Tab */}
        {tab === 'overview' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Health Status */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">System Health</h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  metrics.health.status === 'healthy' ? 'bg-green-500' :
                  metrics.health.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}></div>
                <p className="text-2xl font-bold text-slate-900 capitalize">
                  {metrics.health.status}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">Error Rate: {metrics.health.errorRate}</p>
            </div>

            {/* Total Requests */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">Total Requests</h3>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.metrics.requests.total.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Success: {metrics.metrics.requests.successful.toLocaleString()}
              </p>
            </div>

            {/* Active Users */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">Active Users</h3>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.metrics.users.active}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Signups: {metrics.metrics.users.signups}
              </p>
            </div>

            {/* Rate Limit Stats */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">Rate Limits</h3>
              <p className="text-2xl font-bold text-slate-900">
                {metrics.rateLimits.totalKeys}
              </p>
              <p className="text-xs text-slate-500 mt-2">Active limits</p>
            </div>

            {/* Top Endpoints */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-500 mb-4">Top Endpoints</h3>
              <div className="space-y-2">
                {metrics.endpoints.slice(0, 5).map((endpoint, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-700 truncate">{endpoint.endpoint}</span>
                    <span className="text-slate-500">{endpoint.count} calls</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {tab === 'errors' && metrics && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Errors</h3>
              {metrics.errors.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No recent errors</p>
              ) : (
                <div className="space-y-4">
                  {metrics.errors.map((error, i) => (
                    <div key={i} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="font-semibold text-red-900">{error.message}</p>
                        <span className="text-xs text-red-600">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {error.endpoint && (
                        <p className="text-sm text-red-700">Endpoint: {error.endpoint}</p>
                      )}
                      {error.userId && (
                        <p className="text-sm text-red-700">User: {error.userId.substring(0, 8)}...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Health Tab */}
        {tab === 'health' && metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">System Health</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Status</dt>
                  <dd className="font-semibold capitalize">{metrics.system.status}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Error Rate</dt>
                  <dd className="font-semibold">{metrics.system.errorRate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Uptime</dt>
                  <dd className="font-semibold">{Math.floor(metrics.system.uptime / 60)} min</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Database Health</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Status</dt>
                  <dd className={`font-semibold ${metrics.database.healthy ? 'text-green-600' : 'text-red-600'}`}>
                    {metrics.database.healthy ? 'Healthy' : 'Unhealthy'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Response Time</dt>
                  <dd className="font-semibold">{metrics.database.responseTime}ms</dd>
                </div>
                {metrics.database.error && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">{metrics.database.error}</p>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* Endpoints Tab */}
        {tab === 'endpoints' && metrics && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Calls</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Avg Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Errors</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Error Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {metrics.endpoints.map((endpoint, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4 text-sm text-slate-900">{endpoint.endpoint}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{endpoint.count}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{endpoint.avgDuration.toFixed(0)}ms</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{endpoint.errors}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          parseFloat(endpoint.errorRate) < 5 ? 'bg-green-100 text-green-800' :
                          parseFloat(endpoint.errorRate) < 15 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {endpoint.errorRate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/documents')}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
