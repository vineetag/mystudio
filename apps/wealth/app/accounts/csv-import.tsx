"use client"

import { useState, useTransition } from "react"
import { importHoldingsCsv, type CsvImportReport } from "@/modules/holdings/actions"

export function CsvImport() {
  const [report, setReport] = useState<CsvImportReport | null>(null)
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setError("")
    setReport(null)

    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : ""
      startTransition(async () => {
        const result = await importHoldingsCsv(text)
        if (!result.ok) {
          setError(result.error)
          return
        }
        setReport(result.data)
      })
    }
    reader.onerror = () => setError(`Couldn't read "${file.name}" — try again.`)
    reader.readAsText(file)
  }

  return (
    <section className="rounded-lg border border-rule p-4">
      <h2 className="text-lg font-semibold text-ink">CSV import</h2>
      <p className="mt-1 text-sm text-ink/70">
        Columns: <code>account, symbol, quantity, avg_cost</code>. Account must
        match an existing account name. Leave <code>avg_cost</code> empty for
        no cost basis. Existing (account, symbol) positions are replaced.
      </p>

      <label className="mt-3 inline-flex min-h-12 cursor-pointer items-center rounded-md border border-rule px-4 text-sm font-medium">
        {isPending ? "Importing…" : "Choose CSV file"}
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={isPending}
          className="hidden"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-3 text-sm">
          <p className="rounded-md border border-rule bg-ink/[0.04] p-3 text-ink/80">
            {report.imported} new, {report.updated} replaced,{" "}
            {report.rejects.length} rejected.
          </p>
          {report.rejects.length > 0 && (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[28rem]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink/60">
                    <th className="py-1 pr-3 font-medium">Line</th>
                    <th className="py-1 pr-3 font-medium">Row</th>
                    <th className="py-1 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rejects.map((reject) => (
                    <tr key={reject.line} className="border-t border-rule align-top">
                      <td className="py-1.5 pr-3 tabular-nums">{reject.line}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{reject.raw}</td>
                      <td className="py-1.5 text-red-800">{reject.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
