import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Room = {
  id: number
  room_no: string
  name: string
  cleanliness: string
}

type BreakdownHistory = {
  id: number
  room_id: number
  issue_date: string
  summary: string
  status: string
}

type RepairHistory = {
  id: number
  room_id: number
  repair_date: string
  summary: string
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomNo: string }>
}) {
  const { roomNo } = await params

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_no', roomNo)
    .single()

  if (roomError || !room) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold mb-4">룸 정보를 찾을 수 없음</h1>
          <p className="text-slate-500 mb-4">{roomNo} 에 해당하는 룸이 없음</p>
          <Link href="/" className="rounded-xl border px-4 py-2 inline-block">
            메인으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  const { data: breakdownHistories } = await supabase
    .from('breakdown_history')
    .select('*')
    .eq('room_id', room.id)
    .order('issue_date', { ascending: false })

  const { data: repairHistories } = await supabase
    .from('repair_history')
    .select('*')
    .eq('room_id', room.id)
    .order('repair_date', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">룸 상세페이지</h1>
            <p className="mt-1 text-sm text-slate-500">
              QR 스캔 또는 직접 URL 진입용 페이지
            </p>
          </div>

          <Link href="/" className="rounded-xl border px-4 py-2">
            메인으로
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-500">Room No.</p>
              <p className="mt-2 text-lg font-semibold">{room.room_no}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-2 text-lg font-semibold">{room.name}</p>
            </div>

            <div className="rounded-xl border p-4">
              <p className="text-sm text-slate-500">청정도</p>
              <p className="mt-2 text-lg font-semibold">{room.cleanliness}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">고장 이력</h2>

          {!breakdownHistories || breakdownHistories.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-slate-500">
              등록된 고장 이력이 없음
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left">
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">간략한 고장 정보</th>
                    <th className="px-4 py-3">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownHistories.map((item: BreakdownHistory) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{item.issue_date}</td>
                      <td className="px-4 py-3">{item.summary}</td>
                      <td className="px-4 py-3">{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">수리 이력</h2>

          {!repairHistories || repairHistories.length === 0 ? (
            <div className="rounded-xl border p-4 text-sm text-slate-500">
              등록된 수리 이력이 없음
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b bg-slate-100 text-left">
                    <th className="px-4 py-3">날짜</th>
                    <th className="px-4 py-3">간략한 조치 정보</th>
                  </tr>
                </thead>
                <tbody>
                  {repairHistories.map((item: RepairHistory) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{item.repair_date}</td>
                      <td className="px-4 py-3">{item.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">QR 연결 주소 예시</h2>
          <div className="rounded-xl border bg-slate-50 p-4 text-sm">
            /room/{room.room_no}
          </div>
        </div>
      </div>
    </main>
  )
}