'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewProductPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', slug: '', category: '' })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Failed to create product')
      return
    }

    router.push('/admin/products')
  }

  return (
    <main>
      <h1>Create Product</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Name<br />
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>
        </div>
        <div>
          <label>Slug<br />
            <input name="slug" value={form.slug} onChange={handleChange} required />
          </label>
        </div>
        <div>
          <label>Category<br />
            <input name="category" value={form.category} onChange={handleChange} required />
          </label>
        </div>
        {error && <p>{error}</p>}
        <button type="submit">Create</button>
      </form>
    </main>
  )
}
