'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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
  created_by: string | null
  image_url: string | null
}

type RepairHistory = {
  id: number
  room_id: number
  repair_date: string
  summary: string
  image_url: string | null
}

export default function RoomDetailPage({
  params,
}: {
  params: Promise<{ roomNo: string }>
}) {
  const { roomNo } = use(params)

  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [loginMessage, setLoginMessage] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)

  const [room, setRoom] = useState<Room | null>(null)
  const [breakdownHistories, setBreakdownHistories] = useState<BreakdownHistory[]>([])
  const [repairHistories, setRepairHistories] = useState<RepairHistory[]>([])

  const [newIssueDate, setNewIssueDate] = useState('')
  const [newIssueSummary, setNewIssueSummary] = useState('')
  const [newIssueStatus, setNewIssueStatus] = useState('접수')
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberEmail(true)
    }

    checkSession()
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchRoomDetail()
    }
  }, [isLoggedIn, roomNo])

  const getDisplayId = (emailValue: string) => {
    return emailValue.split('@')[0]
  }

  const checkSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user?.email) {
      setIsLoggedIn(true)
      setCurrentUserEmail(session.user.email)
    } else {
      setIsLoggedIn(false)
    }

    setLoading(false)
  }

  const handleLogin = async () => {
    setLoginMessage('')

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoginMessage('로그인 실패: 이메일 또는 비밀번호를 확인해줘')
      return
    }

    if (rememberEmail) {
      localStorage.setItem('savedEmail', email)
    } else {
      localStorage.removeItem('savedEmail')
    }

    setIsLoggedIn(true)
    setCurrentUserEmail(data.user?.email || '')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentUserEmail('')
    setRoom(null)
    setBreakdownHistories([])
    setRepairHistories([])
    setPassword('')
  }

  const fetchRoomDetail = async () => {
    setLoading(true)

    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_no', roomNo)
      .single()

    if (roomError || !roomData) {
      setRoom(null)
      setLoading(false)
      return
    }

    setRoom(roomData)

    const { data: breakdownData, error: breakdownError } = await supabase
      .from('breakdown_history')
      .select('*')
      .eq('room_id', roomData.id)
      .order('issue_date', { ascending: false })

    if (breakdownError) {
      console.error('breakdown error:', breakdownError.message)
      setBreakdownHistories([])
    } else {
      setBreakdownHistories(breakdownData || [])
    }

    const { data: repairData, error: repairError } = await supabase
      .from('repair_history')
      .select('*')
      .eq('room_id', roomData.id)
      .order('repair_date', { ascending: false })

    if (repairError) {
      console.error('repair error:', repairError.message)
      setRepairHistories([])
    } else {
      setRepairHistories(repairData || [])
    }

    setLoading(false)
  }

  const handleCreateBreakdown = async () => {
    setFormMessage('')

    if (!room) {
      setFormMessage('룸 정보를 찾을 수 없음')
      return
    }

    if (!newIssueDate || !newIssueSummary) {
      setFormMessage('접수일자와 고장 내용을 입력해줘')
      return
    }

    const const createdBy = 'guest'
    // const createdBy = user?.email ? getDisplayId(user.email) : 'unknown'

    const { error } = await supabase.from('breakdown_history').insert({
      room_id: room.id,
      issue_date: newIssueDate,
      summary: newIssueSummary,
      status: newIssueStatus,
      created_by: createdBy,
    })

    if (error) {
      setFormMessage(`등록 실패: ${error.message}`)
      return
    }

    setFormMessage('고장 접수 등록 완료')
    setNewIssueDate('')
    setNewIssueSummary('')
    setNewIssueStatus('접수')

    await fetchRoomDetail()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          불러오는 중...
        </div>
      </main>
    )
  }

  // if (!isLoggedIn) {
  //   return (
  //     <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
  //       <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
  //         <h1 className="text-2xl font-bold mb-2">룸 상세 로그인</h1>
  //         <p className="text-sm text-slate-500 mb-6">
  //           로그인 후 {roomNo} 룸 상세페이지로 바로 이동
  //         </p>

  //         <div className="space-y-4">
  //           <input
  //             className="w-full rounded-xl border px-4 py-3"
  //             type="email"
  //             name="email"
  //             autoComplete="username"
  //             placeholder="이메일"
  //             value={email}
  //             onChange={(e) => setEmail(e.target.value)}
  //           />

  //           <input
  //             className="w-full rounded-xl border px-4 py-3"
  //             type="password"
  //             name="password"
  //             autoComplete="current-password"
  //             placeholder="비밀번호"
  //             value={password}
  //             onChange={(e) => setPassword(e.target.value)}
  //           />

  //           <label className="flex items-center gap-2 text-sm text-slate-600">
  //             <input
  //               type="checkbox"
  //               checked={rememberEmail}
  //               onChange={(e) => setRememberEmail(e.target.checked)}
  //             />
  //             아이디 저장
  //           </label>

  //           <button
  //             onClick={handleLogin}
  //             className="w-full rounded-xl bg-black px-4 py-3 text-white"
  //           >
  //             로그인
  //           </button>

  //           {loginMessage && (
  //             <p className="text-sm text-red-500">{loginMessage}</p>
  //           )}
  //         </div>
  //       </div>
  //     </main>
  //   )
  // }

  if (!room) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl rounded-2xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold mb-4">룸 정보를 찾을 수 없음</h1>
          <p className="text-slate-500 mb-4">{roomNo} 에 해당하는 룸이 없음</p>
          <Link href="/" className="rounded-xl border px-4 py-2 inline-block">
            메인으로 돌아가기
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">룸 상세페이지</h1>
            <p className="mt-1 text-sm text-slate-500">
              QR 스캔 후 진입하는 룸 전용 페이지
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="rounded-xl border px-4 py-2">
              메인으로
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl border px-4 py-2"
            >
              로그아웃
            </button>
          </div>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">고장 접수</h2>
            <p className="text-sm text-slate-500">
              접수자: {currentUserEmail ? getDisplayId(currentUserEmail) : '-'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-600">접수일자</label>
              <input
                className="w-full rounded-xl border px-3 py-3"
                type="date"
                value={newIssueDate}
                onChange={(e) => setNewIssueDate(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-600">상태</label>
              <select
                className="w-full rounded-xl border px-3 py-3"
                value={newIssueStatus}
                onChange={(e) => setNewIssueStatus(e.target.value)}
              >
                <option value="접수">접수</option>
                <option value="진행중">진행중</option>
                <option value="완료">완료</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm text-slate-600">간략한 고장 정보</label>
              <input
                className="w-full rounded-xl border px-3 py-3"
                type="text"
                placeholder="예: 도어 클로저 작동 불량"
                value={newIssueSummary}
                onChange={(e) => setNewIssueSummary(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleCreateBreakdown}
              className="rounded-xl bg-black px-5 py-3 text-white"
            >
              고장 접수 등록
            </button>

            {formMessage && (
              <p className="text-sm text-slate-600">{formMessage}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">고장 이력</h2>

          {breakdownHistories.length === 0 ? (
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
                    <th className="px-4 py-3">접수자</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownHistories.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="px-4 py-3">{item.issue_date}</td>
                      <td className="px-4 py-3">{item.summary}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">{item.created_by || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-semibold mb-4">수리 이력</h2>

          {repairHistories.length === 0 ? (
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
                  {repairHistories.map((item) => (
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
      </div>
    </main>
  )
}