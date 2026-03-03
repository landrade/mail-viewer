import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '../../store/appStore'
import { ipc } from '../../api/ipc'
import type { XlsxImportResult } from '../../types'

const NONE = -1

export function ImportModal() {
  const { importModalOpen, closeImportModal } = useAppStore()
  const queryClient = useQueryClient()

  const [rows, setRows] = useState<string[][]>([])
  const [hasHeader, setHasHeader] = useState(true)
  const [colUsername, setColUsername] = useState<number>(NONE)
  const [colPassword, setColPassword] = useState<number>(NONE)
  const [colDisplayName, setColDisplayName] = useState<number>(NONE)
  const [colEmailAddress, setColEmailAddress] = useState<number>(NONE)
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState(993)
  const [imapSecure, setImapSecure] = useState(true)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<XlsxImportResult | null>(null)
  const [errorsExpanded, setErrorsExpanded] = useState(false)

  if (!importModalOpen) return null

  const columnCount = rows.length > 0 ? Math.max(...rows.map((r) => r.length)) : 0

  // Build dropdown options
  const columnOptions = Array.from({ length: columnCount }, (_, i) => {
    const label = hasHeader && rows.length > 0 ? (rows[0][i] ?? `Col ${i + 1}`) : colLetter(i)
    return { index: i, label }
  })

  const previewRows = hasHeader ? rows.slice(1, 11) : rows.slice(0, 10)
  const headerCells =
    columnCount > 0
      ? Array.from({ length: columnCount }, (_, i) =>
          hasHeader && rows.length > 0 ? (rows[0][i] ?? '') : colLetter(i)
        )
      : []

  const dataRowCount = hasHeader ? Math.max(0, rows.length - 1) : rows.length

  const canImport =
    rows.length > 0 &&
    colUsername !== NONE &&
    colPassword !== NONE &&
    imapHost.trim() !== '' &&
    imapPort > 0

  const handleChooseFile = async () => {
    setResult(null)
    const data = await ipc.import.openXlsxFile()
    if (data.rows.length > 0) {
      setRows(data.rows)
      setColUsername(NONE)
      setColPassword(NONE)
      setColDisplayName(NONE)
      setColEmailAddress(NONE)
    }
  }

  const handleImport = async () => {
    if (!canImport) return
    setImporting(true)
    setResult(null)
    try {
      const res = await ipc.import.importFromXlsx({
        rows,
        hasHeader,
        columns: {
          username: colUsername,
          password: colPassword,
          displayName: colDisplayName === NONE ? undefined : colDisplayName,
          emailAddress: colEmailAddress === NONE ? undefined : colEmailAddress
        },
        imapSettings: { imapHost, imapPort, imapSecure }
      })
      setResult(res)
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    if (result && result.imported > 0) {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    }
    setRows([])
    setResult(null)
    setErrorsExpanded(false)
    setColUsername(NONE)
    setColPassword(NONE)
    setColDisplayName(NONE)
    setColEmailAddress(NONE)
    setImapHost('')
    setImapPort(993)
    setImapSecure(true)
    closeImportModal()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="w-full max-w-2xl rounded-xl bg-zinc-900 shadow-2xl border border-zinc-700 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700 shrink-0">
          <h2 className="text-lg font-semibold text-white">Import Accounts from Spreadsheet</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Section A: File + Preview */}
          <section className="space-y-3">
            <div className="flex items-center gap-4">
              <button
                onClick={handleChooseFile}
                className="px-4 py-2 text-sm rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
              >
                Choose XLSX / XLS / CSV file
              </button>
              {rows.length > 0 && (
                <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                  {dataRowCount} row{dataRowCount !== 1 ? 's' : ''} to import
                </span>
              )}
              {rows.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasHeader}
                    onChange={(e) => setHasHeader(e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-500"
                  />
                  Has header row
                </label>
              )}
            </div>

            {rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-zinc-700">
                <table className="text-xs text-zinc-300 w-max">
                  <thead className="bg-zinc-800">
                    <tr>
                      {headerCells.map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2 text-left font-medium text-zinc-400 border-r border-zinc-700 last:border-r-0 whitespace-nowrap"
                        >
                          {h || colLetter(i)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-t border-zinc-700 odd:bg-zinc-800/30">
                        {Array.from({ length: columnCount }, (_, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-1.5 border-r border-zinc-700 last:border-r-0 max-w-[160px] truncate"
                          >
                            {row[ci] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section B: Column mapping */}
          {rows.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-300">Column Mapping</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={colUsername}
                    onChange={(e) => setColUsername(Number(e.target.value))}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={NONE}>— select column —</option>
                    {columnOptions.map((o) => (
                      <option key={o.index} value={o.index}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={colPassword}
                    onChange={(e) => setColPassword(Number(e.target.value))}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={NONE}>— select column —</option>
                    {columnOptions.map((o) => (
                      <option key={o.index} value={o.index}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Display Name</label>
                  <select
                    value={colDisplayName}
                    onChange={(e) => setColDisplayName(Number(e.target.value))}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={NONE}>— use username —</option>
                    {columnOptions.map((o) => (
                      <option key={o.index} value={o.index}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Email Address</label>
                  <select
                    value={colEmailAddress}
                    onChange={(e) => setColEmailAddress(Number(e.target.value))}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={NONE}>— use username —</option>
                    {columnOptions.map((o) => (
                      <option key={o.index} value={o.index}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Section C: Shared IMAP settings */}
          <section className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-300">Shared IMAP Settings</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  IMAP Host <span className="text-red-400">*</span>
                </label>
                <input
                  value={imapHost}
                  onChange={(e) => setImapHost(e.target.value)}
                  placeholder="imap.example.com"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">IMAP Port</label>
                <input
                  type="number"
                  value={imapPort}
                  onChange={(e) => setImapPort(Number(e.target.value))}
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="importImapSecure"
                  checked={imapSecure}
                  onChange={(e) => setImapSecure(e.target.checked)}
                  className="w-4 h-4 rounded accent-blue-500"
                />
                <label htmlFor="importImapSecure" className="text-sm text-zinc-300">
                  Use SSL/TLS
                </label>
              </div>
            </div>
          </section>

          {/* Result */}
          {result && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 space-y-2">
              <p className="text-sm text-green-400 font-medium">
                ✓ {result.imported} account{result.imported !== 1 ? 's' : ''} imported
              </p>
              {result.errors.length > 0 && (
                <div>
                  <button
                    onClick={() => setErrorsExpanded((v) => !v)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                  >
                    {errorsExpanded ? 'Hide' : 'Show'} {result.errors.length} error
                    {result.errors.length !== 1 ? 's' : ''}
                  </button>
                  {errorsExpanded && (
                    <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {result.errors.map((e, i) => (
                        <li key={i} className="text-xs text-red-300">
                          Row {e.row}: {e.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-zinc-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm rounded-lg bg-zinc-700 text-zinc-200 hover:bg-zinc-600 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport || importing}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {importing && (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {importing ? 'Importing...' : canImport ? `Import ${dataRowCount} account${dataRowCount !== 1 ? 's' : ''}` : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function colLetter(index: number): string {
  let result = ''
  let n = index
  do {
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}
