interface Column<T> {
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface AdminTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyFn: (row: T) => string
  empty?: string
}

export default function AdminTable<T>({ columns, rows, keyFn, empty = 'No data.' }: AdminTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">{empty}</p>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.header}
                className={['px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider', col.className].filter(Boolean).join(' ')}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={keyFn(row)} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.header} className={['px-4 py-3', col.className].filter(Boolean).join(' ')}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
