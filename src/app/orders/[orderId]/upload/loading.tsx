import Container from '@/components/Container'

export default function Loading() {
  return (
    <Container>
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    </Container>
  )
}
